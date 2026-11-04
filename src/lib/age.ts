export const MIN_AGE = 16;

/**
 * Neutral age screen: we ask for the birth year (not "are you over 16?") and never store it.
 * People who turn 16 during the current year are accepted.
 */
export function isOldEnough(birthYear: unknown, now = new Date()): boolean {
  const y = typeof birthYear === "number" ? birthYear : parseInt(String(birthYear ?? ""), 10);
  if (!Number.isInteger(y) || y < 1900 || y > now.getFullYear()) return false;
  return now.getFullYear() - y >= MIN_AGE;
}
