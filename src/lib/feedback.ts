import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Page, Revision, Suggestion, Testimonial } from "./models";
import { notify } from "./notifications";
import { extractWikiLinks } from "./wikitext";
import type { PageDoc, SessionUser } from "./types";

/* ───────────── Suggested edits (#32) ───────────── */

export async function createSuggestion(user: SessionUser, page: PageDoc, message: string, proposedBody: string | null): Promise<void> {
  await connectDB();
  await Suggestion.create({
    pageId: page._id,
    authorId: user.id,
    authorName: user.name,
    message,
    proposedBody: proposedBody !== null && proposedBody !== page.body ? proposedBody : null,
    baseBody: page.body,
  });
  if (page.ownerId) await notify([page.ownerId], { type: "feedback", text: `${user.name} suggested an edit to your profile.`, href: "/inbox", pageId: page._id });
}

export interface SuggestionRow {
  id: string;
  authorName: string;
  authorId: string;
  message: string;
  proposedBody: string | null;
  baseBody: string;
  status: string;
  createdAt: Date;
}

export async function listSuggestions(pageId: string, status: "pending" | "accepted" | "rejected" = "pending"): Promise<SuggestionRow[]> {
  await connectDB();
  const rows = await Suggestion.find({ pageId, status }).sort({ createdAt: -1 }).limit(50).lean<any[]>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  return rows.map((r) => ({ id: String(r._id), authorName: r.authorName, authorId: String(r.authorId), message: r.message, proposedBody: r.proposedBody, baseBody: r.baseBody, status: r.status, createdAt: r.createdAt }));
}

export async function decideSuggestion(owner: SessionUser, id: string, accept: boolean): Promise<string | null> {
  if (!Types.ObjectId.isValid(id)) return "Not found.";
  await connectDB();
  const sug = await Suggestion.findById(id);
  if (!sug || sug.status !== "pending") return "This suggestion was already handled.";
  const page = await Page.findById(sug.pageId);
  if (!page || String(page.ownerId) !== owner.id) return "Only the profile owner can do that.";
  sug.status = accept ? "accepted" : "rejected";
  await sug.save();
  if (accept && sug.proposedBody !== null) {
    const prevSize = page.body?.length ?? 0;
    page.body = sug.proposedBody;
    page.outLinks = extractWikiLinks(sug.proposedBody);
    page.revisionCount = (page.revisionCount ?? 0) + 1;
    await page.save();
    const snap = page.toObject();
    delete snap._id;
    await Revision.create({
      pageId: page._id,
      authorId: sug.authorId,
      authorName: sug.authorName,
      editSummary: `Suggested edit accepted by ${owner.name}: ${sug.message}`.slice(0, 300),
      snapshot: snap,
      size: sug.proposedBody.length,
      delta: sug.proposedBody.length - prevSize,
    });
  }
  await notify([String(sug.authorId)], {
    type: "feedback",
    text: accept ? `${page.title} accepted your suggested edit. Thank you!` : `${page.title} didn't accept your suggested edit.`,
    href: `/${page.slug}`,
    pageId: String(page._id),
  });
  return null;
}

/* ───────────── Recommendations / testimonials (#33) ───────────── */

export async function upsertTestimonial(user: SessionUser, page: PageDoc, relationship: string, text: string): Promise<void> {
  await connectDB();
  await Testimonial.updateOne(
    { pageId: page._id, authorId: user.id },
    { $set: { authorName: user.name, relationship, text, status: "pending" } },
    { upsert: true },
  );
  if (page.ownerId) await notify([page.ownerId], { type: "feedback", text: `${user.name} wrote a recommendation for you.`, href: "/inbox", pageId: page._id });
}

export interface TestimonialRow {
  id: string;
  authorName: string;
  authorSlug: string | null;
  authorImage: { key: string; url: string } | null;
  relationship: string;
  text: string;
  status: string;
  createdAt: Date;
}

export async function listTestimonials(pageId: string, statuses: string[]): Promise<TestimonialRow[]> {
  await connectDB();
  const rows = await Testimonial.find({ pageId, status: { $in: statuses } }).sort({ createdAt: -1 }).limit(50).lean<any[]>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  // Link authors to their public profiles
  const authors = await Page.find({ type: "person", ownerId: { $in: rows.map((r) => r.authorId) }, status: "published" }, { slug: 1, ownerId: 1, image: 1 }).lean<any[]>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const byOwner = new Map(authors.map((a) => [String(a.ownerId), a]));
  return rows.map((r) => {
    const a = byOwner.get(String(r.authorId));
    return {
      id: String(r._id),
      authorName: r.authorName,
      authorSlug: a?.slug ?? null,
      authorImage: a?.image?.url ? { key: a.image.key, url: a.image.url, thumbUrl: a.image.thumbUrl } : null,
      relationship: r.relationship,
      text: r.text,
      status: r.status,
      createdAt: r.createdAt,
    };
  });
}

export async function decideTestimonial(owner: SessionUser, id: string, action: "publish" | "hide" | "delete"): Promise<string | null> {
  if (!Types.ObjectId.isValid(id)) return "Not found.";
  await connectDB();
  const t = await Testimonial.findById(id);
  if (!t) return "Not found.";
  const page = await Page.findById(t.pageId, { ownerId: 1, slug: 1, title: 1 });
  if (!page || String(page.ownerId) !== owner.id) return "Only the profile owner can do that.";
  if (action === "delete") await t.deleteOne();
  else {
    t.status = action === "publish" ? "published" : "hidden";
    await t.save();
    if (action === "publish") {
      await notify([String(t.authorId)], { type: "feedback", text: `${page.title} published your recommendation.`, href: `/${page.slug}#recommendations`, pageId: String(page._id) });
    }
  }
  return null;
}

export async function inboxCountForPage(pageId: string): Promise<number> {
  await connectDB();
  const [a, b] = await Promise.all([Suggestion.countDocuments({ pageId, status: "pending" }), Testimonial.countDocuments({ pageId, status: "pending" })]);
  return a + b;
}

export async function inboxCount(ownerUserId: string): Promise<number> {
  await connectDB();
  const page = await Page.findOne({ type: "person", ownerId: new Types.ObjectId(ownerUserId) }, { _id: 1 }).lean<{ _id: unknown }>();
  if (!page) return 0;
  const [a, b] = await Promise.all([Suggestion.countDocuments({ pageId: page._id, status: "pending" }), Testimonial.countDocuments({ pageId: page._id, status: "pending" })]);
  return a + b;
}
