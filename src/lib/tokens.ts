import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { connectDB } from "./db";
import { Token } from "./models";

export type TokenType = "verify_email" | "reset_password" | "change_email" | "oauth_signup" | "oauth_state";

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Creates a single-use token. Only its hash is stored; the raw value goes into a link or cookie. */
export async function createToken(
  type: TokenType,
  opts: { userId?: string | null; data?: Record<string, unknown>; ttlMs: number; replaceExisting?: boolean },
): Promise<string> {
  await connectDB();
  if (opts.replaceExisting && opts.userId) await Token.deleteMany({ userId: opts.userId, type });
  const raw = randomBytes(32).toString("base64url");
  await Token.create({
    tokenHash: hash(raw),
    type,
    userId: opts.userId ?? null,
    data: opts.data ?? {},
    expiresAt: new Date(Date.now() + opts.ttlMs),
  });
  return raw;
}

export interface TokenDoc {
  userId: string | null;
  data: Record<string, unknown>;
}

async function find(type: TokenType, raw: string, remove: boolean): Promise<TokenDoc | null> {
  if (typeof raw !== "string" || raw.length < 20 || raw.length > 100) return null;
  await connectDB();
  const filter = { tokenHash: hash(raw), type, expiresAt: { $gt: new Date() } };
  const doc = remove ? await Token.findOneAndDelete(filter).lean<any>() : await Token.findOne(filter).lean<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  return doc ? { userId: doc.userId ? String(doc.userId) : null, data: doc.data ?? {} } : null;
}

/** Returns the token and deletes it (atomic, so it can be used only once). */
export const consumeToken = (type: TokenType, raw: string) => find(type, raw, true);
/** Checks a token without using it (e.g. to show the reset-password form). */
export const peekToken = (type: TokenType, raw: string) => find(type, raw, false);
