import { unstable_cache } from "next/cache";
/**
 * Operator details shown on the legal pages, the legal notice (künye/impressum) and in emails.
 * Everything comes from environment variables so the owner can fill them in on Coolify.
 * Fields that are empty are simply not shown.
 */
export const LEGAL_UPDATED = "4 November 2026";
export const LEGAL_UPDATED_TR = "4 Kasım 2026";

/**
 * #94: version of the Terms of Use and Privacy Policy. When they change materially, an admin presses
 * "Ask everyone to accept" in Admin → Sections (or TERMS_VERSION is set, e.g. "2027-03-01"): every member is
 * asked to accept the new version the next time they open the site. Accounts that existed before versioning
 * count as having accepted TERMS_BASELINE. Versions are ISO dates/times, so they compare as text.
 */
export const TERMS_BASELINE = "2026-11-04";

async function current(): Promise<{ version: string; changes: string }> {
  const { getMeta } = await import("./maintenance");
  const saved = await getMeta<{ version: string; changes: string }>("terms").catch(() => null);
  const env = (process.env.TERMS_VERSION ?? "").trim();
  const version = [saved?.version ?? "", env, TERMS_BASELINE].sort().pop()!;
  return { version, changes: version === saved?.version ? saved.changes : (process.env.TERMS_CHANGES ?? "").trim() };
}
const cachedTerms = unstable_cache(current, ["terms"], { revalidate: 300, tags: ["terms"] });
export const termsVersion = async () => (await cachedTerms()).version;
export const termsChanges = async () => (await cachedTerms()).changes;

export function operator() {
  const env = (k: string) => (process.env[k] ?? "").trim();
  return {
    name: env("COMPANY_NAME") || "Portfedia",
    address: env("COMPANY_ADDRESS"),
    email: env("CONTACT_EMAIL") || "hello@portfedia.com",
    phone: env("COMPANY_PHONE"),
    /** Turkish central registry number (MERSİS) */
    mersis: env("COMPANY_MERSIS"),
    /** e.g. "Kadıköy Vergi Dairesi 1234567890" */
    tax: env("COMPANY_TAX"),
    /** e.g. "İstanbul Ticaret Sicili 123456" */
    registry: env("COMPANY_REGISTRY"),
    /** Registered electronic mail (KEP) address */
    kep: env("COMPANY_KEP"),
    /** GDPR Art. 27 representative in the EU, if appointed: "Name, address, email" */
    euRepresentative: env("EU_REPRESENTATIVE"),
  };
}

/** How long each kind of data is kept. Used by the privacy pages so text and code stay in sync. */
export const RETENTION = {
  loginLogDays: 365,
  reportsYears: 3,
  backupsDays: 30,
  imageTrashDays: 90,
} as const;
