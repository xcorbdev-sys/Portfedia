import type { PageDoc, PageStatus, PageType } from "./types";

/** Statuses that are never shown to the public (person profiles awaiting or failing review). */
export const HIDDEN_STATUSES: PageStatus[] = ["pending", "rejected"];

/**
 * MongoDB filter fragment for lists, search, sitemaps and other pages' sections: only published pages
 * that aren't restricted to members (#75).
 */
export const PUBLIC_FILTER = { status: { $nin: HIDDEN_STATUSES }, visibility: { $ne: "members" } } as const;

export function isPublic(page: { status: PageStatus }): boolean {
  return !HIDDEN_STATUSES.includes(page.status);
}

/** Members-only profiles: published, but only signed-in members can open them. */
export function isMembersOnly(page: { visibility?: "public" | "members" }): boolean {
  return page.visibility === "members";
}

/** Who may view a page: everyone when public, otherwise only its owner and moderators. */
export function canView(
  page: { status: PageStatus; ownerId: string | null; type: PageType },
  user: { id: string; role: "user" | "moderator" | "admin" } | null,
): boolean {
  if (isPublic(page)) return true;
  if (!user) return false;
  return user.id === page.ownerId || user.role === "admin" || user.role === "moderator";
}

/** Status a person profile gets after its owner saves it. */
export function statusAfterOwnerSave(current: PageStatus | null): PageStatus {
  if (current === null) return "pending"; // new profile = new application
  if (current === "rejected") return "pending"; // edited after rejection = resubmitted
  return current; // pending stays pending, published stays published
}

/** #45: the profile as a visitor who isn't signed in sees it (members-only parts removed). */
export function forVisitors(page: PageDoc): PageDoc {
  const hide = new Set(page.membersOnlyFields ?? []);
  if (!hide.size) return page;
  const ib = { ...page.infobox };
  if (hide.has("location")) Object.assign(ib, { location: "", birthPlace: "" });
  if (hide.has("links")) Object.assign(ib, { website: "", github: "", linkedin: "", email: "", emailPublic: false });
  if (hide.has("languages")) Object.assign(ib, { languages: "", skills: "" });
  return {
    ...page,
    infobox: ib,
    experiences: hide.has("career") ? [] : page.experiences,
    educations: hide.has("education") ? [] : page.educations,
    languageLevels: hide.has("languages") ? [] : page.languageLevels,
  };
}
