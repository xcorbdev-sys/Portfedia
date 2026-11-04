"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "../auth";
import { getPageBySlug } from "../pages";
import { createSuggestion, decideSuggestion, decideTestimonial, upsertTestimonial } from "../feedback";
import { guardContent } from "../guard";
import { externalLinks } from "../content-rules";
import { isPublic } from "../visibility";
import { rateLimit } from "../rate-limit";
import { str } from "../validate";
import type { FormState } from "./auth";

async function target(fd: FormData) {
  const user = await getCurrentUser();
  const slug = str(fd.get("slug"), 100);
  if (!user) redirect(`/login?next=/${slug}`);
  const page = await getPageBySlug(slug, "person");
  if (!page || !isPublic(page)) return { user, page: null, error: "Profile not found." };
  if (!user.emailVerified) return { user, page: null, error: "Please confirm your email address first." };
  if (page.ownerId === user.id) return { user, page: null, error: "You can edit your own profile directly." };
  if (!rateLimit(`feedback:${user.id}`, 10, 3600_000)) return { user, page: null, error: "Too many requests. Please try again later." };
  return { user, page, error: null };
}

export async function suggestEditAction(_: FormState, fd: FormData): Promise<FormState> {
  const { user, page, error } = await target(fd);
  if (error || !page) return { error: error ?? "Not found." };
  const message = str(fd.get("message"), 2000);
  if (message.length < 10) return { error: "Please explain what should change (at least a sentence)." };
  const body = fd.has("body") ? String(fd.get("body") ?? "").slice(0, 100_000) : null;
  const before = new Set(externalLinks(page.body));
  const guard = await guardContent(user, { texts: [message, body], newLinks: externalLinks(body).filter((l) => !before.has(l)), page });
  if (guard) return { error: guard };
  await createSuggestion(user, page, message, body);
  return { ok: `Thanks! ${page.title} will review your suggestion.` };
}

export async function recommendAction(_: FormState, fd: FormData): Promise<FormState> {
  const { user, page, error } = await target(fd);
  if (error || !page) return { error: error ?? "Not found." };
  const text = str(fd.get("text"), 1500);
  if (text.length < 30) return { error: "Please write at least a couple of sentences." };
  const relationship = str(fd.get("relationship"), 120);
  const guard = await guardContent(user, { texts: [text, relationship], newLinks: [], page });
  if (guard) return { error: guard };
  await upsertTestimonial(user, page, relationship, text);
  return { ok: `Thanks! Your recommendation will appear once ${page.title} approves it.` };
}

export async function decideSuggestionAction(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");
  await decideSuggestion(user, str(fd.get("id"), 40), fd.get("accept") === "1");
  revalidatePath("/inbox");
  redirect("/inbox");
}

export async function decideTestimonialAction(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/inbox");
  const action = fd.get("do") === "publish" ? "publish" : fd.get("do") === "delete" ? "delete" : "hide";
  await decideTestimonial(user, str(fd.get("id"), 40), action);
  redirect("/inbox");
}
