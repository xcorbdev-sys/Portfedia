import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { connectDB } from "./db";
import { Session, User } from "./models";
import type { SessionUser } from "./types";

const COOKIE = "pf_session";
const SESSION_DAYS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string): Promise<void> {
  await connectDB();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  // Only a hash is stored: a leaked database cannot be used to hijack sessions
  await Session.create({ tokenHash: hash(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await connectDB();
    await Session.deleteOne({ tokenHash: hash(token) });
  }
  jar.delete(COOKIE);
}

/** Current user (queried once per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  await connectDB();
  const session = await Session.findOne({ tokenHash: hash(token), expiresAt: { $gt: new Date() } }).lean<{
    userId: unknown;
  }>();
  if (!session) return null;
  const user = await User.findById(session.userId).lean<{
    _id: unknown;
    name: string;
    email: string;
    role: SessionUser["role"];
    emailVerifiedAt: Date | null;
    passwordHash?: string;
    emailPrefs?: { profileUpdates?: boolean };
    bannedAt?: Date | null;
  }>();
  if (!user || user.bannedAt) return null; // suspended accounts are signed out everywhere
  const emailVerified = Boolean(user.emailVerifiedAt);
  // ADMIN_EMAILS only applies to verified addresses: nobody can become admin by signing up with an unclaimed email
  const role = emailVerified && adminEmails().has(user.email) ? "admin" : user.role;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role,
    emailVerified,
    hasPassword: Boolean(user.passwordHash),
    emailPrefs: { profileUpdates: user.emailPrefs?.profileUpdates !== false },
  };
});

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isModerator(user: SessionUser | null): boolean {
  return user?.role === "admin" || user?.role === "moderator";
}

export async function requireModerator(next = "/admin"): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!isModerator(user)) redirect("/");
  return user;
}

export async function requireUser(next = "/"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Prevents open redirects: only same-site paths are allowed. */
export function safeNext(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
