/** The site owner is always an admin, even when ADMIN_EMAILS is not set on the server. */
export const OWNER_EMAILS = ["hakanyetislt@gmail.com"];

/** Owner addresses plus the comma-separated ADMIN_EMAILS environment variable, lower-cased. */
export function adminEmailList(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return [...new Set([...OWNER_EMAILS, ...fromEnv])];
}
