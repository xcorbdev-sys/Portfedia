import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Page, SavedSearch, User } from "./models";
import { PUBLIC_FILTER } from "./visibility";
import { searchKey } from "./slug";
import { sendEmail } from "./email";
import { siteUrl } from "./site";
import { pageHref } from "./wikitext";
import { notify } from "./notifications";
import type { PageType } from "./types";

/** Saved searches (#37): members save a search of people, companies or SaaS and hear about new matches once a day. */
export type SearchKind = "all" | "people" | "companies" | "saas";
export const SEARCH_KINDS: Record<SearchKind, { label: string; href: string }> = {
  all: { label: "Everything", href: "/search" },
  people: { label: "People", href: "/people" },
  companies: { label: "Companies", href: "/companies" },
  saas: { label: "SaaS projects", href: "/saas" },
};
export const MAX_SAVED_SEARCHES = 10;

export interface SavedSearchView { id: string; kind: SearchKind; q: string; sector: string }

export const describeSearch = (s: { kind: SearchKind; q: string; sector: string }) =>
  [SEARCH_KINDS[s.kind].label, s.q && `"${s.q}"`, s.sector].filter(Boolean).join(" · ");

export const searchHref = (s: { kind: SearchKind; q: string; sector: string }) => {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.sector) p.set("sector", s.sector);
  return `${SEARCH_KINDS[s.kind].href}${p.size ? `?${p}` : ""}`;
};

export function cleanSearch(input: { kind?: unknown; q?: unknown; sector?: unknown }): { kind: SearchKind; q: string; sector: string } {
  const kind = (typeof input.kind === "string" && input.kind in SEARCH_KINDS ? input.kind : "all") as SearchKind;
  return { kind, q: String(input.q ?? "").trim().slice(0, 80), sector: String(input.sector ?? "").trim().slice(0, 80) };
}

export async function listSavedSearches(userId: string): Promise<SavedSearchView[]> {
  await connectDB();
  const rows = await SavedSearch.find({ userId: new Types.ObjectId(userId), deletedAt: null }).sort({ createdAt: -1 }).lean<{ _id: unknown; kind: SearchKind; q: string; sector: string }[]>();
  return rows.map((r) => ({ id: String(r._id), kind: r.kind, q: r.q, sector: r.sector }));
}

export async function addSavedSearch(userId: string, s: { kind: SearchKind; q: string; sector: string }): Promise<string | null> {
  if (!s.q && !s.sector && s.kind === "all") return "Type something to search for, or pick a filter, before saving the search.";
  await connectDB();
  const uid = new Types.ObjectId(userId);
  if (await SavedSearch.exists({ userId: uid, deletedAt: null, ...s })) return "You already saved this search.";
  if ((await SavedSearch.countDocuments({ userId: uid, deletedAt: null })) >= MAX_SAVED_SEARCHES) return `You can save up to ${MAX_SAVED_SEARCHES} searches. Delete one first.`;
  await SavedSearch.create({ userId: uid, ...s });
  return null;
}

export async function deleteSavedSearch(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) return;
  await connectDB();
  // #44: kept for a day so it can be undone
  await SavedSearch.updateOne({ _id: id, userId: new Types.ObjectId(userId) }, { $set: { deletedAt: new Date() } });
}

export async function restoreSavedSearch(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) return;
  await connectDB();
  await SavedSearch.updateOne({ _id: id, userId: new Types.ObjectId(userId) }, { $set: { deletedAt: null } });
}

function filterFor(s: { kind: SearchKind; q: string; sector: string }): Record<string, unknown> {
  const f: Record<string, unknown> = { ...PUBLIC_FILTER };
  if (s.kind === "people") f.type = "person";
  else if (s.kind === "companies") Object.assign(f, { type: { $in: ["org", "school"] }, category: { $ne: "saas" } });
  else if (s.kind === "saas") Object.assign(f, { type: "org", category: "saas" });
  const key = searchKey(s.q);
  if (key) f.titleKey = new RegExp(`(^|\\s)${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  if (s.sector) f.sectors = s.sector;
  return f;
}

/**
 * Once a day: new pages (published since the search was saved, not reported before) matching each saved search.
 * One in-site notification and, unless switched off, one email per search with news.
 */
export async function sendSearchAlerts(): Promise<number> {
  await connectDB();
  const due = await SavedSearch.find({ deletedAt: null, lastSentAt: { $lt: new Date(Date.now() - 20 * 3600_000) } })
    .limit(500)
    .lean<{ _id: unknown; userId: unknown; kind: SearchKind; q: string; sector: string; lastSentAt: Date; createdAt: Date; seen: string[] }[]>();
  let sent = 0;
  for (const s of due) {
    const fresh = await Page.find(
      { ...filterFor(s), createdAt: { $gte: s.createdAt }, updatedAt: { $gt: s.lastSentAt }, slug: { $nin: s.seen }, ownerId: { $ne: s.userId } },
      { slug: 1, title: 1, type: 1 },
    )
      .sort({ createdAt: -1 })
      .limit(15)
      .lean<{ slug: string; title: string; type: PageType }[]>();
    await SavedSearch.updateOne(
      { _id: s._id },
      { $set: { lastSentAt: new Date() }, ...(fresh.length ? { $push: { seen: { $each: fresh.map((p) => p.slug), $slice: -1000 } } } : {}) },
    );
    if (!fresh.length) continue;
    const user = await User.findById(s.userId, { email: 1, name: 1, bannedAt: 1, emailPrefs: 1 }).lean<{ email: string; name: string; bannedAt?: Date | null; emailPrefs?: { searchAlerts?: boolean } }>();
    if (!user || user.bannedAt) continue;
    const what = describeSearch(s);
    await notify([String(s.userId)], { type: "search", text: `${fresh.length} new result${fresh.length === 1 ? "" : "s"} for your saved search: ${what}`, href: searchHref(s) });
    if (user.emailPrefs?.searchAlerts !== false) {
      await sendEmail({
        to: user.email,
        subject: `${fresh.length} new on Portfedia: ${what}`,
        lines: [
          `Hi ${user.name.split(" ")[0]},`,
          `New pages matching your saved search (${what}):`,
          ...fresh.map((p) => `• ${p.title}: ${siteUrl()}${pageHref(p.type, p.slug)}`),
          "You get this email because you saved this search. You can delete saved searches or turn these emails off in your account.",
        ],
        button: { label: "Manage saved searches", url: `${siteUrl()}/account/searches` },
      });
    }
    sent++;
  }
  return sent;
}
