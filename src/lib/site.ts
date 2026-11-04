export function siteUrl(): string {
  return (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

const fmt = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" });
const fmtTime = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const formatDate = (d: Date | string) => fmt.format(new Date(d));
export const formatDateTime = (d: Date | string) => fmtTime.format(new Date(d));

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase("tr-TR"))
    .join("");

/** Plain-text excerpt of Markdown for meta descriptions */
export function plainExcerpt(md: string, max = 180): string {
  const text = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s.*$/gm, " ")
    .replace(/[*_`>#~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max - 1).replace(/\s\S*$/, "") + "…" : text;
}
