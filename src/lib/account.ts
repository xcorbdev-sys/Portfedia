import "server-only";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Page, Session, User } from "./models";
import { consumeToken, createToken } from "./tokens";
import { sendEmail } from "./email";
import { siteUrl } from "./site";
import { isReservedSlug, slugify } from "./slug";
import type { SessionUser } from "./types";

const HOUR = 3600_000;

/* ───────────── Email verification ───────────── */

export async function sendVerificationEmail(userId: string, email: string, name: string): Promise<void> {
  const token = await createToken("verify_email", { userId, ttlMs: 48 * HOUR, replaceExisting: true });
  await sendEmail({
    to: email,
    subject: "Confirm your email address",
    lines: [`Hi ${name.split(" ")[0]},`, "Please confirm your email address to finish setting up your Portfedia account. The link is valid for 48 hours."],
    button: { label: "Confirm email", url: `${siteUrl()}/verify-email?token=${token}` },
  });
}

export async function verifyEmail(raw: string): Promise<boolean> {
  const t = await consumeToken("verify_email", raw);
  if (!t?.userId) return false;
  await connectDB();
  await User.updateOne({ _id: t.userId, emailVerifiedAt: null }, { $set: { emailVerifiedAt: new Date() } });
  return true;
}

/* ───────────── Password reset ───────────── */

/** Always behaves the same whether or not the address exists (no account enumeration). */
export async function requestPasswordReset(email: string): Promise<void> {
  await connectDB();
  const user = await User.findOne({ email }, { name: 1, email: 1 }).lean<{ _id: unknown; name: string; email: string }>();
  if (!user) return;
  const token = await createToken("reset_password", { userId: String(user._id), ttlMs: HOUR, replaceExisting: true });
  await sendEmail({
    to: user.email,
    subject: "Reset your Portfedia password",
    lines: [
      `Hi ${user.name.split(" ")[0]},`,
      "Someone asked to reset the password for your Portfedia account. If it was you, use the button below. The link is valid for 1 hour.",
      "If you didn't ask for this, you can ignore this email; your password won't change.",
    ],
    button: { label: "Choose a new password", url: `${siteUrl()}/reset-password?token=${token}` },
  });
}

export async function resetPassword(raw: string, password: string): Promise<string | null> {
  const t = await consumeToken("reset_password", raw);
  if (!t?.userId) return null;
  await connectDB();
  // Receiving the link proves ownership of the address, so it also counts as verification
  await User.updateOne(
    { _id: t.userId },
    { $set: { passwordHash: await bcrypt.hash(password, 12) } },
  );
  await User.updateOne({ _id: t.userId, emailVerifiedAt: null }, { $set: { emailVerifiedAt: new Date() } });
  await Session.deleteMany({ userId: t.userId }); // sign out everywhere
  return t.userId;
}

/* ───────────── Account settings ───────────── */

export async function changePassword(user: SessionUser, current: string, next: string): Promise<string | null> {
  await connectDB();
  const doc = await User.findById(user.id);
  if (!doc) return "Account not found.";
  if (doc.passwordHash && !(await bcrypt.compare(current, doc.passwordHash))) return "Your current password is incorrect.";
  doc.passwordHash = await bcrypt.hash(next, 12);
  await doc.save();
  return null;
}

export async function requestEmailChange(user: SessionUser, newEmail: string): Promise<string | null> {
  await connectDB();
  if (newEmail === user.email) return "That is already your email address.";
  if (await User.exists({ email: newEmail })) return "Another account already uses this email address.";
  const token = await createToken("change_email", { userId: user.id, data: { email: newEmail }, ttlMs: 24 * HOUR, replaceExisting: true });
  await sendEmail({
    to: newEmail,
    subject: "Confirm your new email address",
    lines: [`Hi ${user.name.split(" ")[0]},`, `Confirm that you want to use ${newEmail} for your Portfedia account. The link is valid for 24 hours.`],
    button: { label: "Confirm new email", url: `${siteUrl()}/verify-email?change=1&token=${token}` },
  });
  await sendEmail({
    to: user.email,
    subject: "Your Portfedia email address is being changed",
    lines: [`A request was made to change your account email to ${newEmail}.`, "If this wasn't you, change your password right away."],
  });
  return null;
}

export async function confirmEmailChange(raw: string): Promise<boolean> {
  const t = await consumeToken("change_email", raw);
  const email = typeof t?.data.email === "string" ? t.data.email : null;
  if (!t?.userId || !email) return false;
  await connectDB();
  if (await User.exists({ email, _id: { $ne: t.userId } })) return false;
  await User.updateOne({ _id: t.userId }, { $set: { email, emailVerifiedAt: new Date() } });
  return true;
}

export async function setEmailPrefs(user: SessionUser, prefs: { profileUpdates: boolean }): Promise<void> {
  await connectDB();
  await User.updateOne({ _id: user.id }, { $set: { "emailPrefs.profileUpdates": prefs.profileUpdates } });
}

/** Changes the profile URL; the old address keeps redirecting to the new one. */
export async function changeProfileSlug(user: SessionUser, wanted: string): Promise<{ error?: string; slug?: string }> {
  const slug = slugify(wanted);
  if (!slug || slug.length < 3) return { error: "The address must be at least 3 characters (letters, numbers and dashes)." };
  if (isReservedSlug(slug)) return { error: "This address is reserved. Please choose another one." };
  await connectDB();
  const page = await Page.findOne({ type: "person", ownerId: new Types.ObjectId(user.id) });
  if (!page) return { error: "Create your profile first." };
  if (page.slug === slug) return { slug };
  const taken = await Page.exists({ $or: [{ slug }, { oldSlugs: slug }], _id: { $ne: page._id } });
  if (taken) return { error: "This address is already taken." };
  const old = page.slug;
  page.oldSlugs = [...new Set([...(page.oldSlugs ?? []).filter((s: string) => s !== slug), old])].slice(-10);
  page.slug = slug;
  await page.save();
  return { slug };
}

/** Looks up a page by one of its previous addresses (for redirects). */
export async function findRenamedPage(oldSlug: string): Promise<{ slug: string; type: "person" | "org" | "school" } | null> {
  await connectDB();
  return Page.findOne({ oldSlugs: oldSlug }, { slug: 1, type: 1 }).lean<{ slug: string; type: "person" | "org" | "school" }>();
}
