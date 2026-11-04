/**
 * Free, self-hosted bot protection for public forms (no third-party service):
 *  - a honeypot field humans never see or fill in
 *  - a minimum time between rendering the form and submitting it
 */
export const HONEYPOT_FIELD = "company_website";
export const STARTED_FIELD = "form_started";
const MIN_MS = 2500;
const MAX_MS = 24 * 3600_000;

export function looksLikeBot(fd: FormData, now = Date.now()): boolean {
  const honeypot = String(fd.get(HONEYPOT_FIELD) ?? "");
  if (honeypot.trim() !== "") return true;
  const started = Number(fd.get(STARTED_FIELD));
  if (!Number.isFinite(started)) return true;
  const elapsed = now - started;
  return elapsed < MIN_MS || elapsed > MAX_MS;
}
