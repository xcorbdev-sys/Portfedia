import "server-only";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

/**
 * Sections an admin can switch off (Admin → Sections). A switched-off section disappears everywhere:
 * its pages return 404, links leave the menus and footer, related parts of other pages are hidden and
 * its background jobs stop. For People and Companies the lists switch off; profile and company pages stay
 * reachable, since they are the encyclopedia itself.
 */
export const FEATURES = {
  search: { label: "Search", href: "/search", footer: "", info: "The search page, the search box in the header and the big search box on the home page." },
  people: { label: "People", href: "/people", footer: "People", info: "The people list, its menu links and the People tab on the home page. Profiles stay reachable." },
  companies: { label: "Companies", href: "/companies", footer: "Companies", info: "The companies list, its menu links and the Companies tab on the home page. Company pages stay reachable." },
  saas: { label: "SaaS projects", href: "/saas", footer: "SaaS Projects", info: "The SaaS section, SaaS pages in lists and the SaaS option when creating a page." },
  launches: { label: "Launches", href: "/launches", footer: "Launches", info: "The weekly launch board, upvotes and launch notes on SaaS pages." },
  education: { label: "Education", href: "/education", footer: "Education", info: "The list of universities and schools." },
  sectors: { label: "Sectors", href: "/sectors", footer: "Sectors", info: "The sectors page." },
  jobs: { label: "Jobs", href: "/jobs", footer: "Jobs", info: "Job listings, job pages, saved jobs, job alert emails and the jobs part of company pages." },
  events: { label: "Events", href: "/events", footer: "Events", info: "The events list and \"I'm going\" on event pages." },
  investors: { label: "Investors", href: "/investors", footer: "Investors", info: "The investors list." },
  raising: { label: "Raising now", href: "/raising", footer: "Raising now", info: "Fundraising details on company pages, the Raising now list and its notifications." },
  mentors: { label: "Mentors", href: "/mentors", footer: "Mentors", info: "The mentors list." },
  updates: { label: "Company updates", href: "", footer: "", info: "Short news posts on company and SaaS pages." },
  messages: { label: "Messages and introductions", href: "", footer: "", info: "Private messages between members (with requests, blocking and reporting) and introductions through a shared connection." },
  communities: { label: "Sector communities", href: "", footer: "", info: "A page per sector where members join and post, with the sector's people, companies and jobs." },
  wins: { label: "Wins wall", href: "/wins", footer: "Wins", info: "Members share new jobs, promotions, graduations and other milestones; others congratulate them." },
  cities: { label: "Cities", href: "/cities", footer: "Cities", info: "City pages that list the people, companies, SaaS projects and events of each city." },
  blog: { label: "Blog", href: "/blog", footer: "Blog", info: "The editorial blog written by admins." },
  feeds: { label: "RSS feeds", href: "/feeds", footer: "RSS", info: "RSS feeds of new people, companies, SaaS projects, jobs, launches and blog posts." },
  help: { label: "Help center", href: "/help", footer: "Help", info: "The help articles." },
} as const;

export type FeatureKey = keyof typeof FEATURES;
export type FeatureMap = Record<FeatureKey, boolean>;

const ALL_ON = Object.fromEntries(Object.keys(FEATURES).map((k) => [k, true])) as FeatureMap;

/** Which sections are on (everything is on until an admin switches something off). Cached briefly. */
export const getFeatures = unstable_cache(
  async (): Promise<FeatureMap> => {
    const { getMeta } = await import("./maintenance");
    const saved = (await getMeta<Partial<FeatureMap>>("features")) ?? {};
    return { ...ALL_ON, ...Object.fromEntries(Object.entries(saved).filter(([k]) => k in FEATURES)) } as FeatureMap;
  },
  ["features"],
  { revalidate: 300, tags: ["features"] },
);

export async function featureOn(key: FeatureKey): Promise<boolean> {
  return (await getFeatures())[key];
}

/** For pages of a section: 404 when the section is switched off. */
export async function requireFeature(key: FeatureKey): Promise<void> {
  if (!(await featureOn(key))) notFound();
}

export async function saveFeatures(map: Partial<FeatureMap>): Promise<void> {
  const { setMeta } = await import("./maintenance");
  const clean = Object.fromEntries(Object.keys(FEATURES).map((k) => [k, map[k as FeatureKey] !== false]));
  await setMeta("features", clean);
}
