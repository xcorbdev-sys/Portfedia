"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "../auth";
import { connectDB } from "../db";
import { User } from "../models";
import { termsVersion } from "../legal";

/** #94: the member accepts the current terms (the date is kept as proof). */
export async function acceptTermsAction(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/accept-terms");
  const next = safeNext(fd.get("next"), "/");
  if (fd.get("accept") !== "on") redirect(`/accept-terms?next=${encodeURIComponent(next)}`);
  await connectDB();
  await User.updateOne({ _id: user.id }, { $set: { termsVersion: await termsVersion(), termsAcceptedAt: new Date() } });
  redirect(next);
}
