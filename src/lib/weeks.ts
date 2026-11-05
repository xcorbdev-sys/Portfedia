/** ISO weeks for the launch board (pure functions, no database). */

/** ISO 8601 week, e.g. "2026-W45" (weeks start on Monday). */
export function isoWeek(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function previousWeek(week: string): string {
  const [y, w] = week.split("-W").map(Number);
  // Thursday of that ISO week, minus 7 days
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const monday = new Date(jan4.getTime() - ((jan4.getUTCDay() || 7) - 1) * 86400000 + (w - 1) * 7 * 86400000);
  return isoWeek(new Date(monday.getTime() - 7 * 86400000));
}

export const validWeek = (w: string) => /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(w);

