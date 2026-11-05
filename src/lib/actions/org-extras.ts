"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "../auth";
import { featureOn } from "../features";
import { addChangelog, deleteChangelog, toggleRaisingInterest } from "../org-extras";
import { str } from "../validate";

/** #64: add a release to a SaaS project's changelog. */
export async function addChangelogAction(fd: FormData): Promise<void> {
  const slug = str(fd.get("slug"), 120);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/org/${slug}/changelog`);
  const e = await addChangelog(user, slug, { version: str(fd.get("version"), 30), title: str(fd.get("title"), 120), notes: str(fd.get("notes"), 3000) });
  revalidatePath(`/org/${slug}`);
  redirect(`/org/${slug}/changelog?${e ? `error=${encodeURIComponent(e)}` : "added=1"}`);
}

export async function deleteChangelogAction(fd: FormData): Promise<void> {
  const slug = str(fd.get("slug"), 120);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/org/${slug}/changelog`);
  await deleteChangelog(user, slug, str(fd.get("id"), 40));
  revalidatePath(`/org/${slug}`);
  redirect(`/org/${slug}/changelog?removed=1`);
}

/** #70: "I'm interested" on a company that is raising. */
export async function raisingInterestAction(fd: FormData): Promise<void> {
  if (!(await featureOn("raising"))) redirect("/");
  const slug = str(fd.get("slug"), 120);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/org/${slug}#raising`)}`);
  const e = await toggleRaisingInterest(user, slug);
  revalidatePath(`/org/${slug}`);
  redirect(`/org/${slug}?${e ? `interestError=${encodeURIComponent(e)}` : `interest=${Date.now().toString(36)}`}#raising`);
}

/** #58: mark someone who works here as a recruiter (or take it back). */
export async function toggleRecruiterAction(fd: FormData): Promise<void> {
  const org = str(fd.get("org"), 120);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/org/${org}/manage`);
  const { toggleRecruiter } = await import("../recruiters");
  const e = await toggleRecruiter(user, org, str(fd.get("person"), 120));
  revalidatePath(`/org/${org}`);
  redirect(`/org/${org}/manage?${e ? `error=${encodeURIComponent(e)}` : `done=${encodeURIComponent("Recruiters updated.")}`}#people`);
}
