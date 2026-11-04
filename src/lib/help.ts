/** Help center articles (#91). Written in Markdown and rendered with the same safe renderer as pages. */
export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  body: string;
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    summary: "Create your profile and get it published.",
    body: `Portfedia is a living encyclopedia of the business world. Everyone can have one profile page about themselves.

## Create your profile
1. [Sign up](/signup) with your email, Google or LinkedIn.
2. Fill in the profile wizard: photo, headline, positions, education and a short biography.
3. Submit it. Our moderators review every new profile, usually within a few days.

## After approval
Your page is public and can appear in search engines. You can edit it at any time; changes to approved pages are visible right away and are kept in the page history.`,
  },
  {
    slug: "verification",
    title: "How verification works",
    summary: "What the ✓ next to a position means.",
    body: `A position or degree gets a ✓ when the other side confirms it.

## Confirmed by the organization
Admins of an organization's page can verify the people who list it on their profile.

## Confirmed with a work email
You can also verify a position yourself by confirming an address at the company's domain from [Verify work](/verify-work).

Unverified entries are still shown, without the ✓. Rejected entries are hidden from the organization's page.`,
  },
  {
    slug: "claim-a-company",
    title: "Claiming a company page",
    summary: "Manage your organization's page with a company email.",
    body: `Organizations are claimed by people who work there.

## Requirements
- An email address at the organization's own website domain. Free email providers can't be used.
- The organization's page must list its website.

## Steps
Open the organization's page, choose **Claim this page** and enter your work email. Click the link we send you and you become an admin. Admins can invite colleagues with the same domain.`,
  },
  {
    slug: "editing-and-history",
    title: "Editing and page history",
    summary: "Who can edit what, and how to undo changes.",
    body: `People edit their own profile. Organization pages are edited by their admins and by signed-in members, depending on the page's protection.

Every save creates a revision. Open **History** on any page to compare versions; moderators can restore an earlier one.`,
  },
  {
    slug: "reporting",
    title: "Reporting a problem",
    summary: "Wrong information, impersonation or copyright issues.",
    body: `Use **Report** on any page, or the [report form](/report). Tell us what is wrong and, if you can, give a source.

For copyright claims, see the [copyright page](/copyright). If your account was suspended and you think it's a mistake, use the [appeal form](/appeal).`,
  },
  {
    slug: "privacy-and-deletion",
    title: "Privacy and deleting your account",
    summary: "Control what is public and remove your data.",
    body: `From [Account settings](/account) you can change your email, password, profile address and notification settings, sign out other devices and download your data.

**Delete account** removes your user, your profile, its revisions, your follows and your sessions. Read the [privacy policy](/privacy) for details.`,
  },
  {
    slug: "style-guide",
    title: "Style guide",
    summary: "How to write a good Portfedia page.",
    body: `Pages read like a short encyclopedia entry, not an advertisement.

## Tone
- Write in the third person: “Jane leads product at Acme”, not “I lead product”.
- Be neutral. Avoid words like *best*, *leading*, *world-class* unless a source says so.
- Prefer facts with dates: “Founded in 2014 in Berlin.”

## Structure
- Start with one or two sentences that say who or what this is.
- Use \`## Headings\` for longer sections such as *Career* or *History*.
- Link other pages with double brackets: \`[[Acme Software]]\`.

## What not to add
- Private contact details of other people.
- Unverifiable claims, rumours or confidential information.
- Copied text from other websites.`,
  },
];

export const helpArticle = (slug: string) => HELP_ARTICLES.find((a) => a.slug === slug) ?? null;
