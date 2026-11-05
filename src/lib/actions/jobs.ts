"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "../auth";
import { addAlert, deleteAlert, restoreAlert, toggleSavedJob } from "../job-tools";
import { JOB_TYPES, LEVELS, WORKPLACES } from "../jobs";
import { str } from "../validate";
import { rateLimit } from "../rate-limit";
import { featureOn } from "../features";


export async function toggleSavedJobAction(fd: FormData): Promise<void> {
  if (!(await featureOn("jobs"))) redirect("/"); // section switched off
  const org = str(fd.get("org"), 120);
  const id = str(fd.get("id"), 20);
  const back = safeNext(fd.get("back"), `/jobs/${org}/${id}`);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);
  if (await rateLimit(`savejob:${user.id}`, 120, 3600_000)) await toggleSavedJob(user.id, org, id);
  redirect(back);
}

const pick = (list: readonly string[], v: unknown) => (list.includes(String(v ?? "")) ? String(v) : "");

export async function createJobAlertAction(fd: FormData): Promise<void> {
  if (!(await featureOn("jobs"))) redirect("/"); // section switched off
  const user = await getCurrentUser();
  const filters = {
    q: str(fd.get("q"), 80),
    type: pick(JOB_TYPES, fd.get("type")),
    workplace: pick(WORKPLACES, fd.get("workplace")),
    level: pick(LEVELS, fd.get("level")),
    location: str(fd.get("location"), 120),
    sector: str(fd.get("sector"), 80),
  };
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
  if (!user) redirect(`/login?next=${encodeURIComponent(`/jobs${qs.size ? `?${qs}` : ""}`)}`);
  const err = await addAlert(user.id, filters);
  redirect(`/jobs/alerts?${err ? `error=${encodeURIComponent(err)}` : "created=1"}`);
}

export async function deleteJobAlertAction(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/jobs/alerts");
  const id = str(fd.get("id"), 40);
  await deleteAlert(user.id, id);
  redirect(`/jobs/alerts?deleted=${encodeURIComponent(id)}`);
}

/** #44: undo a deleted alert. */
export async function restoreJobAlertAction(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/jobs/alerts");
  await restoreAlert(user.id, str(fd.get("id"), 40));
  redirect("/jobs/alerts?restored=1");
}
