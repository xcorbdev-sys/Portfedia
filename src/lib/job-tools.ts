import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { JobAlert, Page, SavedJob, User } from "./models";
import { listJobs } from "./pages";
import { sendEmail } from "./email";
import { siteUrl } from "./site";

export type JobFilters = { q: string; type: string; workplace: string; level: string; location: string; sector: string };
type Listing = Awaited<ReturnType<typeof listJobs>>[number];

const norm = (s: string) => s.toLocaleLowerCase("en-US").normalize("NFKD").replace(/[̀-ͯ]/g, "");

/** The same matching as the jobs page filters. */
export function matchesJob(l: Listing, f: Partial<JobFilters>): boolean {
  const j = l.job;
  return (
    (!f.q || norm(`${j.title} ${l.org.title} ${j.description ?? ""}`).includes(norm(f.q))) &&
    (!f.type || j.type === f.type) &&
    (!f.workplace || (j.workplace || "On-site") === f.workplace) &&
    (!f.level || j.level === f.level) &&
    (!f.location || j.location === f.location) &&
    (!f.sector || l.org.sectors.includes(f.sector))
  );
}

export async function isJobSaved(userId: string, orgSlug: string, jobId: string): Promise<boolean> {
  await connectDB();
  const page = await Page.findOne({ slug: orgSlug }, { _id: 1 }).lean<{ _id: unknown }>();
  return Boolean(page && (await SavedJob.exists({ userId: new Types.ObjectId(userId), pageId: page._id, jobId })));
}

export async function toggleSavedJob(userId: string, orgSlug: string, jobId: string): Promise<boolean> {
  await connectDB();
  const page = await Page.findOne({ slug: orgSlug }, { _id: 1 }).lean<{ _id: unknown }>();
  if (!page) return false;
  const key = { userId: new Types.ObjectId(userId), pageId: page._id, jobId };
  if ((await SavedJob.deleteOne(key)).deletedCount) return false;
  await SavedJob.create(key);
  return true;
}

/** The member's saved jobs that are still listed, newest saved first. */
export async function savedJobs(userId: string) {
  await connectDB();
  const saved = await SavedJob.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).limit(200).lean<{ pageId: unknown; jobId: string }[]>();
  const all = await listJobs();
  const pages = await Page.find({ _id: { $in: saved.map((s) => s.pageId) } }, { slug: 1 }).lean<{ _id: unknown; slug: string }[]>();
  const slugOf = new Map(pages.map((p) => [String(p._id), p.slug]));
  return saved
    .map((s) => all.find((l) => l.org.slug === slugOf.get(String(s.pageId)) && l.job.id === s.jobId))
    .filter((x): x is Listing => Boolean(x));
}

export async function listAlerts(userId: string) {
  await connectDB();
  return (await JobAlert.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).lean<(JobFilters & { _id: unknown })[]>()).map((a) => ({
    id: String(a._id),
    q: a.q,
    type: a.type,
    workplace: a.workplace,
    level: a.level,
    location: a.location,
    sector: a.sector,
  }));
}

export async function addAlert(userId: string, f: JobFilters): Promise<string | null> {
  await connectDB();
  const uid = new Types.ObjectId(userId);
  if ((await JobAlert.countDocuments({ userId: uid })) >= 10) return "You can have up to 10 job alerts. Delete one first.";
  if (await JobAlert.exists({ userId: uid, ...f })) return "You already have an alert for this search.";
  await JobAlert.create({ userId: uid, ...f });
  return null;
}

export async function deleteAlert(userId: string, id: string) {
  if (!Types.ObjectId.isValid(id)) return;
  await connectDB();
  await JobAlert.deleteOne({ _id: id, userId: new Types.ObjectId(userId) });
}

export const describeAlert = (a: Partial<JobFilters>) =>
  [a.q && `"${a.q}"`, a.type, a.workplace, a.level, a.location, a.sector].filter(Boolean).join(" · ") || "All new jobs";

/**
 * Once a day: each alert gets one email with the jobs posted since its last email (nothing is sent when
 * there are none). The member asked for these, and every email links to where they are managed.
 */
export async function sendJobAlerts(): Promise<number> {
  await connectDB();
  const due = await JobAlert.find({ lastSentAt: { $lt: new Date(Date.now() - 20 * 3600_000) } }).limit(500).lean<(JobFilters & { _id: unknown; userId: unknown; lastSentAt: Date })[]>();
  if (!due.length) return 0;
  const all = await listJobs();
  let sent = 0;
  for (const a of due) {
    const fresh = all.filter((l) => l.job.postedAt && new Date(l.job.postedAt) > new Date(a.lastSentAt) && matchesJob(l, a)).slice(0, 15);
    await JobAlert.updateOne({ _id: a._id }, { $set: { lastSentAt: new Date() } });
    if (!fresh.length) continue;
    const user = await User.findById(a.userId, { email: 1, name: 1, bannedAt: 1 }).lean<{ email: string; name: string; bannedAt?: Date | null }>();
    if (!user || user.bannedAt) continue;
    await sendEmail({
      to: user.email,
      subject: `${fresh.length} new job${fresh.length === 1 ? "" : "s"} on Portfedia: ${describeAlert(a)}`,
      lines: [
        `Hi ${user.name.split(" ")[0]},`,
        `New jobs matching your alert (${describeAlert(a)}):`,
        ...fresh.map((l) => `• ${l.job.title} at ${l.org.title}${l.job.location ? `, ${l.job.location}` : ""}: ${siteUrl()}/jobs/${l.org.slug}/${l.job.id}`),
        "You get this email because you created a job alert. You can change or delete your alerts at any time.",
      ],
      button: { label: "Manage job alerts", url: `${siteUrl()}/jobs/alerts` },
    });
    sent++;
  }
  return sent;
}
