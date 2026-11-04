/** Small helpers that turn raw form input into safe, bounded values. */

export function str(v: unknown, max = 200): string {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
}

export function year(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  const max = new Date().getFullYear() + 10;
  return Number.isInteger(n) && n >= 1900 && n <= max ? n : null;
}

export function httpUrl(v: unknown): string {
  const s = str(v, 300);
  if (!s) return "";
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export function handle(v: unknown): string {
  const s = str(v, 60).replace(/^@/, "").replace(/^https?:\/\/(www\.)?[^/]+\//i, "").replace(/\/$/, "");
  return /^[A-Za-z0-9._-]{1,60}$/.test(s) ? s : "";
}

export function email(v: unknown): string {
  const s = str(v, 200).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : "";
}

export function bool(v: unknown): boolean {
  return v === "on" || v === "true" || v === true;
}
