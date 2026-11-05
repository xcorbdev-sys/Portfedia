import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Follow, Page, Win } from "./models";
import { notify, notifyFollowers } from "./notifications";
import { guardContent } from "./guard";
import { externalLinks } from "./content-rules";
import { rateLimit } from "./rate-limit";
import { getPersonPageOf } from "./pages";
import { isPublic, PUBLIC_FILTER } from "./visibility";
import type { SessionUser } from "./types";

/** Wins wall (#93): members share their milestones and others congratulate them. */
export const WIN_KINDS = {
  new_job: { label: "Started a new job", emoji: "💼" },
  promotion: { label: "Got promoted", emoji: "🚀" },
  graduation: { label: "Graduated", emoji: "🎓" },
  certification: { label: "Earned a certification", emoji: "📜" },
  award: { label: "Won an award", emoji: "🏆" },
  launch: { label: "Launched something", emoji: "✨" },
  funding: { label: "Raised funding", emoji: "💰" },
  anniversary: { label: "Work anniversary", emoji: "🎉" },
  other: { label: "Something else", emoji: "⭐" },
} as const;
export type WinKind = keyof typeof WIN_KINDS;

const oid = (id: string) => new Types.ObjectId(id);

export interface WinRow {
  id: string;
  kind: WinKind;
  text: string;
  createdAt: Date;
  congrats: number;
  congratulated: boolean;
  mine: boolean;
  person: { slug: string; title: string; subtitle: string; image: string };
}

export async function postWin(user: SessionUser, kind: string, text: string): Promise<string | null> {
  if (!(kind in WIN_KINDS)) return "Pick what happened.";
  if (!user.emailVerified) return "Please confirm your email address first.";
  const page = await getPersonPageOf(user.id);
  if (!page || !isPublic(page) || page.status === "draft" || page.visibility === "members") return "You need a published, public profile to share on the wins wall.";
  const clean = text.trim().slice(0, 600);
  if (clean.length < 3) return "Add a few words.";
  if (!(await rateLimit(`win:${user.id}`, 3, 86400_000))) return "You can share 3 wins a day.";
  const guard = await guardContent(user, { texts: [clean], newLinks: externalLinks(clean, ""), page });
  if (guard) return guard;
  await connectDB();
  await Win.create({ userId: oid(user.id), pageId: oid(page._id), kind, text: clean });
  await notifyFollowers(page._id, user.id, { type: "win", text: `${WIN_KINDS[kind as WinKind].emoji} ${page.title}: ${WIN_KINDS[kind as WinKind].label.toLowerCase()}. Say congrats!`, href: "/wins?tab=following" });
  return null;
}

export async function deleteWin(user: SessionUser, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) return;
  await connectDB();
  const mod = user.role === "admin" || user.role === "moderator";
  await Win.updateOne({ _id: id, ...(mod ? {} : { userId: oid(user.id) }) }, { $set: { deletedAt: new Date() } });
}

/** Congratulate (or take it back). The member is told once per win. */
export async function toggleCongrats(user: SessionUser, id: string): Promise<string | null> {
  if (!Types.ObjectId.isValid(id)) return "Not found.";
  await connectDB();
  const win = await Win.findOne({ _id: id, deletedAt: null }, { userId: 1, kind: 1, congrats: 1 }).lean<{ userId: unknown; kind: WinKind; congrats: unknown[] }>();
  if (!win) return "Not found.";
  if (String(win.userId) === user.id) return "That's your own win. 🙂";
  const already = win.congrats.some((c) => String(c) === user.id);
  if (already) {
    await Win.updateOne({ _id: id }, { $pull: { congrats: oid(user.id) }, $inc: { congratsCount: -1 } });
    return null;
  }
  if (!(await rateLimit(`congrats:${user.id}`, 200, 86400_000))) return "Please slow down.";
  await Win.updateOne({ _id: id }, { $addToSet: { congrats: oid(user.id) }, $inc: { congratsCount: 1 } });
  await notify([String(win.userId)], { type: "congrats", text: `${user.name} congratulated you on: ${WIN_KINDS[win.kind]?.label.toLowerCase() ?? "your win"} 🎉`, href: "/wins?tab=mine" });
  return null;
}

/** The wall: everyone, people the viewer follows, or one profile's wins. */
export async function listWins(opts: { viewerId?: string; tab?: "all" | "following" | "mine"; pageId?: string; limit?: number; before?: Date }): Promise<WinRow[]> {
  await connectDB();
  const filter: Record<string, unknown> = { deletedAt: null };
  if (opts.before) filter.createdAt = { $lt: opts.before };
  if (opts.pageId) filter.pageId = oid(opts.pageId);
  else if (opts.tab === "mine" && opts.viewerId) filter.userId = oid(opts.viewerId);
  else if (opts.tab === "following" && opts.viewerId) {
    const follows = await Follow.find({ userId: oid(opts.viewerId) }, { pageId: 1 }).limit(5000).lean<{ pageId: unknown }[]>();
    filter.pageId = { $in: follows.map((f) => f.pageId) };
  }
  const rows = await Win.find(filter).sort({ createdAt: -1 }).limit(opts.limit ?? 30).lean<
    { _id: unknown; userId: unknown; pageId: unknown; kind: WinKind; text: string; createdAt: Date; congrats: unknown[]; congratsCount: number }[]
  >();
  // Only wins of profiles that are public right now
  const pages = await Page.find({ _id: { $in: rows.map((r) => r.pageId) }, type: "person", ...PUBLIC_FILTER }, { slug: 1, title: 1, image: 1, infobox: 1, experiences: 1 }).lean<
    { _id: unknown; slug: string; title: string; image?: { url?: string; thumbUrl?: string }; infobox?: { occupation?: string }; experiences?: { current?: boolean; orgTitle?: string; role?: string }[] }[]
  >();
  const byId = new Map(pages.map((p) => [String(p._id), p]));
  return rows
    .filter((r) => byId.has(String(r.pageId)))
    .map((r) => {
      const p = byId.get(String(r.pageId))!;
      const cur = p.experiences?.find((e) => e.current);
      return {
        id: String(r._id),
        kind: r.kind in WIN_KINDS ? r.kind : "other",
        text: r.text,
        createdAt: r.createdAt,
        congrats: r.congratsCount,
        congratulated: Boolean(opts.viewerId && r.congrats.some((c) => String(c) === opts.viewerId)),
        mine: String(r.userId) === opts.viewerId,
        person: { slug: p.slug, title: p.title, subtitle: cur ? [cur.role, cur.orgTitle].filter(Boolean).join(" at ") : (p.infobox?.occupation ?? ""), image: p.image?.thumbUrl || p.image?.url || "" },
      };
    });
}
