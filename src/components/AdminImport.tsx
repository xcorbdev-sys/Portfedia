import Link from "next/link";
import { Plus } from "lucide-react";
import { listCollections } from "@/lib/collections";

/** Admin tab for curated collections. Content itself is only added by registered users. */
export async function AdminImport() {
  const collections = await listCollections(true);
  return (
    <>
      <section className="card">
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
