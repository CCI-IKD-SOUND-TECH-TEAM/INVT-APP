"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { siteUrl } from "@/lib/site-url";

/**
 * Deliberately a single shape rather than a discriminated union: this project
 * compiles with `strict: false`, so `strictNullChecks` is off and TypeScript
 * won't narrow `{ok: true} | {ok: false; error: string}` in an `else` branch.
 * `error` is optional and only meaningful when `ok` is false.
 */
export type AuthResult = { ok: boolean; error?: string };

/**
 * Step 1 of sign-in: email -> code + link.
 *
 * OPEN SIGNUP. Anyone may sign in: an unknown email creates an account on first
 * request (Supabase creates the auth user; the on_auth_user_created trigger
 * lands a profile). This deliberately reverses the original closed-system design
 * — there is no allowlist. Requires "Allow new users to sign up" enabled on the
 * Supabase project (and enable_signup = true in supabase/config.toml locally).
 *
 * The only bar is an explicit deactivation: a profile with is_active = false is
 * refused, so a specific person can still be blocked without disabling signup
 * for everyone. Unknown emails have no profile yet, so they sail past that check
 * and get created.
 */
export async function requestSignIn(emailInput: string): Promise<AuthResult> {
  const email = emailInput.trim().toLowerCase();
  if (!email) return { ok: false, error: "Enter your email address." };

  const supabase = createClient(await cookies());

  // Only lookup is the deactivation gate. `profiles` is readable only by
  // authenticated users under RLS, so this uses the admin client. A missing
  // profile is NOT an error here — it's the first-time-signup case.
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[auth] admin client unavailable", err);
    return { ok: false, error: "Sign-in isn't configured yet. Contact support." };
  }

  const { data: profile, error: lookupError } = await admin
    .from("profiles")
    .select("is_active")
    .ilike("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("[auth] profile lookup failed", lookupError);
    return { ok: false, error: "Something went wrong. Try again." };
  }

  // Existing-but-deactivated is the one refusal. No profile => new signup, allowed.
  if (profile && !profile.is_active) {
    return {
      ok: false,
      error: "This account has been deactivated. Contact your team lead.",
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Open signup: create the account if this email is new. The Supabase
      // project must also have signups enabled, or this still 422s server-side.
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
    },
  });

  if (error) {
    console.error("[auth] signInWithOtp failed", error);
    // Rate limiting is the common case and is worth naming precisely, since
    // "try again" on a 60s cooldown is misleading advice.
    if (error.status === 429) {
      return { ok: false, error: "Too many requests. Wait a minute and retry." };
    }
    return { ok: false, error: "Couldn't send the code. Try again." };
  }

  return { ok: true };
}

/** Step 2: exchange the six-digit code for a session. */
export async function verifyCode(
  emailInput: string,
  token: string
): Promise<AuthResult> {
  const email = emailInput.trim().toLowerCase();
  const code = token.trim();

  if (code.length !== 6) return { ok: false, error: "Enter the 6-digit code." };

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (error || !data.user) {
    return { ok: false, error: "That code isn't valid or has expired." };
  }

  // Best-effort; a failed stamp must not block sign-in.
  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  return { ok: true };
}

/** Minimum password length. Matches Supabase's default GoTrue policy. */
const MIN_PASSWORD = 6;

async function stampLogin(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<void> {
  // Best-effort; a failed stamp must not block sign-in.
  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", userId);
}

/**
 * Email + password sign-in. The alternative to the OTP flow — needs no email
 * delivery to work, which is the point.
 */
export async function signInWithPassword(
  emailInput: string,
  password: string
): Promise<AuthResult> {
  const email = emailInput.trim().toLowerCase();
  if (!email || !password) {
    return { ok: false, error: "Enter your email and password." };
  }

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    // GoTrue returns the same "Invalid login credentials" for wrong password
    // and unknown email — don't disclose which.
    return { ok: false, error: "Incorrect email or password." };
  }

  await stampLogin(supabase, data.user.id);
  return { ok: true };
}

/**
 * Email + password sign-up. Open signup — anyone may create an account.
 *
 * With email confirmation disabled on the project, signUp returns a session
 * immediately and the user is logged in; the on_auth_user_created trigger lands
 * the profile. If confirmation is ON, no session comes back and the caller is
 * told to check their inbox instead.
 */
export async function signUpWithPassword(
  emailInput: string,
  password: string
): Promise<AuthResult & { needsConfirmation?: boolean }> {
  const email = emailInput.trim().toLowerCase();
  if (!email) return { ok: false, error: "Enter your email address." };
  if (password.length < MIN_PASSWORD) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD} characters.`,
    };
  }

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (/already|registered/i.test(error.message)) {
      return { ok: false, error: "An account with that email already exists." };
    }
    // The project's password-strength policy (configurable in the dashboard)
    // rejects weak passwords. GoTrue's raw message lists full alphabets, so
    // surface a clean version rather than that or a useless generic error.
    if (error.code === "weak_password" || /password/i.test(error.message)) {
      return {
        ok: false,
        error:
          "Password must be at least 6 characters and include an uppercase letter, a lowercase letter, and a number.",
      };
    }
    console.error("[auth] signUp failed", error);
    return { ok: false, error: "Couldn't create the account. Try again." };
  }

  // Confirmation ON: user exists but no session yet.
  if (!data.session) {
    return { ok: true, needsConfirmation: true };
  }

  if (data.user) await stampLogin(supabase, data.user.id);
  return { ok: true };
}

export async function signOut() {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Sends a first-time invite. Creates the auth.users row, which fires the
 * on_auth_user_created trigger and lands a profile.
 *
 * Used by Settings for staff who have never signed in (last_login_at is null).
 */
export async function inviteUser(
  emailInput: string,
  fullName: string
): Promise<AuthResult> {
  const email = emailInput.trim().toLowerCase();
  if (!email) return { ok: false, error: "Enter an email address." };

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[auth] admin client unavailable", err);
    return { ok: false, error: "Invites aren't configured yet." };
  }

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${siteUrl()}/auth/confirm`,
  });

  if (error) {
    console.error("[auth] invite failed", error);
    return { ok: false, error: "Couldn't send the invite. Try again." };
  }

  return { ok: true };
}
