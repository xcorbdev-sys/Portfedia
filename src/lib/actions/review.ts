"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, isModerator, safeNext } from "../auth";
import { decideApplication } from "../pages";
import { bool, str } from "../validate";

async function moderator() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isModerator(user)) throw new Error("Only moderators can review applications");
  return user;
}

function revalidate(slug: string, orgSlugs: string[]) {
  revalidatePath(`/${slug}`);
  revalidatePath("/admin");
  revalidatePath("/");
  for (const o of orgSlugs) revalidatePath(`/org/${o}`);
}

export async function approveApplicationAction(fd: FormData): Promise<void> {
  const user = await moderator();
  const slug = str(fd.get("slug"), 100);
  const page = await decideApplication(user, slug, { approve: true, verified: bool(fd.get("verified")) });
  if (page) revalidate(page.slug, [...page.experiences.map((e) => e.orgSlug), ...page.educations.map((e) => e.schoolSlug)]);
  redirect(safeNext(fd.get("back"), "/admin"));
}

export async function rejectApplicationAction(fd: FormData): Promise<void> {
  const user = await moderator();
  const slug = str(fd.get("slug"), 100);
  const note = str(fd.get("note"), 1000) || "Your profile does not meet our guidelines yet.";
  const page = await decideApplication(user, slug, { approve: false, note });
  if (page) revalidate(page.slug, []);
  redirect(safeNext(fd.get("back"), "/admin"));
}
