import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Page, Revision, User } from "./models";
import { consumeToken, createToken, peekToken } from "./tokens";
import { sendEmail } from "./email";
import { notifyFollowers, notifyOwnerOfPage } from "./notifications";
import { siteUrl } from "./site";
import { checkWorkEmail, claimDomainFor, emailMatchesDomain } from "./claim-rules";
import { PUBLIC_FILTER } from "./visibility";
import type { Experience, PageDoc, SessionUser, StoredImage } from "./types";

const DAY = 86400_000;

export function claimDomainOf(page: PageDoc) {
  return claimDomainFor({ claimDomain: page.claimDomain, website: page.infobox.website, websiteChangedAt: page.websiteChangedAt });
}

async function moderatorEmails(): Promise<string[]> {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  await connectDB();
  const mods = await User.find({ role: { $in: ["admin", "moderator"] }, emailVerifiedAt: { $ne: null } }, { email: 1 }).lean<{ email: string }[]>();
  return [...new Set([...fromEnv, ...mods.map((m) => m.email)])].slice(0, 20);
}

/* ───────────── Claiming (also used to invite more admins) ───────────── */

/** Sends a confirmation link to a work email. Whoever opens it while signed in becomes an admin of the page. */
export async function requestOrgClaim(user: SessionUser, page: PageDoc, workEmail: string, invitedBy?: string): Promise<string | null> {
  if (page.type === "person") return "Only organization pages can be claimed.";
  const domain = claimDomainOf(page);
  if (!domain.ok) return domain.reason;
  const err = checkWorkEmail(workEmail, domain.domain);
  if (err) return err;
  const token = await createToken("claim_org", { data: { slug: page.slug, email: workEmail.toLowerCase(), invitedBy: invitedBy ?? null }, ttlMs: 3 * DAY });
  const url = `${siteUrl()}/org/${page.slug}/claim/confirm?token=${token}`;
  await sendEmail({
    to: workEmail,
    subject: invitedBy ? `You're invited to manage ${page.title} on Portfedia` : `Confirm you represent ${page.title}`,
    lines: invitedBy
      ? [`${invitedBy} invited you to help manage the ${page.title} page on Portfedia.`, "Open the link while signed in to your Portfedia account to accept. The link is valid for 3 days."]
      : [
          `Hi ${user.name.split(" ")[0]},`,
          `Confirm that you work at ${page.title} to manage its Portfedia page. Open the link while signed in to your Portfedia account. The link is valid for 3 days.`,
        ],
    button: { label: invitedBy ? "Accept invitation" : "Confirm and manage page", url },
  });
  return null;
}

export async function peekClaim(raw: string) {
  const t = await peekToken("claim_org", raw);
  return t ? { slug: String(t.data.slug), email: String(t.data.email) } : null;
}

export async function confirmOrgClaim(user: SessionUser, raw: string): Promise<{ slug?: string; error?: string }> {
  const t = await consumeToken("claim_org", raw);
  if (!t) return { error: "This link is invalid or has expired." };
  await connectDB();
  const page = await Page.findOne({ slug: t.data.slug, type: { $in: ["org", "school"] } });
  if (!page) return { error: "This page no longer exists." };
  const firstClaim = page.status !== "claimed";
  if (!page.orgAdmins.map(String).includes(user.id)) page.orgAdmins.push(new Types.ObjectId(user.id));
  page.status = "claimed";
  page.revisionCount = (page.revisionCount ?? 0) + 1;
  await page.save();
  await Revision.create({
    pageId: page._id,
    authorId: user.id,
    authorName: user.name,
    editSummary: firstClaim ? `Page claimed with a work email (@${String(t.data.email).split("@")[1]})` : `Admin added (${user.name})`,
    snapshot: { status: "claimed" },
    size: page.body?.length ?? 0,
    delta: 0,
  });
  if (firstClaim) {
    await notifyFollowers(String(page._id), user.id, {
      type: "claimed",
      text: `${page.title} is now managed by the organization.`,
      href: `/org/${page.slug}`,
    });
    // Moderators are told about every claim so mistakes can be undone quickly
    for (const to of await moderatorEmails()) {
      await sendEmail({
        to,
        subject: `${page.title} was claimed`,
        lines: [`${user.name} (${user.email}) claimed ${page.title} with ${t.data.email}.`, "If this looks wrong, remove the admin from the page's Manage screen."],
        button: { label: "Open page", url: `${siteUrl()}/org/${page.slug}` },
      });
    }
  }
  return { slug: page.slug };
}

export async function removeOrgAdmin(actor: SessionUser, slug: string, userId: string): Promise<string | null> {
  await connectDB();
  const page = await Page.findOne({ slug, type: { $in: ["org", "school"] } });
  if (!page) return "Page not found.";
  const isMod = actor.role === "admin" || actor.role === "moderator";
  if (!isMod && !page.orgAdmins.map(String).includes(actor.id)) return "Only this organization's admins can do that.";
  page.orgAdmins = page.orgAdmins.filter((a: unknown) => String(a) !== userId);
  if (page.orgAdmins.length === 0) page.status = page.body ? "published" : "draft"; // back to community editing
  await page.save();
  return null;
}

export async function listOrgAdmins(page: PageDoc) {
  if (page.orgAdmins.length === 0) return [];
  await connectDB();
  const users = await User.find({ _id: { $in: page.orgAdmins } }, { name: 1, email: 1 }).lean<{ _id: unknown; name: string; email: string }[]>();
  return users.map((u) => ({ id: String(u._id), name: u.name, email: u.email }));
}

/* ───────────── Career entry verification ───────────── */

export interface Position {
  personSlug: string;
  personTitle: string;
  image: StoredImage | null;
  index: number;
  entry: Experience;
}

/** All public career entries that mention this organization (for its Manage screen). */
export async function listPositions(orgSlug: string): Promise<Position[]> {
  await connectDB();
  const docs = await Page.find({ type: "person", "experiences.orgSlug": orgSlug, ...PUBLIC_FILTER }, { slug: 1, title: 1, image: 1, experiences: 1 })
    .sort({ title: 1 })
    .limit(1000)
    .lean<{ slug: string; title: string; image?: StoredImage; experiences: Experience[] }[]>();
  const out: Position[] = [];
  for (const d of docs) {
    d.experiences.forEach((e, index) => {
      if (e.orgSlug === orgSlug) out.push({ personSlug: d.slug, personTitle: d.title, image: d.image?.url ? d.image : null, index, entry: e });
    });
  }
  return out.sort((a, b) => Number(a.entry.verification !== "unverified") - Number(b.entry.verification !== "unverified"));
}

async function setVerification(personSlug: string, index: number, orgSlug: string, value: "verified" | "rejected" | "unverified", via: "org" | "work_email" | null) {
  await connectDB();
  // The orgSlug condition makes sure the entry at this index still belongs to this organization
  const res = await Page.updateOne(
    { slug: personSlug, type: "person", [`experiences.${index}.orgSlug`]: orgSlug },
    { $set: { [`experiences.${index}.verification`]: value, [`experiences.${index}.verifiedVia`]: value === "unverified" ? null : via } },
  );
  return res.modifiedCount > 0 || res.matchedCount > 0;
}

export async function decidePosition(
  actor: SessionUser,
  org: PageDoc,
  personSlug: string,
  index: number,
  decision: "verified" | "rejected" | "unverified",
): Promise<string | null> {
  const isMod = actor.role === "admin" || actor.role === "moderator";
  if (!isMod && !org.orgAdmins.includes(actor.id)) return "Only this organization's admins can verify positions.";
  const ok = await setVerification(personSlug, index, org.slug, decision, "org");
  if (!ok) return "This position no longer exists.";
  if (decision !== "unverified") {
    await notifyOwnerOfPage(personSlug, {
      type: "position",
      text: decision === "verified" ? `${org.title} verified your position. ✓` : `${org.title} could not confirm a position on your profile.`,
      href: `/${personSlug}`,
    });
    const person = await Page.findOne({ slug: personSlug }, { ownerId: 1, title: 1 }).lean<{ ownerId: unknown; title: string }>();
    const owner = person?.ownerId ? await User.findById(person.ownerId, { email: 1, name: 1, emailPrefs: 1 }).lean<{ email: string; name: string; emailPrefs?: { profileUpdates?: boolean } }>() : null;
    if (owner && owner.emailPrefs?.profileUpdates !== false) {
      await sendEmail({
        to: owner.email,
        subject: decision === "verified" ? `${org.title} verified your position` : `${org.title} did not confirm a position on your profile`,
        lines:
          decision === "verified"
            ? [`Hi ${owner.name.split(" ")[0]},`, `${org.title} confirmed your position. It now shows a ✓ on your profile.`]
            : [`Hi ${owner.name.split(" ")[0]},`, `${org.title} said they couldn't confirm a position on your profile, so it is hidden from their page. If this is a mistake, contact them or update the entry.`],
        button: { label: "View your profile", url: `${siteUrl()}/${personSlug}` },
        preferencesNote: true,
      });
    }
  }
  return null;
}

/** A person verifies their own position by confirming a work email at the organization's domain. */
export async function requestWorkVerification(user: SessionUser, index: number, workEmail: string): Promise<string | null> {
  await connectDB();
  const person = await Page.findOne({ type: "person", ownerId: new Types.ObjectId(user.id) }, { slug: 1, experiences: 1 }).lean<{ slug: string; experiences: Experience[] }>();
  const entry = person?.experiences[index];
  if (!person || !entry) return "Position not found.";
  const org = await Page.findOne({ slug: entry.orgSlug }).lean<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!org) return "Organization not found.";
  const domain = claimDomainFor({ claimDomain: org.claimDomain, website: org.infobox?.website, websiteChangedAt: org.websiteChangedAt });
  if (!domain.ok) return `${org.title}: ${domain.reason}`;
  const err = checkWorkEmail(workEmail, domain.domain);
  if (err) return err;
  const token = await createToken("verify_work", { userId: user.id, data: { slug: person.slug, index, orgSlug: entry.orgSlug, email: workEmail }, ttlMs: 3 * DAY });
  await sendEmail({
    to: workEmail,
    subject: `Verify your position at ${org.title}`,
    lines: [`Hi ${user.name.split(" ")[0]},`, `Confirm this work address to verify your position at ${org.title} on Portfedia. The link is valid for 3 days.`],
    button: { label: "Verify position", url: `${siteUrl()}/verify-work?token=${token}` },
  });
  return null;
}

export async function peekWorkVerification(raw: string) {
  const t = await peekToken("verify_work", raw);
  return t ? { orgSlug: String(t.data.orgSlug), email: String(t.data.email) } : null;
}

export async function confirmWorkVerification(raw: string): Promise<string | null> {
  const t = await consumeToken("verify_work", raw);
  if (!t) return null;
  const { slug, index, orgSlug, email } = t.data as { slug: string; index: number; orgSlug: string; email: string };
  await connectDB();
  const org = await Page.findOne({ slug: orgSlug }).lean<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const domain = org && claimDomainFor({ claimDomain: org.claimDomain, website: org.infobox?.website, websiteChangedAt: org.websiteChangedAt });
  if (!domain?.ok || !emailMatchesDomain(email, domain.domain)) return null;
  return (await setVerification(slug, index, orgSlug, "verified", "work_email")) ? slug : null;
}
