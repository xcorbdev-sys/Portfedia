import { revalidatePath as nextRevalidatePath, revalidateTag } from "next/cache";

/**
 * revalidatePath plus the explicit cache tags behind that page (#39): organization pages read
 * cached people/investment/relationship data tagged "org:<slug>", which must expire immediately
 * when something on the page changes.
 */
export function revalidatePath(path: string) {
  nextRevalidatePath(path);
  const m = path.match(/^\/org\/([a-z0-9-]+)/);
  if (m) expireOrg(m[1]);
}

export function expireOrg(slug: string) {
  try {
    revalidateTag(`org:${slug}`, { expire: 0 });
  } catch {
    /* outside a request (e.g. background job): the time-based expiry still applies */
  }
}
