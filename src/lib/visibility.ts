import type { PageStatus, PageType } from "./types";

/** Statuses that are never shown to the public (person profiles awaiting or failing review). */
export const HIDDEN_STATUSES: PageStatus[] = ["pending", "rejected"];

/** MongoDB filter fragment: only pages the public may see. */
export const PUBLIC_FILTER = { status: { $nin: HIDDEN_STATUSES } } as const;

export function isPublic(page: { status: PageStatus }): boolean {
  return !HIDDEN_STATUSES.includes(page.status);
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
