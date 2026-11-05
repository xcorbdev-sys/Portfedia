import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Page } from "./models";
import { getCards, getPageBySlug, isOrgAdmin, type PageCard } from "./pages";
import { notify } from "./notifications";
import { PUBLIC_FILTER } from "./visibility";
import type { SessionUser } from "./types";

/**
 * Recruiters (#58): an organization's admins mark people who work there (with a verified, current position) as
 * the people who hire. They are shown on the organization's job pages and as "Recruiting for …" on their profile.
 */
const oid = (id: string) => new Types.ObjectId(id);

/** Organizations that named this profile as a recruiter (claimed pages only). */
export async function recruiterFor(personPageId: string): Promise<{ slug: string; title: string }[]> {
  await connectDB();
  return Page.find({ recruiters: oid(personPageId), status: "claimed" }, { slug: 1, title: 1 }).limit(5).lean<{ slug: string; title: string }[]>();
}

/** The recruiters of an organization, as profile cards (only people still working there, verified). */
export async function recruitersOf(org: { slug: string; recruiters?: string[] }): Promise<PageCard[]> {
  if (!org.recruiters?.length) return [];
  await connectDB();
  const rows = await Page.find(
    { _id: { $in: org.recruiters.map(oid) }, type: "person", ...PUBLIC_FILTER, experiences: { $elemMatch: { orgSlug: org.slug, current: true, verification: "verified" } } },
    { slug: 1 },
  ).lean<{ slug: string }[]>();
  return getCards(rows.map((r) => r.slug));
}

export async function toggleRecruiter(user: SessionUser, orgSlug: string, personSlug: string): Promise<string | null> {
  const [org, person] = await Promise.all([getPageBySlug(orgSlug, ["org", "school"]), getPageBySlug(personSlug, "person")]);
  if (!org || !person) return "Not found.";
  if (!isOrgAdmin(user, org) && user.role !== "admin" && user.role !== "moderator") return "Only the organization's admins can do this.";
  const isRecruiter = org.recruiters.includes(person._id);
  if (!isRecruiter && !person.experiences.some((e) => e.orgSlug === org.slug && e.current && e.verification === "verified"))
    return `Verify ${person.title}'s current position at ${org.title} first.`;
  await connectDB();
  await Page.updateOne({ _id: org._id }, isRecruiter ? { $pull: { recruiters: oid(person._id) } } : { $addToSet: { recruiters: oid(person._id) } });
  if (!isRecruiter && person.ownerId) await notify([person.ownerId], { type: "claimed", text: `${org.title} named you as a recruiter. You'll appear on its job pages.`, href: `/org/${org.slug}#jobs`, pageId: org._id });
  return null;
}
