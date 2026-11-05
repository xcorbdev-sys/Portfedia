"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "../auth";
import { addSavedSearch, cleanSearch, deleteSavedSearch, searchHref } from "../saved-searches";
import { MUTABLE_NOTIFICATIONS } from "../notifications";
import { connectDB } from "../db";
import { User } from "../models";
import { bool, str } from "../validate";

/** "Save this search": new matching pages are announced once a day (#37). */
export async function saveSearchAction(fd: FormData): Promise<void> {
  const s = cleanSearch({ kind: fd.get("kind"), q: fd.get("q"), sector: fd.get("sector") });
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(searchHref(s))}`);
  const err = await addSavedSearch(user.id, s);
  redirect(`/account/searches?${err ? `error=${encodeURIComponent(err)}` : "saved=1"}`);
}

export async function deleteSavedSearchAction(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/searches");
  await deleteSavedSearch(user.id, str(fd.get("id"), 40));
  redirect("/account/searches?deleted=1");
}

/** #39: which notification kinds arrive in the site, and which emails are sent. */
export async function notificationPrefsAction(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account%23notifications");
  const muted = MUTABLE_NOTIFICATIONS.filter((n) => !bool(fd.get(`n_${n.type}`))).map((n) => n.type);
  await connectDB();
  await User.updateOne(
    { _id: user.id },
    { $set: { mutedNotifications: muted, "emailPrefs.profileUpdates": bool(fd.get("e_profileUpdates")), "emailPrefs.searchAlerts": bool(fd.get("e_searchAlerts")) } },
  );
  revalidatePath("/account");
  redirect("/account?prefs=1#notifications");
}
