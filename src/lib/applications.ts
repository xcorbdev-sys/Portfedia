import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { JobApplication, Page } from "./models";
import { notify } from "./notifications";
import { guardContent } from "./guard";
import { rateLimit } from "./rate-limit";
import { getCards, getJob, getPageBySlug, getPersonPageOf, isOrgAdmin, type PageCard } from "./pages";
import { isPublic } from "./visibility";
import { sendEmail } from "./email";
import { siteUrl } from "./site";
import type { PageDoc, SessionUser } from "./types";

/**
 * One-click applications (#51): a member applies with their Portfedia profile (and an optional note). The
 * company's admins see applicants and move them through simple stages; the applicant follows the status.
 */
export const STAGES = {
  new: "New",
  reviewing: "Reviewing",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
} as const;
export type Stage = keyof typeof STAGES;
/** What the applicant is told when the company changes the stage. */
const TOLD: Partial<Record<Stage, string>> = {
  reviewing: "is reviewing your application",
  interview: "would like to interview you",
  offer: "has an offer for you",
  hired: "marked you as hired. Congratulations!",
  rejected: "decided not to move forward with your application",
};

const oid = (id: string) => new Types.ObjectId(id);

export const canManageApplicants = (user: SessionUser | null, org: PageDoc) => Boolean(user && (isOrgAdmin(user, org) || user.role === "admin" || user.role === "moderator"));

export async function myApplication(userId: string, orgId: string, jobId: string) {
  await connectDB();
  return JobApplication.findOne({ userId: oid(userId), pageId: oid(orgId), jobId }).lean<{ _id: unknown; status: Stage; createdAt: Date }>();
}

export async function apply(user: SessionUser, orgSlug: string, jobId: string, note: string): Promise<string | null> {
  const found = await getJob(orgSlug, jobId);
  if (!found || found.expired || !found.job.easyApply) return "This job doesn't take applications on Portfedia.";
  const { page: org, job } = found;
  if (!user.emailVerified) return "Please confirm your email address first.";
  const mine = await getPersonPageOf(user.id);
  if (!mine || !isPublic(mine) || mine.status === "draft") return "You need a published profile to apply with it.";
  if (isOrgAdmin(user, org)) return "You manage this company.";
  const clean = note.trim().slice(0, 3000);
  const guard = await guardContent(user, { texts: [clean], newLinks: [], page: mine });
  if (guard) return guard;
  await connectDB();
  const existing = await JobApplication.findOne({ userId: oid(user.id), pageId: oid(org._id), jobId });
  if (existing && existing.status !== "withdrawn") return "You already applied for this job.";
  if (!(await rateLimit(`apply:${user.id}`, 20, 86400_000))) return "You can apply for 20 jobs a day.";
  if (existing) {
    Object.assign(existing, { status: "new", statusAt: new Date(), note: clean, companyNote: "" });
    await existing.save();
  } else {
    await JobApplication.create({ pageId: oid(org._id), jobId, jobTitle: job.title, userId: oid(user.id), personPageId: oid(mine._id), note: clean });
  }
  const admins = org.orgAdmins;
  await notify(admins, { type: "job_application", text: `${mine.title} applied for ${job.title}.`, href: `/org/${org.slug}/applicants?job=${job.id}`, pageId: org._id });
  return null;
}

export async function withdraw(user: SessionUser, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) return;
  await connectDB();
  await JobApplication.updateOne({ _id: id, userId: oid(user.id), status: { $nin: ["hired", "withdrawn"] } }, { $set: { status: "withdrawn", statusAt: new Date() } });
}

export interface MyApplicationRow { id: string; org: { slug: string; title: string; image: PageCard["image"] }; jobId: string; jobTitle: string; status: Stage; statusAt: Date; createdAt: Date }

export async function listMyApplications(userId: string): Promise<MyApplicationRow[]> {
  await connectDB();
  const rows = await JobApplication.find({ userId: oid(userId) }).sort({ updatedAt: -1 }).limit(200).lean<
    { _id: unknown; pageId: unknown; jobId: string; jobTitle: string; status: Stage; statusAt: Date; createdAt: Date }[]
  >();
  const orgs = await Page.find({ _id: { $in: rows.map((r) => r.pageId) } }, { slug: 1, title: 1, image: 1 }).lean<{ _id: unknown; slug: string; title: string; image?: PageCard["image"] }[]>();
  const byId = new Map(orgs.map((o) => [String(o._id), o]));
  return rows
    .filter((r) => byId.has(String(r.pageId)))
    .map((r) => {
      const o = byId.get(String(r.pageId))!;
      return { id: String(r._id), org: { slug: o.slug, title: o.title, image: o.image?.url ? o.image : null }, jobId: r.jobId, jobTitle: r.jobTitle, status: r.status, statusAt: r.statusAt, createdAt: r.createdAt };
    });
}

export interface ApplicantRow { id: string; jobId: string; jobTitle: string; person: PageCard | null; note: string; status: Stage; statusAt: Date; createdAt: Date; companyNote: string }

export async function listApplicants(org: PageDoc, jobId?: string): Promise<ApplicantRow[]> {
  await connectDB();
  const rows = await JobApplication.find({ pageId: oid(org._id), status: { $ne: "withdrawn" }, ...(jobId ? { jobId } : {}) }).sort({ createdAt: -1 }).limit(500).lean<
    { _id: unknown; jobId: string; jobTitle: string; personPageId: unknown; note: string; status: Stage; statusAt: Date; createdAt: Date; companyNote?: string }[]
  >();
  const pages = await Page.find({ _id: { $in: rows.map((r) => r.personPageId) } }, { slug: 1 }).lean<{ _id: unknown; slug: string }[]>();
  const slugOf = new Map(pages.map((p) => [String(p._id), p.slug]));
  const cards = new Map((await getCards(pages.map((p) => p.slug))).map((c) => [c.slug, c]));
  return rows.map((r) => ({
    id: String(r._id),
    jobId: r.jobId,
    jobTitle: r.jobTitle,
    person: cards.get(slugOf.get(String(r.personPageId)) ?? "") ?? null,
    note: r.note,
    status: r.status,
    statusAt: r.statusAt,
    createdAt: r.createdAt,
    companyNote: r.companyNote ?? "",
  }));
}

/** The company moves an applicant to another stage; the applicant is told (in the site and by email). */
export async function setStage(user: SessionUser, orgSlug: string, id: string, stage: string, companyNote?: string): Promise<string | null> {
  const org = await getPageBySlug(orgSlug, ["org", "school"]);
  if (!org || !canManageApplicants(user, org)) return "Only the company's admins can do this.";
  if (!Types.ObjectId.isValid(id)) return "Application not found.";
  await connectDB();
  const app = await JobApplication.findOne({ _id: id, pageId: oid(org._id) });
  if (!app || app.status === "withdrawn") return "Application not found.";
  if (companyNote !== undefined) app.companyNote = companyNote.slice(0, 2000);
  const changed = stage in STAGES && stage !== "withdrawn" && stage !== app.status;
  if (changed) {
    app.status = stage;
    app.statusAt = new Date();
  }
  await app.save();
  const told = changed ? TOLD[stage as Stage] : undefined;
  if (told) {
    const text = `${org.title} ${told} (${app.jobTitle}).`;
    await notify([String(app.userId)], { type: "job_application", text, href: "/jobs/applications" });
    const { User } = await import("./models");
    const u = await User.findById(app.userId, { email: 1, name: 1 }).lean<{ email: string; name: string }>();
    if (u) {
      await sendEmail({
        to: u.email,
        subject: `${app.jobTitle} at ${org.title}: ${STAGES[stage as Stage]}`,
        lines: [`Hi ${u.name.split(" ")[0]},`, text, "You can follow all your applications on Portfedia."],
        button: { label: "My applications", url: `${siteUrl()}/jobs/applications` },
      });
    }
  }
  return null;
}

/** Applicant counts per job (for the company's Manage page). */
export async function applicantCounts(orgId: string): Promise<Map<string, number>> {
  await connectDB();
  const rows = await JobApplication.aggregate([{ $match: { pageId: oid(orgId), status: { $ne: "withdrawn" } } }, { $group: { _id: "$jobId", n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [r._id as string, r.n as number]));
}
