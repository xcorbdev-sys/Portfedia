"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "../revalidate";
import { getCurrentUser, isModerator } from "../auth";
import { importOrganizations, type ImportResult } from "../import";
import { deleteCollection, saveCollection } from "../collections";
import { bool, httpUrl, str } from "../validate";
import { pageHref } from "../wikitext";

async function moderator() {
  const user = await getCurrentUser();
  if (!user || !isModerator(user)) redirect("/login?next=/admin");
  return user;
}

export type ImportState = { error?: string; result?: ImportResult } | undefined;

export async function importCsvAction(_: ImportState, fd: FormData): Promise<ImportState> {
  const user = await moderator();
  const file = fd.get("file");
  let text = String(fd.get("csv") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) return { error: "The file must be 2 MB or smaller." };
    text = await file.text();
  }
  if (!text.trim()) return { error: "Choose a CSV file or paste CSV text." };
  const result = await importOrganizations(user, text, bool(fd.get("overwrite")));
  revalidatePath("/companies");
  return { result };
}

/** Adds one organization from Wikidata (company facts only; people are refused). */
export async function wikidataImportAction(fd: FormData): Promise<void> {
  const user = await moderator();
  const qid = str(fd.get("qid"), 20);
  const back = (msg: string) => `/admin?section=import&wd=${encodeURIComponent(str(fd.get("wd"), 100))}&error=${encodeURIComponent(msg)}#wikidata`;
  const { fetchOrganization } = await import("../wikidata");
  const { upsertOrganization } = await import("../import");
  let parsed;
  try {
    parsed = await fetchOrganization(qid);
  } catch {
    redirect(back("Wikidata could not be reached. Please try again in a minute."));
  }
  if (!parsed.ok) redirect(back(parsed.reason));
  const o = parsed.org;
  const res = await upsertOrganization(
    user,
    {
      name: o.name,
      type: o.type === "school" ? "institution" : "company",
      sector: o.sector,
      founded: o.founded ? String(o.founded) : "",
      headquarters: o.headquarters,
      employees: o.employees,
      website: o.website,
      summary: o.summary,
    },
    { overwrite: false, editSummary: `Imported from Wikidata (${o.qid})`, source: { title: `Wikidata: ${o.name} (${o.qid})`, url: o.sourceUrl } },
  );
  if (res.status === "skipped" && !res.slug) redirect(back(res.reason));
  const href = pageHref(res.type ?? "org", res.slug!);
  revalidatePath(href);
  revalidatePath("/companies");
  redirect(`${href}?imported=${res.status}`);
}

export type CollectionState = { error?: string; ok?: string } | undefined;

export async function saveCollectionAction(_: CollectionState, fd: FormData): Promise<CollectionState> {
  const user = await moderator();
  const res = await saveCollection(user.name, {
    originalSlug: str(fd.get("originalSlug"), 120) || null,
    title: str(fd.get("title"), 120),
    description: str(fd.get("description"), 600),
    itemsText: String(fd.get("items") ?? "").slice(0, 50_000),
    published: bool(fd.get("published")),
    // #100: sponsorship is always labelled on the collection
    sponsor: str(fd.get("sponsorName"), 80) ? { name: str(fd.get("sponsorName"), 80), url: httpUrl(fd.get("sponsorUrl")) } : null,
  });
  if (res.error) return { error: res.error };
  revalidatePath("/collections");
  revalidatePath(`/collections/${res.slug}`);
  const note = res.missing?.length ? `?missing=${encodeURIComponent(res.missing.join(", "))}` : "";
  redirect(`/admin/collections/${res.slug}${note}`);
}

export async function deleteCollectionAction(fd: FormData): Promise<void> {
  await moderator();
  await deleteCollection(str(fd.get("slug"), 120));
  revalidatePath("/collections");
  redirect("/admin?section=import");
}
