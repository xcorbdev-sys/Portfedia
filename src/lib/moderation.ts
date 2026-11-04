import "server-only";
import { Types } from "mongoose";
import { diffLines } from "diff";
import { connectDB } from "./db";
import { Page, Report, Revision, Session, User } from "./models";
import { sendEmail } from "./email";
import { siteUrl } from "./site";
import { canEditOrg } from "./pages";
import type { PageDoc, SessionUser } from "./types";

/* ───────────── Revisions: compare & restore ───────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Snapshot = Record<string, any>;

export interface RevisionView {
  id: string;
  authorName: string;
  editSummary: string;
  createdAt: Date;
  /** Review / claim entries only record a status change and can't be restored */
  isContent: boolean;
  snapshot: Snapshot;
}

const isContent = (s: Snapshot | undefined) => Boolean(s && Object.prototype.hasOwnProperty.call(s, "body"));

export async function getRevisionPair(pageId: string, revId: string): Promise<{ rev: RevisionView; prev: RevisionView | null } | null> {
  if (!Types.ObjectId.isValid(revId)) return null;
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await Revision.findOne({ _id: revId, pageId }).lean<any>();
  if (!r) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = await Revision.findOne({ pageId, createdAt: { $lt: r.createdAt }, "snapshot.body": { $exists: true } }).sort({ createdAt: -1 }).lean<any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const view = (x: any): RevisionView => ({
    id: String(x._id),
    authorName: x.authorName,
    editSummary: x.editSummary,
    createdAt: x.createdAt,
    isContent: isContent(x.snapshot),
    snapshot: x.snapshot ?? {},
  });
  return { rev: view(r), prev: p ? view(p) : null };
}

const FIELD_LABELS: Record<string, string> = {
  title: "Name",
  summary: "Summary",
  tags: "Tags",
  infobox: "Key facts",
  experiences: "Career",
  educations: "Education",
  sources: "Sources",
  noindex: "Search engine visibility",
};

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) {
    return v
      .map((x) =>
        typeof x === "object" && x
          ? Object.entries(x)
              .filter(([k, val]) => val !== "" && val !== null && !["orgSlug", "schoolSlug", "verification", "verifiedVia"].includes(k))
              .map(([, val]) => String(val))
              .join(" · ")
          : String(x),
      )
      .join("\n");
  }
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, val]) => val !== "" && val !== null && val !== undefined)
      .map(([k, val]) => `${k}: ${String(val)}`)
      .join("\n");
  }
  return String(v);
}

export interface Change {
  label: string;
  before: string;
  after: string;
}

export function describeChanges(prev: Snapshot | null, next: Snapshot) {
  const changes: Change[] = [];
  for (const [field, label] of Object.entries(FIELD_LABELS)) {
    if (!(field in next)) continue;
    const a = show(prev?.[field]);
    const b = show(next[field]);
    if (a !== b) changes.push({ label, before: a, after: b });
  }
  const body = diffLines(String(prev?.body ?? ""), String(next.body ?? "")).map((part) => ({
    value: part.value,
    added: Boolean(part.added),
    removed: Boolean(part.removed),
  }));
  return { changes, body, bodyChanged: body.some((p) => p.added || p.removed) };
}

export function canRestore(user: SessionUser | null, page: PageDoc): boolean {
  if (!user || !user.emailVerified) return false;
  if (user.role === "admin" || user.role === "moderator") return true;
  if (page.type === "person") return user.id === page.ownerId;
  return canEditOrg(user, page);
}

/** Restores the content of an earlier revision as a new revision (history is never rewritten). */
export async function restoreRevision(user: SessionUser, page: PageDoc, revId: string): Promise<string | null> {
  if (!canRestore(user, page)) return "You can't restore revisions of this page.";
  const pair = await getRevisionPair(page._id, revId);
  if (!pair?.rev.isContent) return "This revision can't be restored.";
  const s = pair.rev.snapshot;
  await connectDB();
  const doc = await Page.findById(page._id);
  if (!doc) return "Page not found.";
  const isMod = user.role === "admin" || user.role === "moderator";
  const infobox = { ...(s.infobox ?? {}) };
  // The website stays locked (it decides who can claim the page)
  if (page.type !== "person" && !isMod && !page.orgAdmins.includes(user.id) && doc.infobox?.website) infobox.website = doc.infobox.website;
  const fields: Record<string, unknown> = { summary: s.summary ?? "", tags: s.tags ?? [], infobox, body: s.body ?? "", sources: s.sources ?? [], outLinks: s.outLinks ?? [] };
  if (page.type === "person") Object.assign(fields, { experiences: s.experiences ?? [], educations: s.educations ?? [], noindex: Boolean(s.noindex) });
  const prevSize = doc.body?.length ?? 0;
  doc.set(fields);
  doc.revisionCount = (doc.revisionCount ?? 0) + 1;
  await doc.save();
  await Revision.create({
    pageId: doc._id,
    authorId: user.id,
    authorName: user.name,
    editSummary: `Restored the version from ${new Date(pair.rev.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC`,
    snapshot: { title: doc.title, ...fields, image: doc.image ?? null },
    size: String(fields.body).length,
    delta: String(fields.body).length - prevSize,
  });
  return null;
}

/* ───────────── Users: ban / unban ───────────── */

export async function findUsers(q: string) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  const term = q.trim().slice(0, 100);
  if (term) {
    const rx = { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    filter.$or = [{ email: rx }, { name: rx }];
  }
  const users = await User.find(filter, { name: 1, email: 1, role: 1, bannedAt: 1, banReason: 1, emailVerifiedAt: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean<{ _id: unknown; name: string; email: string; role: string; bannedAt?: Date | null; banReason?: string; emailVerifiedAt?: Date | null; createdAt: Date }[]>();
  const pages = await Page.find({ type: "person", ownerId: { $in: users.map((u) => u._id) } }, { slug: 1, ownerId: 1 }).lean<{ slug: string; ownerId: unknown }[]>();
  const slugOf = new Map(pages.map((p) => [String(p.ownerId), p.slug]));
  return users.map((u) => ({ ...u, id: String(u._id), profileSlug: slugOf.get(String(u._id)) ?? null }));
}

export async function setBan(moderator: SessionUser, userId: string, banned: boolean, reason: string): Promise<string | null> {
  if (moderator.id === userId) return "You can't ban yourself.";
  await connectDB();
  const target = await User.findById(userId);
  if (!target) return "User not found.";
  if (target.role === "admin" && moderator.role !== "admin") return "Only admins can ban admins.";
  target.bannedAt = banned ? new Date() : null;
  target.banReason = banned ? reason : "";
  await target.save();
  if (banned) {
    await Session.deleteMany({ userId: target._id });
    // Their profile disappears from the site (it stays in the database so the ban can be undone)
    await Page.updateOne(
      { type: "person", ownerId: target._id },
      { $set: { status: "rejected", "review.note": "Account suspended", "review.reviewedAt": new Date(), "review.reviewerName": moderator.name } },
    );
  }
  return null;
}

/* ───────────── Reports ───────────── */

export const REPORT_REASONS: Record<string, string> = {
  copyright: "Copyright infringement",
  impersonation: "Fake profile / impersonation",
  false_info: "False or misleading information",
  harassment: "Harassment or hateful content",
  privacy: "Private information shared without consent",
  spam: "Spam",
  other: "Something else",
};

export async function createReport(input: {
  page: PageDoc | null;
  reason: string;
  details: string;
  reporter: SessionUser | null;
  reporterName: string;
  reporterEmail: string;
}): Promise<void> {
  await connectDB();
  await Report.create({
    pageId: input.page?._id ?? null,
    pageSlug: input.page?.slug ?? "",
    pageTitle: input.page?.title ?? "",
    reason: input.reason,
    details: input.details,
    reporterId: input.reporter?.id ?? null,
    reporterName: input.reporterName || input.reporter?.name || "",
    reporterEmail: input.reporterEmail || input.reporter?.email || "",
  });
  const mods = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean).slice(0, 10);
  for (const to of mods) {
    await sendEmail({
      to,
      subject: `New report: ${REPORT_REASONS[input.reason] ?? input.reason}${input.page ? ` — ${input.page.title}` : ""}`,
      lines: [input.details.slice(0, 1000) || "(no details)"],
      button: { label: "Open reports", url: `${siteUrl()}/admin?section=reports` },
    });
  }
}

export async function listReports(status: "open" | "resolved" | "dismissed") {
  await connectDB();
  const rows = await Report.find({ status }).sort({ createdAt: status === "open" ? 1 : -1 }).limit(100).lean<any[]>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const pageIds = rows.map((r) => r.pageId).filter(Boolean);
  const pages = await Page.find({ _id: { $in: pageIds } }, { type: 1, slug: 1, ownerId: 1, status: 1 }).lean<any[]>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const byId = new Map(pages.map((p) => [String(p._id), p]));
  return rows.map((r) => {
    const p = r.pageId ? byId.get(String(r.pageId)) : null;
    return {
      id: String(r._id),
      reason: r.reason as string,
      details: r.details as string,
      pageSlug: (p?.slug ?? r.pageSlug) as string,
      pageTitle: r.pageTitle as string,
      pageType: (p?.type ?? null) as "person" | "org" | "school" | null,
      pageStatus: (p?.status ?? null) as string | null,
      ownerId: p?.ownerId ? String(p.ownerId) : null,
      reporterName: r.reporterName as string,
      reporterEmail: r.reporterEmail as string,
      resolution: r.resolution as string,
      resolvedBy: r.resolvedBy as string,
      createdAt: r.createdAt as Date,
    };
  });
}

export async function countOpenReports(): Promise<number> {
  await connectDB();
  return Report.countDocuments({ status: "open" });
}

export async function closeReport(moderator: SessionUser, id: string, status: "resolved" | "dismissed", resolution: string) {
  if (!Types.ObjectId.isValid(id)) return;
  await connectDB();
  await Report.updateOne({ _id: id }, { $set: { status, resolution, resolvedBy: moderator.name, resolvedAt: new Date() } });
}

/** Takes a person profile offline (e.g. after a valid copyright or impersonation report). */
export async function unpublishPage(moderator: SessionUser, slug: string, note: string) {
  await connectDB();
  await Page.updateOne(
    { slug, type: "person" },
    { $set: { status: "rejected", "review.note": note, "review.reviewedAt": new Date(), "review.reviewerName": moderator.name } },
  );
}
