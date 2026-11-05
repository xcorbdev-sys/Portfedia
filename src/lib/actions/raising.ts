"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import { setRaiseNotifications } from "../raising";

export async function raiseNotificationsAction(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/raising");
  await setRaiseNotifications(user.id, fd.get("on") === "1");
  redirect("/raising");
}
