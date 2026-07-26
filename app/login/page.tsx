"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconCircleCheck as CheckCircleIcon,
  IconAlertTriangle as ExclamationTriangleIcon,
  IconArrowLeft as ArrowLeftIcon,
  IconEye as EyeIcon,
  IconEyeOff as EyeSlashIcon,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import {
  requestSignIn,
  verifyCode,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/actions/auth";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

type Method = "password" | "otp";
type AuthMode = "signin" | "signup";

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.jpg"
      alt="CCI Ikorodu"
      width={96}
      height={96}
      className={cn("rounded-full size-12", className)}
    />
  );
}

/** Errors handed back by /auth/confirm when a magic link fails. */
const LINK_ERRORS: Record<string, string> = {
  invalid_link: "That sign-in link was incomplete. Request a new code below.",
  expired_link: "That sign-in link has expired or was already used.",
};

export default function LoginPage() {
  return (
    // useSearchParams needs a Suspense boundary, otherwise the whole route
    // opts into client-side rendering.
    <Suspense fallback={null}>
      <LoginView />
    </Suspense>
  );
}

function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [method, setMethod] = useState<Method>("password");
  const [authMode, setAuthMode] = useState<AuthMode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");

  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [linkErrorDismissed, setLinkErrorDismissed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  const locked = lockUntil !== null && now < lockUntil;
  const resendWaitMs = resendAt !== null ? resendAt - now : 0;
  const canResend = resendWaitMs <= 0;

  // A failed magic link arrives as ?error= from /auth/confirm. Derived during
  // render rather than copied into state by an effect; it clears as soon as the
  // user acts.
  const linkErrorKey = searchParams.get("error");
  const linkError =
    !linkErrorDismissed && linkErrorKey ? LINK_ERRORS[linkErrorKey] : undefined;
  const shownError = error ?? linkError ?? null;

  // One ticker drives both the lockout countdown and the resend cooldown.
  useEffect(() => {
    if (!locked && canResend) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [locked, canResend]);

  function clearMessages() {
    setError(null);
    setNotice(null);
    setLinkErrorDismissed(true);
  }

  function goToDashboard() {
    // refresh() so the proxy and server layouts observe the new session cookie
    // before the dashboard renders.
    router.replace("/dashboard");
    router.refresh();
  }

  function switchMethod(next: Method) {
    if (next === method) return;
    setMethod(next);
    clearMessages();
    setStep("email");
    setCode("");
    setPassword("");
  }

  // --- Password ------------------------------------------------------------
  const canSubmitPassword = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !pending,
    [email, password, pending]
  );

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitPassword) return;
    clearMessages();

    startTransition(async () => {
      if (authMode === "signin") {
        const result = await signInWithPassword(email, password);
        if (result.ok) return goToDashboard();
        setError(result.error ?? "Couldn't sign in.");
        return;
      }

      const result = await signUpWithPassword(email, password);
      if (!result.ok) {
        setError(result.error ?? "Couldn't create the account.");
        return;
      }
      if (result.needsConfirmation) {
        setNotice(
          `Account created. Check ${email.trim()} for a confirmation link before signing in.`
        );
        setAuthMode("signin");
        setPassword("");
        return;
      }
      goToDashboard();
    });
  }

  // --- OTP -----------------------------------------------------------------
  const canSubmitEmail = useMemo(
    () => email.trim().length > 0 && !pending,
    [email, pending]
  );

  function sendCode(target: string, isResend: boolean) {
    clearMessages();
    startTransition(async () => {
      const result = await requestSignIn(target);
      if (!result.ok) {
        setError(result.error ?? "Couldn't send the code.");
        return;
      }
      setStep("code");
      setCode("");
      setResendAt(Date.now() + RESEND_COOLDOWN_MS);
      setNow(Date.now());
      setNotice(
        isResend
          ? "New code sent. The previous one no longer works."
          : `We sent a 6-digit code to ${target.trim()}.`
      );
    });
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitEmail) return;
    sendCode(email, false);
  }

  function submitCode(value: string) {
    if (locked || pending) return;
    clearMessages();

    startTransition(async () => {
      const result = await verifyCode(email, value);
      if (result.ok) return goToDashboard();

      // A 6-digit code is brute-forceable, so keep the attempt lockout here.
      const lockExpired = lockUntil !== null && Date.now() >= lockUntil;
      const nextAttempts = (lockExpired ? 0 : attempts) + 1;
      if (lockExpired) setLockUntil(null);
      setAttempts(nextAttempts);
      setCode("");

      if (nextAttempts >= MAX_ATTEMPTS) {
        setLockUntil(Date.now() + LOCK_MS);
        setNow(Date.now());
      } else {
        setError(result.error ?? "That code isn't valid.");
      }
    });
  }

  function backToEmail() {
    setStep("email");
    setCode("");
    clearMessages();
  }

  // --- Copy ----------------------------------------------------------------
  const heading =
    method === "otp" && step === "code"
      ? "Check your email"
      : method === "password" && authMode === "signup"
        ? "Create your account"
        : "Welcome back";

  const subtitle =
    method === "otp"
      ? step === "code"
        ? "Enter the 6-digit code, or tap the link in the email."
        : "Enter your email and we'll send you a sign-in code."
      : authMode === "signup"
        ? "Sign up with an email and password."
        : "Sign in with your email and password.";

  return (
    <div className="grid min-h-screen bg-background md:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col overflow-hidden border-r border-line-subtle p-12 md:flex">
        <Image
          src="/login-bg.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 55vw, 0px"
          className="object-cover"
        />
        {/* Scrim: even base tint + left-anchored gradient so the text column
            stays legible while the right of the photo keeps its detail */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/60 to-black/25" />

        <div className="relative flex items-center gap-2.5 text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.55)]">
          <BrandMark />
          <span className="font-display text-[1.1rem] tracking-wide">Ikorodu Inventory</span>
        </div>

        <div className="relative flex flex-1 flex-col justify-center max-w-[30rem] text-white [text-shadow:0_1px_4px_rgb(0_0_0/0.6)]">
          <h1 className="mb-4 font-display text-[clamp(2.25rem,4vw,3.5rem)] leading-[1.02]">
            Every mic, light,
            <br />
            and cable  <em className="text-white not-italic">accounted for.</em>
          </h1>
          <p className="max-w-lg text-base leading-relaxed font-medium text-white">
            One shared system for sound, light, and projection assets — track
            status, log defects, and keep a full repair history without the
            spreadsheet guesswork.
          </p>
        </div>
      </aside>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <BrandMark />
            <span className="font-display text-[1.1rem] tracking-wide">Ikorodu Inventory</span>
          </div>

          <h2 className="mb-1.5 font-display text-[clamp(1.75rem,3vw,2.25rem)]">
            {heading}
          </h2>
          <p className="mb-6 text-muted-foreground">{subtitle}</p>

          {/* Method toggle — hidden on the OTP code screen, where you're
              mid-flow and switching would lose the pending code. */}
          {!(method === "otp" && step === "code") && (
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-md border border-border bg-surface-sunken p-1">
              {(["password", "otp"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMethod(m)}
                  className={cn(
                    "rounded-sm px-3 py-1.5 text-[0.8125rem] font-bold transition-colors duration-150",
                    method === m
                      ? "bg-surface-raised text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m === "password" ? "Password" : "Email code"}
                </button>
              ))}
            </div>
          )}

          {locked && (
            <div
              className="mb-4 flex items-start gap-2.5 rounded-md border border-brand-deep bg-brand-tint p-3.5 text-[0.8125rem] text-brand"
              role="alert"
            >
              <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                Too many incorrect codes. Try again in{" "}
                <strong>{formatRemaining(lockUntil! - now)}</strong>.
              </span>
            </div>
          )}

          {!locked && shownError && (
            <div
              className="mb-4 flex items-start gap-2.5 rounded-md border border-brand-deep bg-brand-tint p-3.5 text-[0.8125rem] text-brand"
              role="alert"
            >
              <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{shownError}</span>
            </div>
          )}

          {!shownError && notice && (
            <div
              className="mb-4 flex items-start gap-2.5 rounded-md border border-status-good bg-status-good-bg p-3.5 text-[0.8125rem] text-status-good"
              role="status"
            >
              <CheckCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {method === "password" ? (
            <form onSubmit={handlePasswordSubmit} noValidate>
              <div className="mb-4">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@ccikorodu.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                />
              </div>

              <div className="mb-6">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      authMode === "signup" ? "new-password" : "current-password"
                    }
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={pending}
                    className="pr-11"
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-sm p-1.5 text-ink-faint transition-colors duration-150 hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={pending}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="size-[17px]" />
                    ) : (
                      <EyeIcon className="size-[17px]" />
                    )}
                  </button>
                </div>
                {authMode === "signup" && (
                  <p className="field-hint">
                    6+ characters, with an uppercase letter, a lowercase letter,
                    and a number.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmitPassword}
              >
                {pending
                  ? authMode === "signup"
                    ? "Creating account…"
                    : "Signing in…"
                  : authMode === "signup"
                    ? "Create Account"
                    : "Sign In"}
              </Button>

              <div className="mt-6 text-center text-[0.8125rem] text-muted-foreground">
                {authMode === "signin" ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      className="font-bold text-brand transition-colors duration-150 hover:text-brand-deep hover:underline"
                      onClick={() => {
                        setAuthMode("signup");
                        clearMessages();
                      }}
                      disabled={pending}
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="font-bold text-brand transition-colors duration-150 hover:text-brand-deep hover:underline"
                      onClick={() => {
                        setAuthMode("signin");
                        clearMessages();
                      }}
                      disabled={pending}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </form>
          ) : step === "email" ? (
            <form onSubmit={handleEmailSubmit} noValidate>
              <div className="mb-6">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@ccikorodu.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                />
              </div>

              <Button type="submit" className="w-full" disabled={!canSubmitEmail}>
                {pending ? "Sending code…" : "Send Code"}
              </Button>
            </form>
          ) : (
            <div>
              <div className="mb-6">
                <Label htmlFor="code">6-digit code</Label>
                <InputOTP
                  id="code"
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  onComplete={submitCode}
                  disabled={locked || pending}
                  autoFocus
                  containerClassName="w-full"
                >
                  <InputOTPGroup className="w-full">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <p className="field-hint">
                  {pending ? "Verifying…" : "The code expires in 10 minutes."}
                </p>
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={code.length !== 6 || locked || pending}
                onClick={() => submitCode(code)}
              >
                {pending ? "Verifying…" : "Sign In"}
              </Button>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  onClick={backToEmail}
                  disabled={pending}
                >
                  <ArrowLeftIcon className="size-3.5" />
                  Use a different email
                </button>

                <button
                  type="button"
                  className="text-[0.8125rem] font-bold text-brand transition-colors duration-150 hover:text-brand-deep hover:underline disabled:text-ink-faint disabled:no-underline disabled:hover:no-underline"
                  onClick={() => sendCode(email, true)}
                  disabled={!canResend || pending}
                >
                  {canResend
                    ? "Resend code"
                    : `Resend in ${formatRemaining(resendWaitMs)}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
