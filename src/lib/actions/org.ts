"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, rotateSession } from "../auth";
import { getPageBySlug } from "../pages";
import { confirmOrgClaim, decidePosition, removeOrgAdmin, requestOrgClaim, requestWorkVerification } from "../org-admin";
import { email as cleanEmail, str } from "../validate";
import { rateLimit } from "../rate-limit";
import type { FormState } from "./auth";

async function verifiedUser(next: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function claimOrgAction(_: FormState, fd: FormData): Promise<FormState> {
  const slug = str(fd.get("slug"), 100);
  const user = await verifiedUser(`/org/${slug}/claim`);
  if (!user.emailVerified) return { error: "Please confirm your account email first." };
  const page = await getPageBySlug(slug, ["org", "school"]);
  if (!page) return { error: "Page not found." };
  const workEmail = cleanEmail(fd.get("email"));
  if (!workEmail) return { error: "Please enter a valid email address." };
  if (!(await rateLimit(`claim:${user.id}`, 5, 3600_000))) return { error: "Too many attempts. Please try again later." };
  const err = await requestOrgClaim(user, page, workEmail);
  return err ? { error: err } : { ok: `We sent a confirmation link to ${workEmail}. Open it while signed in to finish.` };
}

export async function confirmClaimAction(fd: FormData): Promise<void> {
  const token = String(fd.get("token") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const res = await confirmOrgClaim(user, token);
  if (res.error || !res.slug) redirect(`/?claim=failed`);
  await rotateSession(user.id); // new privileges → new session token
  revalidatePath(`/org/${res.slug}`);
  redirect(`/org/${res.slug}/manage?claimed=1`);
}

export async function inviteOrgAdminAction(_: FormState, fd: FormData): Promise<FormState> {
  const slug = str(fd.get("slug"), 100);
  const user = await verifiedUser(`/org/${slug}/manage`);
  const page = await getPageBySlug(slug, ["org", "school"]);
  if (!page) return { error: "Page not found." };
  const isMod = user.role === "admin" || user.role === "moderator";
  if (!isMod && !page.orgAdmins.includes(user.id)) return { error: "Only this organization's admins can invite others." };
  const workEmail = cleanEmail(fd.get("email"));
  if (!workEmail) return { error: "Please enter a valid email address." };
  if (!(await rateLimit(`invite:${user.id}`, 10, 3600_000))) return { error: "Too many invitations. Please try again later." };
  const err = await requestOrgClaim(user, page, workEmail, user.name);
  return err ? { error: err } : { ok: `Invitation sent to ${workEmail}.` };
}

export async function removeOrgAdminAction(fd: FormData): Promise<void> {
  const slug = str(fd.get("slug"), 100);
  const user = await verifiedUser(`/org/${slug}/manage`);
  await removeOrgAdmin(user, slug, str(fd.get("userId"), 40));
  revalidatePath(`/org/${slug}`);
  redirect(user.id === str(fd.get("userId"), 40) ? `/org/${slug}` : `/org/${slug}/manage`);
}

export async function decidePositionAction(fd: FormData): Promise<void> {
  const slug = str(fd.get("org"), 100);
  const user = await verifiedUser(`/org/${slug}/manage`);
  const org = await getPageBySlug(slug, ["org", "school"]);
  if (!org) redirect("/");
  const decision = fd.get("decision");
  const value = decision === "verified" || decision === "rejected" ? decision : "unverified";
  const person = str(fd.get("person"), 100);
  await decidePosition(user, org, person, Number(fd.get("index")), value);
  revalidatePath(`/org/${slug}`);
  revalidatePath(`/${person}`);
  redirect(`/org/${slug}/manage#people`);
}

export async function requestWorkVerificationAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await verifiedUser("/account#positions");
  if (!(await rateLimit(`workverify:${user.id}`, 10, 3600_000))) return { error: "Too many attempts. Please try again later." };
  const workEmail = cleanEmail(fd.get("email"));
  if (!workEmail) return { error: "Please enter a valid email address." };
  const err = await requestWorkVerification(user, Number(fd.get("index")), workEmail);
  return err ? { error: err } : { ok: `We sent a link to ${workEmail}. Your position is verified when you open it.` };
}
