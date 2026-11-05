import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Follow, IntroRequest, Page, User } from "./models";
import { notify } from "./notifications";
import { getCards, getPageBySlug, getPersonPageOf, type PageCard } from "./pages";
import { guardContent } from "./guard";
import { rateLimit } from "./rate-limit";
import { sendToProfile } from "./messages";
import { PUBLIC_FILTER } from "./visibility";
import type { PageDoc, SessionUser } from "./types";

/**
 * Introductions (#55): ask someone you and the other person are both connected with to introduce you.
 * Two members are connected when either follows the other's profile.
 */
const oid = (id: string) => new Types.ObjectId(id);

/** User ids connected with a member (who own the profiles they follow + who follow their profile). */
async function connectionsOf(userId: string, pageId: string | null): Promise<Set<string>> {
  const [following, followers] = await Promise.all([
    Follow.find({ userId: oid(userId) }, { pageId: 1 }).limit(5000).lean<{ pageId: unknown }[]>(),
    pageId ? Follow.find({ pageId: oid(pageId) }, { userId: 1 }).limit(5000).lean<{ userId: unknown }[]>() : Promise.resolve([]),
  ]);
  const owners = await Page.find({ _id: { $in: following.map((f) => f.pageId) }, type: "person", ownerId: { $ne: null } }, { ownerId: 1 }).lean<{ ownerId: unknown }[]>();
  return new Set([...owners.map((p) => String(p.ownerId)), ...followers.map((f) => String(f.userId))]);
}

/** People who could introduce `viewer` to the owner of `target`, as profile cards. */
export async function introConnectors(viewer: SessionUser, target: PageDoc): Promise<PageCard[]> {
  if (!target.ownerId || target.ownerId === viewer.id) return [];
  await connectDB();
  const mine = await getPersonPageOf(viewer.id);
  const [a, b] = await Promise.all([connectionsOf(viewer.id, mine?._id ?? null), connectionsOf(target.ownerId, target._id)]);
  const both = [...a].filter((id) => b.has(id) && id !== viewer.id && id !== target.ownerId).slice(0, 50);
  if (!both.length) return [];
  const pages = await Page.find({ type: "person", ownerId: { $in: both.map(oid) }, ...PUBLIC_FILTER }, { slug: 1 }).limit(6).lean<{ slug: string }[]>();
  return getCards(pages.map((p) => p.slug));
}

export async function requestIntro(user: SessionUser, targetSlug: string, viaSlug: string, note: string): Promise<string | null> {
  if (!user.emailVerified) return "Please confirm your email address first.";
  const [target, via] = await Promise.all([getPageBySlug(targetSlug, "person"), getPageBySlug(viaSlug, "person")]);
  if (!target || !via || !via.ownerId) return "Profile not found.";
  const connectors = await introConnectors(user, target);
  if (!connectors.some((c) => c.slug === via.slug)) return `${via.title} isn't connected with both of you.`;
  const clean = note.trim().slice(0, 1000);
  if (clean.length < 10) return "Tell them in a sentence or two why you'd like to meet.";
  const guard = await guardContent(user, { texts: [clean], newLinks: [], page: null });
  if (guard) return guard;
  await connectDB();
  if (await IntroRequest.exists({ requesterId: oid(user.id), targetPageId: oid(target._id), status: "pending" })) return "You already asked for an introduction to this person.";
  if (!(await rateLimit(`intro:${user.id}`, 5, 86400_000))) return "You can ask for 5 introductions a day.";
  const intro = await IntroRequest.create({ requesterId: oid(user.id), viaUserId: oid(via.ownerId), targetPageId: oid(target._id), note: clean });
  await notify([via.ownerId], { type: "intro", text: `${user.name} asked you for an introduction to ${target.title}.`, href: `/intros#${intro._id}` });
  return null;
}

export interface IntroRow { id: string; requester: string; requesterSlug: string; target: string; targetSlug: string; note: string; status: string; createdAt: Date }

export async function listIntros(userId: string): Promise<{ incoming: IntroRow[]; sent: IntroRow[] }> {
  await connectDB();
  const rows = await IntroRequest.find({ $or: [{ viaUserId: oid(userId) }, { requesterId: oid(userId) }] }).sort({ createdAt: -1 }).limit(100).lean<
    { _id: unknown; requesterId: unknown; viaUserId: unknown; targetPageId: unknown; note: string; status: string; createdAt: Date }[]
  >();
  const [targets, requesters, users] = await Promise.all([
    Page.find({ _id: { $in: rows.map((r) => r.targetPageId) } }, { slug: 1, title: 1 }).lean<{ _id: unknown; slug: string; title: string }[]>(),
    Page.find({ type: "person", ownerId: { $in: rows.map((r) => r.requesterId) } }, { slug: 1, title: 1, ownerId: 1 }).lean<{ ownerId: unknown; slug: string; title: string }[]>(),
    User.find({ _id: { $in: rows.map((r) => r.requesterId) } }, { name: 1 }).lean<{ _id: unknown; name: string }[]>(),
  ]);
  const t = new Map(targets.map((p) => [String(p._id), p]));
  const rq = new Map(requesters.map((p) => [String(p.ownerId), p]));
  const un = new Map(users.map((u) => [String(u._id), u.name]));
  const view = (r: (typeof rows)[number]): IntroRow => ({
    id: String(r._id),
    requester: rq.get(String(r.requesterId))?.title ?? un.get(String(r.requesterId)) ?? "Member",
    requesterSlug: rq.get(String(r.requesterId))?.slug ?? "",
    target: t.get(String(r.targetPageId))?.title ?? "—",
    targetSlug: t.get(String(r.targetPageId))?.slug ?? "",
    note: r.note,
    status: r.status,
    createdAt: r.createdAt,
  });
  return { incoming: rows.filter((r) => String(r.viaUserId) === userId).map(view), sent: rows.filter((r) => String(r.requesterId) === userId).map(view) };
}

/**
 * The connector forwards the request: a conversation request goes from the requester to the target, with the
 * connector's own words. The target still decides whether to answer, and blocks still apply.
 */
export async function answerIntro(connector: SessionUser, id: string, forward: boolean, words: string): Promise<string | null> {
  if (!Types.ObjectId.isValid(id)) return "Request not found.";
  await connectDB();
  const intro = await IntroRequest.findOne({ _id: id, viaUserId: oid(connector.id), status: "pending" });
  if (!intro) return "Request not found.";
  if (!forward) {
    intro.status = "declined";
    await intro.save();
    return null;
  }
  const target = await Page.findById(intro.targetPageId, { slug: 1 }).lean<{ slug: string }>();
  const page = target ? await getPageBySlug(target.slug, "person") : null;
  const requester = await User.findById(intro.requesterId).lean<{ _id: unknown; name: string; email: string; role: SessionUser["role"]; emailVerifiedAt?: Date | null }>();
  if (!page || !requester) return "This person is no longer on Portfedia.";
  const recipient = await User.findById(page.ownerId, { messagesFrom: 1, blockedUsers: 1 }).lean<{ messagesFrom?: string; blockedUsers?: unknown[] }>();
  if (!recipient || recipient.messagesFrom === "nobody" || (recipient.blockedUsers ?? []).some((b) => String(b) === String(intro.requesterId)))
    return `${page.title} doesn't receive messages, so the introduction can't be sent.`;
  const clean = words.trim().slice(0, 600);
  const asUser: SessionUser = { id: String(requester._id), name: requester.name, email: requester.email, role: requester.role, emailVerified: true, hasPassword: true, emailPrefs: { profileUpdates: true } };
  const text = `Introduced by ${connector.name}${clean ? `: "${clean}"` : "."}\n\n${intro.note}`;
  const res = await sendToProfile(asUser, page, text, { introId: id, viaIntro: true });
  if (res.error) return res.error;
  intro.status = "forwarded";
  await intro.save();
  await notify([String(intro.requesterId)], { type: "intro", text: `${connector.name} introduced you to ${page.title}.`, href: `/messages/${res.id}` });
  return null;
}
