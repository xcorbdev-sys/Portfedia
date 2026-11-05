"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import { deleteUpdate, postUpdate, toggleAttendance } from "../page-social";
import { revalidatePath } from "../revalidate";
import { str } from "../validate";
import { rateLimit } from "../rate-limit";

export async function postUpdateAction(fd: FormData): Promise<void> {
  const slug = str(fd.get("slug"), 120);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/org/${slug}`);
  const err = await postUpdate(user, slug, String(fd.get("text") ?? ""), str(fd.get("url"), 300));
  revalidatePath(`/org/${slug}`);
  redirect(`/org/${slug}?${err ? `updateError=${encodeURIComponent(err)}` : "posted=1"}#updates`);
}

export async function deleteUpdateAction(fd: FormData): Promise<void> {
  const slug = str(fd.get("slug"), 120);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/org/${slug}`);
  await deleteUpdate(user, slug, str(fd.get("id"), 40));
  revalidatePath(`/org/${slug}`);
  redirect(`/org/${slug}?removed=1#updates`);
}

export async function attendAction(fd: FormData): Promise<void> {
  const slug = str(fd.get("slug"), 120);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/org/${slug}`);
  if (await rateLimit(`attend:${user.id}`, 60, 3600_000)) await toggleAttendance(user.id, slug);
  // Same address with only a #hash would not reload the page: refresh it explicitly
  revalidatePath(`/org/${slug}`);
  redirect(`/org/${slug}?going=1#attending`);
}
