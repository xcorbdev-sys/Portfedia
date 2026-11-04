import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Page, User } from "./models";
import type { SessionUser } from "./types";

/**
 * How many pages a member may create with the create form. People make their own profile; company pages and
 * SaaS projects are limited so the encyclopedia doesn't fill up with promotion. Admins can upgrade an account.
 * Pages made automatically (for example when someone adds a workplace to their profile) don't count.
 */
export const PAGE_LIMITS = {
  company: { standard: 1, upgraded: 5 },
  saas: { standard: 1, upgraded: 10 },
} as const;

export type QuotaKind = keyof typeof PAGE_LIMITS;

export interface Quota {
  upgraded: boolean;
  unlimited: boolean;
  company: { used: number; limit: number };
  saas: { used: number; limit: number };
}

export async function pageQuota(user: Pick<SessionUser, "id" | "role">): Promise<Quota> {
  await connectDB();
  const oid = new Types.ObjectId(user.id);
  const [u, company, saas] = await Promise.all([
    User.findById(oid, { upgradedAt: 1 }).lean<{ upgradedAt?: Date | null }>(),
    Page.countDocuments({ createdById: oid, category: { $ne: "saas" } }),
    Page.countDocuments({ createdById: oid, category: "saas" }),
  ]);
  const upgraded = Boolean(u?.upgradedAt);
  const tier = upgraded ? "upgraded" : "standard";
  const unlimited = user.role === "admin" || user.role === "moderator";
  return {
    upgraded,
    unlimited,
    company: { used: company, limit: unlimited ? Infinity : PAGE_LIMITS.company[tier] },
    saas: { used: saas, limit: unlimited ? Infinity : PAGE_LIMITS.saas[tier] },
  };
}

export const quotaKind = (category: string): QuotaKind => (category === "saas" ? "saas" : "company");

export function quotaMessage(kind: QuotaKind, q: Quota): string {
  const what = kind === "saas" ? "SaaS projects" : "company pages";
  return q.upgraded
    ? `You have reached the limit of ${q[kind].limit} ${what}. Contact us if you need more.`
    : `You can create ${q[kind].limit} ${kind === "saas" ? "SaaS project" : "company page"} with your account and you have already used it. Contact us to upgrade your account for more ${what}.`;
}

/** Admins upgrade or downgrade an account. */
export async function setUpgraded(userId: string, upgraded: boolean): Promise<void> {
  if (!Types.ObjectId.isValid(userId)) return;
  await connectDB();
  await User.updateOne({ _id: userId }, { $set: { upgradedAt: upgraded ? new Date() : null } });
}
