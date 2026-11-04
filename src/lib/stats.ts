import "server-only";
import { connectDB } from "./db";
import { Page, Report, Revision, User } from "./models";
import { outboxStats } from "./outbox";
import { getMeta } from "./maintenance";
import { possibleDuplicateOrgs } from "./org-tools";

const DAY = 86400_000;

/** #36: numbers for the admin overview. */
export async function adminStats() {
  await connectDB();
  const since30 = new Date(Date.now() - 30 * DAY);
  const [users, verified, banned, people, pending, orgs, claimed, openReports, approved30, rejected30, pendingApps, decided30, signups, outbox, hibp, maintenance, duplicates] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ emailVerifiedAt: { $ne: null } }),
      User.countDocuments({ bannedAt: { $ne: null } }),
      Page.countDocuments({ type: "person", status: "published" }),
      Page.countDocuments({ type: "person", status: "pending" }),
      Page.countDocuments({ type: { $in: ["org", "school"] } }),
      Page.countDocuments({ type: { $in: ["org", "school"] }, status: "claimed" }),
      Report.countDocuments({ status: "open" }),
      Revision.countDocuments({ editSummary: "Application approved", createdAt: { $gt: since30 } }),
      Revision.countDocuments({ editSummary: /^Application not approved/, createdAt: { $gt: since30 } }),
      Page.find({ type: "person", status: "pending" }, { "review.submittedAt": 1 }).lean<{ review?: { submittedAt?: Date } }[]>(),
      Page.find({ type: "person", "review.reviewedAt": { $gt: since30 }, "review.submittedAt": { $ne: null } }, { review: 1 }).lean<{ review: { submittedAt: Date; reviewedAt: Date } }[]>(),
      User.aggregate([
        { $match: { createdAt: { $gt: new Date(Date.now() - 8 * 7 * DAY) } } },
        { $group: { _id: { $dateTrunc: { date: "$createdAt", unit: "week" } }, n: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      outboxStats(),
      getMeta<{ failures?: number; lastFailureAt?: string; lastError?: string }>("hibp"),
      getMeta<Record<string, unknown>>("maintenance:last"),
      possibleDuplicateOrgs(10),
    ]);
  const hours = (ms: number) => Math.round((ms / 3600_000) * 10) / 10;
  const waits = pendingApps.map((p) => Date.now() - new Date(p.review?.submittedAt ?? Date.now()).getTime());
  const decisions = decided30.map((p) => new Date(p.review.reviewedAt).getTime() - new Date(p.review.submittedAt).getTime()).filter((x) => x >= 0);
  return {
    users,
    verified,
    banned,
    people,
    pending,
    orgs,
    claimed,
    openReports,
    approvalRate30: approved30 + rejected30 ? Math.round((approved30 / (approved30 + rejected30)) * 100) : null,
    decided30: approved30 + rejected30,
    oldestPendingHours: waits.length ? hours(Math.max(...waits)) : null,
    avgDecisionHours: decisions.length ? hours(decisions.reduce((a, b) => a + b, 0) / decisions.length) : null,
    signupsByWeek: signups.map((s) => ({ week: s._id as Date, n: s.n as number })),
    outbox,
    hibp,
    maintenance,
    duplicates,
  };
}
