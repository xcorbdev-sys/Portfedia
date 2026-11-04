/** Pure content rules shared by the client and the server (unit tested). */

/* ───────────── Password strength (no external library) ───────────── */

const COMMON = new Set([
  "password", "password1", "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop", "11111111", "iloveyou",
  "sunshine", "princess", "football", "baseball", "welcome1", "admin123", "letmein1", "portfedia", "sifre123", "parola123",
]);

export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; tip: string } {
  if (!pw) return { score: 0, label: "", tip: "" };
  if (pw.length < 8) return { score: 0, label: "Too short", tip: "Use at least 8 characters." };
  if (COMMON.has(pw.toLowerCase()) || /^(.)\1+$/.test(pw)) return { score: 0, label: "Very weak", tip: "This password is too common." };
  let variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/\d/.test(pw)) variety++;
  if (/[^A-Za-z0-9]/.test(pw)) variety++;
  let score = (pw.length >= 12 ? 2 : 1) + (variety >= 3 ? 1 : 0) + (pw.length >= 16 || (pw.length >= 12 && variety === 4) ? 1 : 0);
  if (/^(?:\d+|[a-z]+)$/i.test(pw) && pw.length < 14) score = Math.min(score, 1);
  if (pw.length >= 20) score = 4; // long passphrases are strong even with few character types
  const s = Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;
  const labels = { 1: "Weak", 2: "Fair", 3: "Good", 4: "Strong" } as const;
  const tip = s < 3 ? "Longer is better: try a short sentence or mix letters, numbers and symbols." : "";
  return { score: s, label: labels[s], tip };
}

/* ───────────── Offensive language ───────────── */

// Clear profanity and slurs (EN + TR). Matched as whole words after normalisation.
const OFFENSIVE = [
  "fuck", "fucking", "motherfucker", "shit", "bullshit", "cunt", "bitch", "asshole", "dickhead", "wanker", "whore", "slut",
  "retard", "faggot", "nigger", "nigga", "kike", "spic", "chink", "tranny",
  "amk", "aq", "orospu", "orospu cocugu", "pic", "piç", "sikik", "siktir", "sikerim", "yarrak", "yarak", "gotveren", "göt", "got lalesi",
  "ibne", "kahpe", "pezevenk", "serefsiz", "şerefsiz", "gerizekali", "gerizekalı", "salak", "aptal", "mal",
];

const norm = (s: string) =>
  s
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c] ?? c)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const PATTERNS = [...new Set(OFFENSIVE.map(norm))].map((w) => ({ word: w, rx: new RegExp(`(^| )${w.replace(/ /g, " ")}( |$)`) }));

/** Returns the offensive words found (empty array when the text is fine). */
export function findOffensive(...texts: (string | undefined | null)[]): string[] {
  const t = ` ${norm(texts.filter(Boolean).join(" "))} `;
  return PATTERNS.filter((p) => p.rx.test(t)).map((p) => p.word);
}

/* ───────────── Links ───────────── */

export function externalLinks(...texts: (string | undefined | null)[]): string[] {
  const out = new Set<string>();
  for (const t of texts) for (const m of (t ?? "").matchAll(/https?:\/\/[^\s)<>"\]]+/gi)) out.add(m[0].replace(/[.,;:!?]+$/, "").toLowerCase());
  return [...out];
}
