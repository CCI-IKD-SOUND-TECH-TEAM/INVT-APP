"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { IconCircleCheck as CheckCircleIcon, IconAlertTriangle as ExclamationTriangleIcon, IconEye as EyeIcon, IconEyeOff as EyeSlashIcon } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const DEMO_EMAIL = "staff@ccikorodu.org";
const DEMO_PASSWORD = "demo1234";
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const locked = lockUntil !== null && now < lockUntil;

  useEffect(() => {
    if (!locked) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [locked]);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !locked && !submitting,
    [email, password, locked, submitting]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    // An expired lock starts a fresh attempt cycle rather than re-locking on one miss.
    const lockExpired = lockUntil !== null && Date.now() >= lockUntil;
    const baseAttempts = lockExpired ? 0 : attempts;

    window.setTimeout(() => {
      const ok =
        email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;

      if (ok) {
        router.push("/dashboard");
        return;
      }

      setSubmitting(false);
      if (lockExpired) setLockUntil(null);
      const nextAttempts = baseAttempts + 1;
      setAttempts(nextAttempts);

      if (nextAttempts >= MAX_ATTEMPTS) {
        setLockUntil(Date.now() + LOCK_MS);
        setNow(Date.now());
      } else {
        setError("Invalid username or password.");
      }
      setPassword("");
    }, 500);
  }

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

          <h2 className="mb-1.5 font-display text-[clamp(1.75rem,3vw,2.25rem)]">Welcome back</h2>
          <p className="mb-8 text-muted-foreground">Log in to manage church assets.</p>

          {locked && (
            <div
              className="mb-4 flex items-start gap-2.5 rounded-md border border-brand-deep bg-brand-tint p-3.5 text-[0.8125rem] text-brand"
              role="alert"
            >
              <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                Too many failed attempts. Your account is locked. Try again in{" "}
                <strong>{formatRemaining(lockUntil! - now)}</strong>.
              </span>
            </div>
          )}

          {!locked && error && (
            <div
              className="mb-4 flex items-start gap-2.5 rounded-md border border-brand-deep bg-brand-tint p-3.5 text-[0.8125rem] text-brand"
              role="alert"
            >
              <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {forgotSent && (
            <div
              className="mb-4 flex items-start gap-2.5 rounded-md border border-status-good bg-status-good-bg p-3.5 text-[0.8125rem] text-status-good"
              role="status"
            >
              <CheckCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                If an account exists for that email, a password reset link has
                been sent.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <Label htmlFor="email">Username or Email</Label>
              <Input
                id="email"
                type="text"
                autoComplete="username"
                placeholder="you@ccikorodu.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={locked}
              />
            </div>

            <div className="mb-4">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={locked}
                  className="pr-11"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-sm p-1.5 text-ink-faint transition-colors duration-150 hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={locked}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="size-[17px]" />
                  ) : (
                    <EyeIcon className="size-[17px]" />
                  )}
                </button>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <span />
              <button
                type="button"
                className="text-[0.8125rem] font-bold text-brand transition-colors duration-150 hover:text-brand-deep hover:underline"
                onClick={() => setForgotSent(true)}
              >
                Forgot Password?
              </button>
            </div>

            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {submitting ? "Logging in…" : "Log In"}
            </Button>
          </form>

          <div className="mt-6 border-t border-line-subtle pt-6 text-center text-xs text-ink-faint">
            Demo access:{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 text-muted-foreground">
              {DEMO_EMAIL}
            </code>{" "}
            /{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 text-muted-foreground">
              {DEMO_PASSWORD}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
