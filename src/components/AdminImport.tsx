import Link from "next/link";
import { Plus } from "lucide-react";
import { listCollections } from "@/lib/collections";
import { ImportCsvForm } from "./forms/AdminForms";
import { wikidataImportAction } from "@/lib/actions/admin";
import { searchWikidata, type WikidataHit } from "@/lib/wikidata";

export async function AdminImport({ wd = "" }: { wd?: string }) {
  const collections = await listCollections(true);
  let hits: WikidataHit[] = [];
  let searchError = "";
  if (wd.trim().length >= 2) {
    try {
      hits = await searchWikidata(wd);
    } catch {
      searchError = "Wikidata could not be reached. Please try again in a minute.";
    }
  }
  return (
    <>
      <section className="card" id="wikidata" style={{ marginBottom: 16 }}>
        <div className="card__body">
          <h2 className="card__title">Add a company from Wikidata</h2>
          <p className="small muted">
            Fills in an organization page with public facts: name, short description, founding year, headquarters, sector,
            employees and website. Wikidata is public domain (CC0); a source link is added to the page. People are never
            imported — they create their own profiles. Existing values are kept and claimed pages are not changed.
          </p>
          <form action="/admin" className="wd-search">
            <input type="hidden" name="section" value="import" />
            <input name="wd" className="input" defaultValue={wd} placeholder="Company name, Q-id or Wikidata link" aria-label="Search Wikidata" minLength={2} maxLength={100} required />
            <button className="btn" type="submit">Search</button>
          </form>
          {searchError && <div className="notice notice--error small" style={{ marginTop: 12 }}>{searchError}</div>}
          {wd && !searchError && hits.length === 0 && <p className="small muted" style={{ marginTop: 12 }}>No results on Wikidata.</p>}
          {hits.length > 0 && (
            <ul className="wd-hits">
              {hits.map((h) => (
                <li key={h.qid}>
                  <span style={{ minWidth: 0 }}>
                    <b>{h.label}</b> <a className="small muted" href={`https://www.wikidata.org/wiki/${h.qid}`} target="_blank" rel="noopener noreferrer">{h.qid}</a>
                    {h.description && <span className="small muted wd-hits__desc">{h.description}</span>}
                  </span>
                  <form action={wikidataImportAction}>
                    <input type="hidden" name="qid" value={h.qid} />
                    <input type="hidden" name="wd" value={wd} />
                    <button className="btn btn--sm btn--primary" type="submit">Add</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className="card">
        <div className="card__body">
          <h2 className="card__title">Import companies from CSV</h2>
          <p className="small muted">
            Seed the encyclopedia with organization pages. Pages claimed by their organization are never changed.
          </p>
          <ImportCsvForm />
        </div>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <div className="card__body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 className="card__title" style={{ margin: 0 }}>Collections</h2>
            <Link className="btn btn--sm btn--primary" href="/admin/collections/new"><Plus size={15} /> New collection</Link>
          </div>
          {collections.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>No collections yet. Curated lists appear on /collections and on the home page.</p>
          ) : (
            <ul className="plain-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {collections.map((c) => (
                <li key={c.slug} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                  <span>
                    <Link href={`/collections/${c.slug}`}><b>{c.title}</b></Link> <span className="muted small">· {c.count} pages</span>{" "}
                    {!c.published && <span className="status-pill status-pill--pending">Draft</span>}
                  </span>
                  <Link className="small" href={`/admin/collections/${c.slug}`}>Edit</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
