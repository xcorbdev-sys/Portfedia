"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "../revalidate";
import { headers } from "next/headers";
import { getCurrentUser, isModerator, safeNext } from "../auth";
import { getPageBySlug } from "../pages";
import { closeReport, createReport, REPORT_REASONS, restoreRevision, setBan, unpublishPage } from "../moderation";
import { pageHref } from "../wikitext";
import { looksLikeBot } from "../bot";
import { bool, email as cleanEmail, str } from "../validate";
import { rateLimit } from "../rate-limit";
import type { FormState } from "./auth";

async function moderator() {
  const user = await getCurrentUser();
  if (!user || !isModerator(user)) redirect("/login?next=/admin");
  return user;
}

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function restoreRevisionAction(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  const slug = str(fd.get("slug"), 100);
  const page = await getPageBySlug(slug);
  if (!page) redirect("/");
  const href = pageHref(page.type, page.slug);
  if (!user) redirect(`/login?next=${encodeURIComponent(`${href}/history`)}`);
  const err = await restoreRevision(user, page, str(fd.get("rev"), 40));
  revalidatePath(href);
  redirect(err ? `${href}/history?error=${encodeURIComponent(err)}` : `${href}/history?restored=1`);
}

export async function reportAction(_: FormState, fd: FormData): Promise<FormState> {
  if (looksLikeBot(fd)) return { error: "Something went wrong. Please wait a moment and try again." };
  const user = await getCurrentUser();
  const reason = str(fd.get("reason"), 30);
  if (!REPORT_REASONS[reason]) return { error: "Please choose a reason." };
  const details = str(fd.get("details"), 5000);
  if (details.length < 10) return { error: "Please describe the problem in a few words." };
  const reporterEmail = user ? user.email : cleanEmail(fd.get("email"));
  if (!user && !reporterEmail) return { error: "Please enter your email so we can follow up." };
  if (!(await rateLimit(`report:${user?.id ?? (await ip())}`, 10, 3600_000))) return { error: "Too many reports. Please try again later." };
  const slug = str(fd.get("slug"), 100);
  const page = slug ? await getPageBySlug(slug) : null;

  let text = details;
  if (reason === "appeal") {
    // Give moderators the account's state right away
    const { connectDB } = await import("../db");
    const { User } = await import("../models");
    await connectDB();
    const acc = await User.findOne({ email: reporterEmail }, { bannedAt: 1, banReason: 1 }).lean<{ bannedAt?: Date | null; banReason?: string }>();
    text = `${details}\n\nAccount: ${!acc ? "no account with this email" : acc.bannedAt ? `banned since ${new Date(acc.bannedAt).toISOString().slice(0, 10)}${acc.banReason ? ` (${acc.banReason})` : ""}` : "not banned"}`;
  }
  if (reason === "copyright") {
    if (!bool(fd.get("goodFaith")) || !bool(fd.get("accurate"))) return { error: "Please confirm both statements." };
    const original = str(fd.get("original"), 500);
    const where = str(fd.get("where"), 500);
    text = `Content on Portfedia: ${where || (page ? pageHref(page.type, page.slug) : "—")}\nOriginal work: ${original || "—"}\n\n${details}\n\n[x] Good-faith belief the use is not authorized\n[x] Information is accurate; reporter is the owner or authorized to act`;
  }
  await createReport({ page, reason, details: text, reporter: user, reporterName: str(fd.get("name"), 120), reporterEmail });
  return { ok: "Thank you. Your report was sent to the Portfedia team and will be reviewed as soon as possible." };
}

export async function closeReportAction(fd: FormData): Promise<void> {
  const mod = await moderator();
  const id = str(fd.get("id"), 40);
  const status = fd.get("status") === "dismissed" ? "dismissed" : "resolved";
  let resolution = str(fd.get("resolution"), 1000);
  const slug = str(fd.get("slug"), 100);
  if (bool(fd.get("unpublish")) && slug) {
    await unpublishPage(mod, slug, resolution || "Removed after a report");
    const ownerOfReported = str(fd.get("ownerId"), 40);
    if (ownerOfReported) await expireOrgsOfOwner(ownerOfReported);
    revalidatePath(`/${slug}`);
    resolution = `${resolution} [profile unpublished]`.trim();
  }
  const ownerId = str(fd.get("ownerId"), 40);
  if (bool(fd.get("ban")) && ownerId) {
    await setBan(mod, ownerId, true, resolution || "Banned after a report");
    await expireOrgsOfOwner(ownerId);
    resolution = `${resolution} [owner banned]`.trim();
  }
  await closeReport(mod, id, status, resolution);
  redirect("/admin?section=reports");
}

async function expireOrgsOfOwner(userId: string) {
  const { getPersonPageOf } = await import("../pages");
  const { expireOrg } = await import("../revalidate");
  const p = await getPersonPageOf(userId);
  for (const e of p?.experiences ?? []) expireOrg(e.orgSlug);
  for (const e of p?.educations ?? []) expireOrg(e.schoolSlug);
}

export async function banAction(fd: FormData): Promise<void> {
  const mod = await moderator();
  const err = await setBan(mod, str(fd.get("userId"), 40), fd.get("ban") === "1", str(fd.get("reason"), 300));
  await expireOrgsOfOwner(str(fd.get("userId"), 40));
  const back = safeNext(fd.get("back"), "/admin?section=users");
  redirect(err ? `${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(err)}` : back);
}

/* ───────────── Bulk actions (#37) and organization tools (#23, #24) ───────────── */

export async function bulkApplicationsAction(fd: FormData): Promise<void> {
  const mod = await moderator();
  const { decideApplication } = await import("../pages");
  const slugs = fd.getAll("slugs").map((s) => str(s, 100)).filter(Boolean).slice(0, 100);
  const approve = fd.get("op") === "approve";
  const note = str(fd.get("note"), 1000) || "Your profile does not meet our guidelines yet.";
  for (const slug of slugs) await decideApplication(mod, slug, approve ? { approve: true, verified: false } : { approve: false, note });
  for (const slug of slugs) revalidatePath(`/${slug}`);
  redirect("/admin");
}

export async function bulkReportsAction(fd: FormData): Promise<void> {
  const mod = await moderator();
  const ids = fd.getAll("ids").map((s) => str(s, 40)).filter(Boolean).slice(0, 100);
  const status = fd.get("op") === "resolve" ? "resolved" : "dismissed";
  for (const id of ids) await closeReport(mod, id, status, str(fd.get("resolution"), 1000));
  redirect("/admin?section=reports");
}

export async function renameOrgAction(fd: FormData): Promise<void> {
  const mod = await moderator();
  const { renameOrg } = await import("../org-tools");
  const slug = str(fd.get("slug"), 100);
  const res = await renameOrg(mod, slug, str(fd.get("title"), 160));
  if (res.slug) revalidatePath(`/org/${res.slug}`);
  redirect(res.error ? `/org/${slug}/manage?error=${encodeURIComponent(res.error)}#moderator` : `/org/${res.slug}/manage?done=renamed`);
}

export async function mergeOrgAction(fd: FormData): Promise<void> {
  const mod = await moderator();
  const { mergeOrgs } = await import("../org-tools");
  const { slugify } = await import("../slug");
  const slug = str(fd.get("slug"), 100);
  const raw = str(fd.get("target"), 300);
  const target = (raw.match(/\/org\/([a-z0-9-]+)/)?.[1] ?? slugify(raw)) || "";
  const res = await mergeOrgs(mod, slug, target);
  if (res.slug) revalidatePath(`/org/${res.slug}`);
  redirect(res.error ? `/org/${slug}/manage?error=${encodeURIComponent(res.error)}#moderator` : `/org/${res.slug}?merged=1`);
}
