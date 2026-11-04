"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, isModerator, safeNext } from "../auth";
import { decideApplication, getOwnerContact } from "../pages";
import { sendEmail } from "../email";
import { notify } from "../notifications";
import { siteUrl } from "../site";
import type { PageDoc } from "../types";
import { bool, str } from "../validate";

async function moderator() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!isModerator(user)) throw new Error("Only moderators can review applications");
  return user;
}

async function notifyOwner(page: PageDoc) {
  if (page.ownerId) {
    await notify([page.ownerId], {
      type: "application",
      text: page.status === "published" ? "Your profile was approved and is now live." : `Your profile needs changes: ${page.review.note}`,
      href: page.status === "published" ? `/${page.slug}` : "/edit",
      pageId: page._id,
    });
  }
  const owner = await getOwnerContact(page.ownerId);
  if (!owner?.notify) return;
  const first = owner.name.split(" ")[0];
  const url = `${siteUrl()}/${page.slug}`;
  if (page.status === "published") {
    await sendEmail({
      to: owner.email,
      subject: "Your Portfedia profile is live 🎉",
      lines: [`Hi ${first},`, "Good news: your profile was approved and is now public. Share the link with your network!"],
      button: { label: "View your profile", url },
      preferencesNote: true,
    });
  } else {
    await sendEmail({
      to: owner.email,
      subject: "Your Portfedia profile needs a few changes",
      lines: [
        `Hi ${first},`,
        "We reviewed your profile and couldn't publish it yet.",
        `Feedback from our team: ${page.review.note}`,
        "Update your profile and save it; it will automatically go back to review.",
      ],
      button: { label: "Update your profile", url: `${siteUrl()}/edit` },
      preferencesNote: true,
    });
  }
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
  if (page) {
    revalidate(page.slug, [...page.experiences.map((e) => e.orgSlug), ...page.educations.map((e) => e.schoolSlug)]);
    await notifyOwner(page);
  }
  redirect(safeNext(fd.get("back"), "/admin"));
}

export async function rejectApplicationAction(fd: FormData): Promise<void> {
  const user = await moderator();
  const slug = str(fd.get("slug"), 100);
  const note = str(fd.get("note"), 1000) || "Your profile does not meet our guidelines yet.";
  const page = await decideApplication(user, slug, { approve: false, note });
  if (page) {
    revalidate(page.slug, []);
    await notifyOwner(page);
  }
  redirect(safeNext(fd.get("back"), "/admin"));
}
