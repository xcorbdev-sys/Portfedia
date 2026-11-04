import { connection } from "next/server";
import { Types } from "mongoose";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Follow, LoginLog, Page, Report, Revision, User } from "@/lib/models";
import { readSnapshot } from "@/lib/snapshots";

/** GDPR / KVKK right of access: everything we hold about the signed-in user, as JSON. */
export async function GET() {
  await connection(); // always run at request time
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  await connectDB();
  const oid = new Types.ObjectId(user.id);
  const [account, profile, follows, reports, signIns] = await Promise.all([
    User.findById(oid, { passwordHash: 0, __v: 0 }).lean(),
    Page.findOne({ type: "person", ownerId: oid }, { __v: 0, titleKey: 0 }).lean(),
    Follow.find({ userId: oid }, { pageId: 1, createdAt: 1 }).lean(),
    Report.find({ reporterId: oid }, { reason: 1, details: 1, pageSlug: 1, status: 1, createdAt: 1 }).lean(),
    LoginLog.find({ userId: oid }, { _id: 0, ip: 1, userAgent: 1, method: 1, at: 1 }).sort({ at: -1 }).lean(),
  ]);
  const followedPages = await Page.find({ _id: { $in: follows.map((f) => f.pageId) } }, { slug: 1, title: 1, type: 1 }).lean();
  const [profileHistory, edits] = await Promise.all([
    profile ? Revision.find({ pageId: profile._id }, { __v: 0 }).sort({ createdAt: 1 }).lean() : Promise.resolve([]),
    Revision.find({ authorId: oid, ...(profile ? { pageId: { $ne: profile._id } } : {}) }, { snapshot: 0, snapshotZ: 0, __v: 0 }).sort({ createdAt: 1 }).lean(),
  ]);
  const managedOrganizations = await Page.find({ orgAdmins: oid }, { slug: 1, title: 1 }).lean();

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      note: "Images are referenced by URL. Your year of birth is not stored, only the confirmation that you are old enough.",
      account,
      profile,
      profileHistory: (profileHistory as { snapshotZ?: unknown }[]).map(({ snapshotZ, ...r }) => ({ ...r, snapshot: readSnapshot({ ...r, snapshotZ } as never) })),
      editsToOtherPages: edits,
      managedOrganizations,
      following: followedPages,
      reportsYouSent: reports,
      signInsLastYear: signIns,
    },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="portfedia-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
