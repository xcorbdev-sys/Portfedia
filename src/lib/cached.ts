import "server-only";
import { unstable_cache } from "next/cache";
import {
  getAlumni, getAlumniEmployers, getBacklinks, getInvestments, getOrgRelations, getOrgSpans, getPeopleOfOrg, homeData, listJobs, listSectors, sitemapPart, sitemapPartCount,
} from "./pages";
import { listCollections } from "./collections";

/**
 * Server-side caches for heavy aggregate queries (#39, #81).
 *
 * Why unstable_cache and not "use cache" (#40): "use cache" requires Cache Components, which streams
 * every page. With streaming, notFound() and redirect() can no longer set HTTP status codes
 * (404s become soft 200s, server redirects become client-side ones that the nonce-based CSP blocks).
 * unstable_cache is still supported in Next.js 16; switching is a one-file change once that is solved.
 *
 * Profile pages always read fresh data. Organization data is tagged "org:<slug>" and expired
 * immediately on every change (see revalidate.ts); the lists below may lag by up to `revalidate`.
 */
export const cachedHomeData = unstable_cache(homeData, ["home-data"], { revalidate: 60, tags: ["lists"] });
export const cachedSectors = unstable_cache(listSectors, ["sectors"], { revalidate: 300, tags: ["lists"] });
export const cachedCollections = unstable_cache(() => listCollections(false), ["collections-public"], { revalidate: 60, tags: ["lists", "collections"] });
export const cachedJobs = unstable_cache(() => listJobs(), ["jobs"], { revalidate: 60, tags: ["lists", "jobs"] });
export const cachedSitemapCount = unstable_cache(sitemapPartCount, ["sitemap-count"], { revalidate: 600 });
export const cachedSitemapPart = unstable_cache((part: number) => sitemapPart(part), ["sitemap-part"], { revalidate: 600 });

/** Everything an organization page derives from other pages, in one cached call (#39). */
export function cachedOrgDerived(slug: string, isSchool: boolean) {
  return unstable_cache(
    async () => {
      const [backlinks, people, alumni, investments, relations, spans, alumniEmployers] = await Promise.all([
        getBacklinks(slug),
        getPeopleOfOrg(slug),
        isSchool ? getAlumni(slug) : Promise.resolve([]),
        getInvestments(slug),
        getOrgRelations(slug),
        getOrgSpans(slug),
        isSchool ? getAlumniEmployers(slug) : Promise.resolve([]),
      ]);
      return { backlinks, people, alumni, investments, relations, spans, alumniEmployers };
    },
    ["org-derived", slug, String(isSchool)],
    { revalidate: 120, tags: [`org:${slug}`] },
  )();
}
