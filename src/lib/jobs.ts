/** Shared job listing values (form, filters, structured data). */
export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Temporary"] as const;
export const WORKPLACES = ["On-site", "Hybrid", "Remote"] as const;
export const LEVELS = ["Internship", "Entry level", "Mid level", "Senior", "Lead / Manager", "Executive"] as const;
export const CURRENCIES = ["USD", "EUR", "GBP", "TRY"] as const;
export const SALARY_PERIODS = ["year", "month", "hour"] as const;

/** A listing stays on the site (and in Google for Jobs) for 60 days after it is posted or updated. */
export const JOB_DAYS = 60;

/** schema.org employmentType for Google for Jobs */
export const EMPLOYMENT_TYPE: Record<string, string> = {
  "Full-time": "FULL_TIME",
  "Part-time": "PART_TIME",
  Contract: "CONTRACTOR",
  Internship: "INTERN",
  Temporary: "TEMPORARY",
};

export function salaryText(j: { salaryMin?: number | null; salaryMax?: number | null; currency?: string; salaryPeriod?: string }): string {
  if (!j.salaryMin && !j.salaryMax) return "";
  const f = (n: number) => n.toLocaleString("en-US");
  const range = j.salaryMin && j.salaryMax ? `${f(j.salaryMin)}–${f(j.salaryMax)}` : f((j.salaryMin || j.salaryMax)!);
  return `${j.currency || "USD"} ${range} / ${j.salaryPeriod || "year"}`;
}
