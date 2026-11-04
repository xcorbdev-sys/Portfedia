/** Reads list search parameters and builds the address of the same list (for pagination). */
export function listParams(sp: Record<string, string | undefined>, keys: string[]) {
  const values = Object.fromEntries(keys.map((k) => [k, (sp[k] ?? "").trim().slice(0, 80)])) as Record<string, string>;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const href = (base: string) => {
    const q = new URLSearchParams(Object.entries(values).filter(([, v]) => v));
    return q.size ? `${base}?${q}` : base;
  };
  return { values, page, href };
}

export const SORTS = [
  { value: "recent", label: "Newest" },
  { value: "name", label: "Name (A–Z)" },
];
