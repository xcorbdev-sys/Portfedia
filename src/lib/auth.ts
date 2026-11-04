import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { connectDB } from "./db";
import { LoginLog, Session, User } from "./models";
import type { SessionUser } from "./types";
import { adminEmailList, OWNER_EMAILS } from "./admins";

const COOKIE = "pf_session";
const SESSION_DAYS = 30;

/**
 * Cookies are marked Secure only when the request really came over HTTPS. Browsers refuse to
 * store Secure cookies sent over plain HTTP, which signed people out on every page of an
 * http:// deployment.
 */
export async function secureCookies(): Promise<boolean> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) return proto === "https";
  return (process.env.SITE_URL ?? "").startsWith("https://");
}

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string): Promise<void> {
  await connectDB();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  // Only a hash is stored: a leaked database cannot be used to hijack sessions
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  const userAgent = (h.get("user-agent") ?? "").slice(0, 300);
  // Shown on the account page: only the start of the address
  const ipPrefix = ip.includes(":") ? ip.split(":").slice(0, 3).join(":") + ":…" : ip.split(".").slice(0, 3).join(".") + (ip ? ".…" : "");
  await Session.create({ tokenHash: hash(token), userId, expiresAt, userAgent, ipPrefix });
  // Law No. 5651 requires hosting providers to keep traffic data; deleted automatically after one year
  await LoginLog.create({ userId, ip, userAgent }).catch(() => {});
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await secureCookies(),
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
    _id: unknown;
    userId: unknown;
    lastSeenAt?: Date;
  }>();
  if (!session) return null;
  // "Last active" for the sessions list, updated at most every 10 minutes
  if (!session.lastSeenAt || Date.now() - new Date(session.lastSeenAt).getTime() > 600_000) {
    void Session.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } }).catch(() => {});
  }
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
  // ADMIN_EMAILS only applies to verified addresses: nobody can become admin by signing up with an unclaimed email.
  // The owner's address (OWNER_EMAILS) is admin as soon as its account exists: the owner has already
  // registered it, a second account with the same email can't be created, and changing an account's
  // email to it needs a link sent to that inbox.
  const role = OWNER_EMAILS.includes(user.email) || (emailVerified && adminEmails().has(user.email)) ? "admin" : user.role;
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
  return new Set(adminEmailList());
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


/* ───────────── Sessions list (#14) and rotation (#20) ───────────── */

export async function currentSessionHash(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? hash(token) : null;
}

export async function listSessions(userId: string) {
  await connectDB();
  const current = await currentSessionHash();
  const rows = await Session.find({ userId, expiresAt: { $gt: new Date() } }, { tokenHash: 1, userAgent: 1, ipPrefix: 1, createdAt: 1, lastSeenAt: 1 })
    .sort({ lastSeenAt: -1 })
    .limit(50)
    .lean<{ _id: unknown; tokenHash: string; userAgent?: string; ipPrefix?: string; createdAt?: Date; lastSeenAt?: Date }[]>();
  return rows.map((r) => ({
    id: String(r._id),
    current: r.tokenHash === current,
    device: describeUserAgent(r.userAgent ?? ""),
    ipPrefix: r.ipPrefix ?? "",
    createdAt: r.createdAt ?? null,
    lastSeenAt: r.lastSeenAt ?? null,
  }));
}

export function describeUserAgent(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  return ua ? `${browser} on ${os}` : "Unknown device";
}

export async function revokeSession(userId: string, sessionId: string) {
  await connectDB();
  await Session.deleteOne({ _id: sessionId, userId });
}

export async function revokeOtherSessions(userId: string) {
  await connectDB();
  const current = await currentSessionHash();
  await Session.deleteMany({ userId, ...(current ? { tokenHash: { $ne: current } } : {}) });
}

/**
 * Issues a fresh session token after a security-relevant change (password, email, new privileges),
 * so a token captured earlier stops working.
 */
export async function rotateSession(userId: string) {
  await connectDB();
  const current = await currentSessionHash();
  if (current) await Session.deleteOne({ tokenHash: current });
  await createSession(userId);
}
