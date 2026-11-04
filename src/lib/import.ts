import "server-only";
import { connectDB } from "./db";
import { Page, Revision } from "./models";
import { csvRecords } from "./csv";
import { ensureOrgPage } from "./pages";
import { extractWikiLinks } from "./wikitext";
import { httpUrl, str, year } from "./validate";
import type { SessionUser } from "./types";


export interface ImportResult {
  created: number;
  updated: number;
  skipped: { row: number; name: string; reason: string }[];
}

const MAX_ROWS = 500;

/**
 * Bulk-creates organization pages from CSV (moderators). Columns:
 * name, type (company|institution), sector, founded, headquarters, employees, website, summary, tags (;-separated), about
 * Existing values are only filled in, never overwritten, unless `overwrite` is set. Claimed pages are skipped.
 */
export async function importOrganizations(user: SessionUser, csv: string, overwrite: boolean): Promise<ImportResult> {
  const rows = csvRecords(csv);
  const result: ImportResult = { created: 0, updated: 0, skipped: [] };
  if (rows.length > MAX_ROWS) {
    result.skipped.push({ row: 0, name: "", reason: `Too many rows (max ${MAX_ROWS} per file).` });
    return result;
  }
  await connectDB();
  for (const [i, r] of rows.entries()) {
    const rowNo = i + 2; // + header, 1-based
    const name = str(r.name ?? r.title, 160);
    if (name.length < 2) {
      result.skipped.push({ row: rowNo, name, reason: "Missing name" });
      continue;
    }
    const type = /^(institution|school|university|education)/i.test(r.type ?? "") ? "school" : "org";
    let ref;
    try {
      ref = await ensureOrgPage({ title: name, type }, user.id);
    } catch (err) {
      result.skipped.push({ row: rowNo, name, reason: (err as Error).message });
      continue;
    }
    const page = await Page.findOne({ slug: ref.slug });
    if (!page) continue;
    if (page.status === "claimed") {
      result.skipped.push({ row: rowNo, name, reason: "Claimed by the organization" });
      continue;
    }
    const wasEmpty = !page.body && !page.summary && !page.infobox?.sector;
    const incoming = {
      sector: str(r.sector, 80),
      founded: year(r.founded),
      headquarters: str(r.headquarters ?? r.hq, 120),
      employees: str(r.employees, 40),
      website: httpUrl(r.website),
      kind: str(r.kind ?? r["legal form"], 60),
    };
    const infobox = { ...(page.infobox ?? {}) };
    let changed = false;
    for (const [k, v] of Object.entries(incoming)) {
      if (v && (overwrite || !infobox[k])) {
        if (k === "website" && infobox.website !== v) page.websiteChangedAt = null; // moderator-provided: claimable right away
        infobox[k] = v;
        changed = true;
      }
    }
    page.infobox = infobox;
    const summary = str(r.summary, 400);
    if (summary && (overwrite || !page.summary)) {
      page.summary = summary;
      changed = true;
    }
    const tags = (r.tags ?? "").split(/[;|]/).map((t) => str(t, 30)).filter(Boolean).slice(0, 8);
    if (tags.length && (overwrite || !page.tags?.length)) {
      page.tags = tags;
      changed = true;
    }
    const about = (r.about ?? "").slice(0, 20000);
    if (about && (overwrite || !page.body)) {
      page.body = about;
      page.outLinks = extractWikiLinks(about);
      changed = true;
    }
    if (!changed) {
      result.skipped.push({ row: rowNo, name, reason: "Nothing new to add" });
      continue;
    }
    if (page.status === "draft" && (page.body || page.summary)) page.status = "published";
    page.type = type;
    page.revisionCount = (page.revisionCount ?? 0) + 1;
    await page.save();
    await Revision.create({
      pageId: page._id,
      authorId: user.id,
      authorName: user.name,
      editSummary: "Imported from CSV",
      snapshot: { title: page.title, summary: page.summary, tags: page.tags, infobox: page.infobox, body: page.body, sources: page.sources, outLinks: page.outLinks, fundingRounds: page.fundingRounds },
      size: page.body?.length ?? 0,
      delta: 0,
    });
    if (wasEmpty) result.created++;
    else result.updated++;
  }
  return result;
}
