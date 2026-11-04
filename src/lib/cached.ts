import "server-only";
import { unstable_cache } from "next/cache";
import { allSlugsForSitemap, homeData, listJobs, listSectors } from "./pages";
import { listCollections } from "./collections";

/**
 * Short-lived server-side caches for the heaviest public aggregate queries (#81).
 * Individual profile and company pages always read fresh data, so owners see their edits at once;
 * lists like these may lag behind by up to the revalidate time.
 */
export const cachedHomeData = unstable_cache(homeData, ["home-data"], { revalidate: 60 });
export const cachedSectors = unstable_cache(listSectors, ["sectors"], { revalidate: 300 });
export const cachedCollections = unstable_cache(() => listCollections(false), ["collections-public"], { revalidate: 60 });
export const cachedJobs = unstable_cache(() => listJobs(), ["jobs"], { revalidate: 60 });
export const cachedSitemap = unstable_cache(allSlugsForSitemap, ["sitemap"], { revalidate: 600 });
