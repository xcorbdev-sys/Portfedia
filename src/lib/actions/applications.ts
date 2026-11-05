"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "../auth";
import { featureOn } from "../features";
import { apply, setStage, withdraw } from "../applications";
import { str } from "../validate";

export async function applyAction(fd: FormData): Promise<void> {
  if (!(await featureOn("jobs"))) redirect("/");
  const org = str(fd.get("org"), 120);
  const id = str(fd.get("id"), 20);
  const back = `/jobs/${org}/${id}`;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);
  if (fd.get("consent") !== "on") redirect(`${back}?applyError=${encodeURIComponent("Please confirm that your profile can be shared with the company.")}#apply`);
  const e = await apply(user, org, id, str(fd.get("note"), 3000));
  redirect(e ? `${back}?applyError=${encodeURIComponent(e)}#apply` : `${back}?applied=1#apply`);
}

export async function withdrawApplicationAction(fd: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/jobs/applications");
  await withdraw(user, str(fd.get("id"), 40));
  redirect("/jobs/applications?withdrawn=1");
}

export async function setStageAction(fd: FormData): Promise<void> {
  const org = str(fd.get("org"), 120);
  const job = str(fd.get("job"), 20);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/org/${org}/applicants`);
  const e = await setStage(user, org, str(fd.get("id"), 40), str(fd.get("stage"), 20), fd.has("companyNote") ? str(fd.get("companyNote"), 2000) : undefined);
  const qs = new URLSearchParams({ ...(job ? { job } : {}), ...(e ? { error: e } : { saved: Date.now().toString(36) }) });
  redirect(`/org/${org}/applicants?${qs}`);
}
