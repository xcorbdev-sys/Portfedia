/**
 * Profile templates (#47): a starting structure for the biography of common profiles. Lines starting
 * with ✎ are hints; a profile can't be saved while they are still there.
 */
export const TEMPLATE_HINT = "✎";

export interface ProfileTemplate { key: string; label: string; occupation: string; summary: string; body: string }

const h = (s: string) => `${TEMPLATE_HINT} ${s}`;

export const PROFILE_TEMPLATES: ProfileTemplate[] = [
  {
    key: "founder",
    label: "Founder",
    occupation: "e.g. Founder & CEO of Acme",
    summary: "e.g. Founder of Acme, building software for logistics teams.",
    body: [
      "## Background", h("Where you studied and worked before starting your company."), "",
      "## Founding [[Your company]]", h("When and why you started it, the problem it solves, the first customers."), "",
      "## Milestones", h("Funding rounds, launches, team size, notable customers or partners."), "",
      "## Other activities", h("Angel investments, boards, mentoring, talks."),
    ].join("\n"),
  },
  {
    key: "executive",
    label: "Executive",
    occupation: "e.g. Chief Financial Officer at Acme",
    summary: "e.g. Finance executive with 15 years in banking and technology.",
    body: [
      "## Career", h("Your path to your current role: companies, positions and what you were responsible for."), "",
      "## Current role", h("What you lead at your organization and the size of your team."), "",
      "## Board and advisory roles", h("Boards, committees and advisory positions."),
    ].join("\n"),
  },
  {
    key: "investor",
    label: "Investor",
    occupation: "e.g. Partner at Acme Ventures",
    summary: "e.g. Early-stage investor focused on fintech and B2B software.",
    body: [
      "## Investment focus", h("Stages, sectors, regions and typical ticket size."), "",
      "## Background", h("Your operating or investing experience before this role."), "",
      "## Portfolio", h("Notable investments, linked as [[Company name]]."),
    ].join("\n"),
  },
  {
    key: "engineer",
    label: "Engineer",
    occupation: "e.g. Senior Software Engineer",
    summary: "e.g. Backend engineer working on payments infrastructure.",
    body: [
      "## Work", h("What you build, the technologies you use and the teams you've been part of."), "",
      "## Projects", h("Products, open-source projects or systems you're proud of."), "",
      "## Education", h("Degrees, courses or certifications."),
    ].join("\n"),
  },
  {
    key: "student",
    label: "Student or graduate",
    occupation: "e.g. Computer Engineering student",
    summary: "e.g. Final-year engineering student interested in AI and product.",
    body: [
      "## Studies", h("Your school, field and main interests."), "",
      "## Experience", h("Internships, part-time jobs, clubs and volunteering."), "",
      "## Looking for", h("The kind of roles or projects you'd like to join."),
    ].join("\n"),
  },
];

/** Text still containing template hints. */
export const hasTemplateHints = (text: string) => text.split("\n").some((l) => l.trim().startsWith(TEMPLATE_HINT));
