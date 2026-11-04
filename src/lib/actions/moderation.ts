"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
    revalidatePath(`/${slug}`);
    resolution = `${resolution} [profile unpublished]`.trim();
  }
  const ownerId = str(fd.get("ownerId"), 40);
  if (bool(fd.get("ban")) && ownerId) {
    await setBan(mod, ownerId, true, resolution || "Banned after a report");
    resolution = `${resolution} [owner banned]`.trim();
  }
  await closeReport(mod, id, status, resolution);
  redirect("/admin?section=reports");
}

export async function banAction(fd: FormData): Promise<void> {
  const mod = await moderator();
  const err = await setBan(mod, str(fd.get("userId"), 40), fd.get("ban") === "1", str(fd.get("reason"), 300));
  const back = safeNext(fd.get("back"), "/admin?section=users");
  redirect(err ? `${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(err)}` : back);
}
