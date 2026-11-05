const TR_MAP: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i", ö: "o", Ö: "o",
  ş: "s", Ş: "s", ü: "u", Ü: "u", â: "a", Â: "a", î: "i", Î: "i", û: "u", Û: "u",
};

/** "Ayşe Demir" -> "ayse-demir". Used in URLs; the original title is kept for display. */
export function slugify(input: string): string {
  return input
    .replace(/[çÇğĞıIİöÖşŞüÜâÂîÎûÛ]/g, (ch) => TR_MAP[ch] ?? ch)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Normalised search key: "Ayşe Demir" -> "ayse demir" */
export function searchKey(input: string): string {
  return slugify(input).replace(/-/g, " ");
}

/** Root-level paths that must never collide with person page slugs. */
export const RESERVED_SLUGS = new Set([
  "org", "api", "search", "login", "signup", "logout", "edit", "account", "create",
  "people", "companies", "sectors", "collections", "random", "media", "about", "help",
  "privacy", "terms", "sitemap", "robots", "favicon", "admin", "_next", "history",
  "portfedia", "settings", "notifications", "icon", "sitemap-xml", "robots-txt",
  "forgot-password", "reset-password", "verify-email", "verify-work", "notifications", "inbox", "tag", "tags", "jobs", "org-badge", "appeal", "help", "pricing", "saas", "my-pages", "education", "raising", "launches", "mentors", "events", "investors", "status", "copyright", "report", "copyright", "report", "claim", "auth", "cities", "blog", "feeds", "embed", "communities", "alumni", "accept-terms", "messages", "manifest", "sw", "offline", "icons",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug) || slug.length < 2;
}
