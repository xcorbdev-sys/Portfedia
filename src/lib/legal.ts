/**
 * Operator details shown on the legal pages, the legal notice (künye/impressum) and in emails.
 * Everything comes from environment variables so the owner can fill them in on Coolify.
 * Fields that are empty are simply not shown.
 */
export const LEGAL_UPDATED = "4 November 2026";
export const LEGAL_UPDATED_TR = "4 Kasım 2026";

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
