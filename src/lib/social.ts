import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Page, Thank } from "./models";
import { notify } from "./notifications";
import { extractWikiLinks } from "./wikitext";
import { PUBLIC_FILTER } from "./visibility";
import type { PageDoc, SessionUser } from "./types";

/* ───────────── Mentions (#76) ───────────── */

/** Notifies people whose profile is newly linked with [[Name]] in an edit. */
export async function notifyMentions(author: SessionUser, prevBody: string, nextBody: string, source: { title: string; href: string }) {
  const before = new Set(extractWikiLinks(prevBody).map((l) => l.slug));
  const added = extractWikiLinks(nextBody).map((l) => l.slug).filter((s) => !before.has(s));
  if (added.length === 0) return;
  await connectDB();
  const people = await Page.find({ slug: { $in: added.slice(0, 30) }, type: "person", ...PUBLIC_FILTER }, { ownerId: 1, slug: 1 }).lean<{ _id: unknown; ownerId?: unknown }[]>();
  for (const p of people) {
    if (!p.ownerId || String(p.ownerId) === author.id) continue;
    await notify([String(p.ownerId)], { type: "page_update", text: `${author.name} mentioned you on ${source.title}.`, href: source.href, pageId: String(p._id) });
  }
}

/* ───────────── Mutual connections (#77) ───────────── */

export interface Mutual {
  slug: string;
  title: string;
  kind: "work" | "study";
}

export function mutualConnections(viewer: PageDoc | null, page: PageDoc): Mutual[] {
  if (!viewer || viewer._id === page._id) return [];
  const mine = new Map<string, "work" | "study">();
  for (const e of viewer.experiences) mine.set(e.orgSlug, "work");
  for (const e of viewer.educations) if (!mine.has(e.schoolSlug)) mine.set(e.schoolSlug, "study");
  const out: Mutual[] = [];
  const seen = new Set<string>();
  for (const e of page.experiences) {
    if (mine.get(e.orgSlug) !== "work" || seen.has(e.orgSlug)) continue;
    out.push({ slug: e.orgSlug, title: e.orgTitle, kind: "work" });
    seen.add(e.orgSlug);
  }
  for (const e of page.educations) {
    if (!mine.has(e.schoolSlug) || seen.has(e.schoolSlug)) continue;
    out.push({ slug: e.schoolSlug, title: e.schoolTitle, kind: "study" });
    seen.add(e.schoolSlug);
  }
  return out;
}

/* ───────────── Thanks (#78) ───────────── */

export async function hasThanked(userId: string, pageId: string): Promise<boolean> {
  await connectDB();
  return Boolean(await Thank.exists({ userId, pageId }));
}

/** One "thank you" per person per profile; returns false if already given. */
export async function giveThanks(user: SessionUser, page: PageDoc): Promise<boolean> {
  if (page.ownerId === user.id) return false;
  await connectDB();
  try {
    await Thank.create({ pageId: new Types.ObjectId(page._id), userId: new Types.ObjectId(user.id) });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false;
    throw err;
  }
  await Page.updateOne({ _id: page._id }, { $inc: { thanksCount: 1 } });
  if (page.ownerId) await notify([page.ownerId], { type: "follower", text: `${user.name} thanked you. 💙`, href: `/${page.slug}`, pageId: page._id });
  return true;
}
