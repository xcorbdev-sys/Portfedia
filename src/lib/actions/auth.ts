"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { User } from "../models";
import { createSession, destroySession, getCurrentUser, safeNext } from "../auth";
import { deleteAccount } from "../pages";
import {
  changePassword, changeProfileSlug, requestEmailChange, requestPasswordReset, resetPassword, sendVerificationEmail, setEmailPrefs,
} from "../account";
import { createOAuthUser, type OAuthProfile } from "../oauth";
import { consumeToken, peekToken } from "../tokens";
import { isOldEnough, MIN_AGE } from "../age";
import { looksLikeBot } from "../bot";
import { bool, email as cleanEmail, str } from "../validate";
import { rateLimit } from "../rate-limit";

export type FormState = { error?: string; ok?: string } | undefined;

// A valid bcrypt hash that matches nothing: unknown emails take as long as known ones
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5Q7ZUYzCZq4hbX9JhB6Wz1QZr0q0e1W";
const AGE_ERROR = `You must be at least ${MIN_AGE} years old to use Portfedia.`;

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

function passwordError(pw: string): string | null {
  return pw.length < 8 || pw.length > 200 ? "Password must be at least 8 characters." : null;
}

/* ───────────── Sign up / log in ───────────── */

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  if (looksLikeBot(fd)) return { error: "Something went wrong. Please wait a moment and try again." };
  const name = str(fd.get("name"), 120);
  const email = cleanEmail(fd.get("email"));
  const password = String(fd.get("password") ?? "");
  if (name.length < 2) return { error: "Please enter your full name." };
  if (!email) return { error: "Please enter a valid email address." };
  const pwErr = passwordError(password);
  if (pwErr) return { error: pwErr };
  if (!isOldEnough(fd.get("birthYear"))) return { error: AGE_ERROR };
  if (fd.get("consent") !== "on") return { error: "Please accept the Terms and Privacy Policy to continue." };
  if (!rateLimit(`register:${await clientIp()}`, 10, 60 * 60_000)) {
    return { error: "Too many attempts. Please try again later." };
  }

  await connectDB();
  if (await User.exists({ email })) return { error: "An account with this email already exists. Try logging in." };
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), ageConfirmedAt: new Date() });
  await sendVerificationEmail(String(user._id), email, name);
  await createSession(String(user._id));
  redirect("/create?welcome=1");
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = cleanEmail(fd.get("email"));
  const password = String(fd.get("password") ?? "");
  const next = safeNext(fd.get("next"));
  if (!email || !password) return { error: "Email and password are required." };
  if (!rateLimit(`login:${email}`, 8, 15 * 60_000) || !rateLimit(`login-ip:${await clientIp()}`, 30, 15 * 60_000)) {
    return { error: "Too many failed attempts. Please try again in 15 minutes." };
  }
  await connectDB();
  const user = await User.findOne({ email });
  const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (user && !user.passwordHash && (user.googleId || user.linkedinId)) {
    return { error: `This account signs in with ${user.googleId ? "Google" : "LinkedIn"}. Use that button, or reset your password to add one.` };
  }
  if (!user || !ok) return { error: "Incorrect email or password." };
  if (user.bannedAt) return { error: "This account has been suspended." };
  await createSession(String(user._id));
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

/** Finishes a Google/LinkedIn sign-up: the account is created only after the age screen. */
export async function completeOAuthSignupAction(_: FormState, fd: FormData): Promise<FormState> {
  const jar = await cookies();
  const raw = jar.get("pf_oauth_signup")?.value ?? "";
  const pending = await peekToken("oauth_signup", raw);
  if (!pending) return { error: "Your sign-in session expired. Please start again." };
  const name = str(fd.get("name"), 120);
  if (name.length < 2) return { error: "Please enter your full name." };
  if (!isOldEnough(fd.get("birthYear"))) {
    await consumeToken("oauth_signup", raw);
    jar.delete("pf_oauth_signup");
    return { error: AGE_ERROR };
  }
  if (fd.get("consent") !== "on") return { error: "Please accept the Terms and Privacy Policy to continue." };

  const profile = pending.data as unknown as OAuthProfile;
  await connectDB();
  if (await User.exists({ email: profile.email })) {
    return { error: "An account with this email already exists. Log in with your password first." };
  }
  await consumeToken("oauth_signup", raw);
  jar.delete("pf_oauth_signup");
  const userId = await createOAuthUser(profile, name);
  if (!profile.emailVerified) await sendVerificationEmail(userId, profile.email, name);
  await createSession(userId);
  redirect("/create?welcome=1");
}

/* ───────────── Email verification & password reset ───────────── */

export async function resendVerificationAction(): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.emailVerified) return { ok: "Your email is already confirmed." };
  if (!rateLimit(`verify:${user.id}`, 3, 60 * 60_000)) return { error: "Please wait a while before requesting another email." };
  await sendVerificationEmail(user.id, user.email, user.name);
  return { ok: `We sent a new confirmation link to ${user.email}.` };
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  if (looksLikeBot(fd)) return { error: "Something went wrong. Please wait a moment and try again." };
  const email = cleanEmail(fd.get("email"));
  if (!email) return { error: "Please enter a valid email address." };
  if (rateLimit(`forgot:${email}`, 3, 60 * 60_000) && rateLimit(`forgot-ip:${await clientIp()}`, 10, 60 * 60_000)) {
    await requestPasswordReset(email);
  }
  // Same answer whether or not the account exists
  return { ok: "If an account exists for this address, we've sent a link to reset the password. Check your inbox." };
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get("password") ?? "");
  const pwErr = passwordError(password);
  if (pwErr) return { error: pwErr };
  if (password !== String(fd.get("confirm") ?? "")) return { error: "The passwords don't match." };
  const userId = await resetPassword(String(fd.get("token") ?? ""), password);
  if (!userId) return { error: "This link is invalid or has expired. Please request a new one." };
  await createSession(userId);
  redirect("/account?reset=1");
}

/* ───────────── Account settings ───────────── */

async function me() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return user;
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  const next = String(fd.get("password") ?? "");
  const pwErr = passwordError(next);
  if (pwErr) return { error: pwErr };
  if (next !== String(fd.get("confirm") ?? "")) return { error: "The new passwords don't match." };
  if (!rateLimit(`chpw:${user.id}`, 5, 15 * 60_000)) return { error: "Too many attempts. Please try again later." };
  const err = await changePassword(user, String(fd.get("current") ?? ""), next);
  return err ? { error: err } : { ok: user.hasPassword ? "Your password was changed." : "Password added. You can now also log in with your email." };
}

export async function changeEmailAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  const newEmail = cleanEmail(fd.get("email"));
  if (!newEmail) return { error: "Please enter a valid email address." };
  if (!rateLimit(`chemail:${user.id}`, 3, 60 * 60_000)) return { error: "Too many attempts. Please try again later." };
  const err = await requestEmailChange(user, newEmail);
  return err ? { error: err } : { ok: `We sent a confirmation link to ${newEmail}. Your email changes when you click it.` };
}

export async function changeSlugAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  const res = await changeProfileSlug(user, str(fd.get("slug"), 80));
  if (res.error) return { error: res.error };
  revalidatePath(`/${res.slug}`);
  return { ok: `Your profile now lives at /${res.slug}. The old address redirects automatically.` };
}

export async function emailPrefsAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  await setEmailPrefs(user, { profileUpdates: bool(fd.get("profileUpdates")) });
  return { ok: "Notification settings saved." };
}

export async function deleteAccountAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  await connectDB();
  const doc = await User.findById(user.id);
  if (!doc) redirect("/");
  if (doc.passwordHash) {
    if (!(await bcrypt.compare(String(fd.get("password") ?? ""), doc.passwordHash))) return { error: "Incorrect password." };
  } else if (str(fd.get("confirmEmail"), 200).toLowerCase() !== doc.email) {
    return { error: "Type your email address to confirm." };
  }
  await deleteAccount(user.id);
  await destroySession();
  redirect("/?deleted=1");
}
