import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getPageBySlug } from "@/lib/pages";
import { listChangelog } from "@/lib/org-extras";
import { canPostUpdates } from "@/lib/page-social";
import { addChangelogAction, deleteChangelogAction } from "@/lib/actions/org-extras";
import { Breadcrumbs } from "@/components/ui";
import { requireFeature } from "@/lib/features";
import { isPublic } from "@/lib/visibility";
import { formatDate } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ added?: string; removed?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPageBySlug((await params).slug, "org");
  return page ? { title: `${page.title} changelog`, description: `What's new in ${page.title}: releases and improvements.` } : { title: "Changelog" };
}

/** #64: a SaaS project's releases, newest first; its makers add them here. */
export default async function ChangelogPage({ params, searchParams }: Props) {
  await requireFeature("saas");
  const page = await getPageBySlug((await params).slug, "org");
  if (!page || page.category !== "saas" || !isPublic(page)) notFound();
  const user = await getCurrentUser();
  const canEdit = canPostUpdates(user, page);
  const [rows, sp] = await Promise.all([listChangelog(page._id), searchParams]);
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 820 }}>
      <Breadcrumbs items={[{ label: "SaaS Projects", href: "/saas" }, { label: page.title, href: `/org/${page.slug}` }, { label: "Changelog" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>{page.title} changelog</h1>
      {sp.added && <div className="notice notice--ok">Release added. Followers were notified.</div>}
      {sp.removed && <div className="notice notice--ok">Release removed.</div>}
      {sp.error && <div className="notice notice--error">{sp.error}</div>}
      {canEdit && (
        <form action={addChangelogAction} className="card form" style={{ marginTop: 14 }}>
          <div className="card__body" style={{ display: "grid", gap: 10 }}>
            <input type="hidden" name="slug" value={page.slug} />
            <div className="grid-2">
              <label className="field"><span className="label">Version (optional)</span><input name="version" className="input" maxLength={30} placeholder="v2.4" /></label>
              <label className="field"><span className="label">Title</span><input name="title" className="input" required minLength={3} maxLength={120} placeholder="Dark mode and faster exports" /></label>
            </div>
            <label className="field"><span className="label">What changed</span><textarea name="notes" className="textarea" rows={4} maxLength={3000} /></label>
            <button className="btn btn--primary" type="submit" style={{ width: "fit-content" }}>Add release</button>
          </div>
        </form>
      )}
      {rows.length === 0 ? (
        <div className="empty" style={{ marginTop: 14 }}>No releases yet.</div>
      ) : (
        <ol className="changelog">
          {rows.map((r) => (
            <li key={r.id}>
              <div className="changelog__head">
                {r.version && <span className="chip">{r.version}</span>}
                <b>{r.title}</b>
                <time>{formatDate(r.createdAt)}</time>
              </div>
              {r.notes && <p>{r.notes}</p>}
              {canEdit && (
                <form action={deleteChangelogAction}>
                  <input type="hidden" name="slug" value={page.slug} />
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn btn--sm btn--ghost" type="submit">Delete</button>
                </form>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className="small muted" style={{ marginTop: 18 }}><Link href={`/org/${page.slug}`}>← {page.title}</Link></p>
    </div>
  );
}
