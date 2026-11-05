import "server-only";
import { connectDB } from "./db";
import { Conversation, LoginLog, Page, Report, User } from "./models";

/**
 * #88: accounts worth a moderator's look. Nothing happens to them automatically; each row says why it's listed.
 * Signals: several accounts from the same network address, throw-away email domains, open reports against their
 * profile, being blocked by people they messaged, a profile with the same name as an existing one, and many
 * sign-ups from one address in a day.
 */
const DISPOSABLE = new Set(
  "mailinator.com guerrillamail.com guerrillamail.net sharklasers.com 10minutemail.com 10minutemail.net tempmail.com temp-mail.org tempmail.net throwawaymail.com yopmail.com yopmail.net trashmail.com trashmail.de getnada.com nada.email dispostable.com maildrop.cc mintemail.com mohmal.com fakeinbox.com emailondeck.com tempinbox.com spamgourmet.com mailnesia.com mytemp.email tempr.email discard.email moakt.com burnermail.io inboxkitten.com mail.tm tmail.ws 33mail.com spambox.us mailcatch.com fakemail.net emailfake.com tempmailo.com minuteinbox.com"
    .split(" "),
);

export const isDisposableEmail = (email: string) => DISPOSABLE.has(email.split("@")[1]?.toLowerCase() ?? "");

export interface SuspiciousRow { id: string; name: string; email: string; createdAt: Date; bannedAt: Date | null; profileSlug: string; reasons: string[]; score: number }

export async function suspiciousAccounts(): Promise<SuspiciousRow[]> {
  await connectDB();
  const since = new Date(Date.now() - 30 * 86400_000);
  const reasons = new Map<string, { r: string[]; score: number }>();
  const add = (id: string, r: string, score: number) => {
    const e = reasons.get(id) ?? { r: [], score: 0 };
    e.r.push(r);
    e.score += score;
    reasons.set(id, e);
  };

  // Several accounts signing in from the same address
  const shared = await LoginLog.aggregate([
    { $match: { at: { $gt: since }, ip: { $nin: ["", null] } } },
    { $group: { _id: "$ip", users: { $addToSet: "$userId" } } },
    { $match: { "users.2": { $exists: true } } },
    { $limit: 200 },
  ]);
  for (const g of shared) for (const u of g.users) add(String(u), `${g.users.length} accounts used the same network address (${String(g._id).replace(/\.\d+$/, ".x")})`, 2);

  // Throw-away email addresses
  const recent = await User.find({ createdAt: { $gt: new Date(Date.now() - 90 * 86400_000) } }, { email: 1 }).limit(20000).lean<{ _id: unknown; email: string }[]>();
  for (const u of recent) if (isDisposableEmail(u.email)) add(String(u._id), "Throw-away email address", 2);

  // Open reports against their profile
  const reported = await Report.aggregate([{ $match: { status: "open", pageId: { $ne: null } } }, { $group: { _id: "$pageId", n: { $sum: 1 } } }, { $match: { n: { $gte: 2 } } }]);
  if (reported.length) {
    const owners = await Page.find({ _id: { $in: reported.map((r) => r._id) }, ownerId: { $ne: null } }, { ownerId: 1 }).lean<{ _id: unknown; ownerId: unknown }[]>();
    const n = new Map(reported.map((r) => [String(r._id), r.n as number]));
    for (const p of owners) add(String(p.ownerId), `${n.get(String(p._id))} open reports about their profile`, 3);
  }

  // Blocked by people they messaged
  const blocked = await Conversation.aggregate([{ $match: { blockedBy: { $ne: null }, updatedAt: { $gt: since } } }, { $group: { _id: "$starterId", n: { $sum: 1 } } }, { $match: { n: { $gte: 2 } } }]);
  for (const b of blocked) add(String(b._id), `Blocked by ${b.n} people they messaged`, 3);

  // Profiles with the same name as another profile (possible impersonation)
  const dupes = await Page.aggregate([
    { $match: { type: "person", createdAt: { $gt: since } } },
    { $lookup: { from: "pages", let: { k: "$titleKey", id: "$_id" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$titleKey", "$$k"] }, { $ne: ["$_id", "$$id"] }, { $eq: ["$type", "person"] }] } } }, { $limit: 1 }], as: "same" } },
    { $match: { "same.0": { $exists: true } } },
    { $project: { ownerId: 1, title: 1 } },
    { $limit: 200 },
  ]);
  for (const d of dupes) if (d.ownerId) add(String(d.ownerId), `New profile with the same name as an existing one (${d.title})`, 1);

  const ids = [...reasons.keys()].filter((id) => /^[a-f0-9]{24}$/.test(id));
  if (!ids.length) return [];
  const [users, pages] = await Promise.all([
    User.find({ _id: { $in: ids }, role: "user" }, { name: 1, email: 1, createdAt: 1, bannedAt: 1 }).lean<{ _id: unknown; name: string; email: string; createdAt: Date; bannedAt?: Date | null }[]>(),
    Page.find({ type: "person", ownerId: { $in: ids } }, { slug: 1, ownerId: 1 }).lean<{ slug: string; ownerId: unknown }[]>(),
  ]);
  const slug = new Map(pages.map((p) => [String(p.ownerId), p.slug]));
  return users
    .map((u) => {
      const e = reasons.get(String(u._id))!;
      // Accounts younger than a week weigh a little more
      const fresh = Date.now() - new Date(u.createdAt).getTime() < 7 * 86400_000;
      return { id: String(u._id), name: u.name, email: u.email, createdAt: u.createdAt, bannedAt: u.bannedAt ?? null, profileSlug: slug.get(String(u._id)) ?? "", reasons: [...new Set(e.r)], score: e.score + (fresh ? 1 : 0) };
    })
    .sort((a, b) => Number(Boolean(a.bannedAt)) - Number(Boolean(b.bannedAt)) || b.score - a.score)
    .slice(0, 200);
}
