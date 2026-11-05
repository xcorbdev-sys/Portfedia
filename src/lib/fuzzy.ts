/**
 * Typo-tolerant matching (#36). Pure functions, unit-tested. Text is compared after searchKey(),
 * so Turkish letters already match their plain forms (ş = s, ı = i, ğ = g…).
 */

/** Optimal string alignment distance (Levenshtein plus swapped neighbours), stopping early above `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j]!;
    prev = cur;
  }
  return prev[b.length]!;
}

/** How many typos a word of this length may have. */
export const allowedTypos = (len: number) => (len <= 3 ? 0 : len <= 6 ? 1 : 2);

/**
 * Scores a title against a query, both already normalised with searchKey (lower case, ASCII, spaces).
 * Every query word must match some title word (exactly, as a prefix, or within the allowed typos).
 * Returns null when it doesn't match; lower is better.
 */
export function fuzzyScore(query: string, title: string): number | null {
  const qw = query.split(" ").filter(Boolean);
  const tw = title.split(" ").filter(Boolean);
  if (!qw.length || !tw.length) return null;
  let total = 0;
  for (let i = 0; i < qw.length; i++) {
    const q = qw[i]!;
    const last = i === qw.length - 1;
    let best = Infinity;
    for (const t of tw) {
      if (t === q) best = 0;
      else if (last && t.startsWith(q)) best = Math.min(best, 0.5);
      else {
        const max = allowedTypos(q.length);
        if (!max) continue;
        // The last word may still be being typed: compare with the same-length start of the title word too
        const d = Math.min(editDistance(q, t, max), last && t.length > q.length ? editDistance(q, t.slice(0, q.length), max) + 0.5 : Infinity);
        if (d <= max) best = Math.min(best, d);
      }
      if (best === 0) break;
    }
    if (best === Infinity) return null;
    total += best;
  }
  return total;
}
