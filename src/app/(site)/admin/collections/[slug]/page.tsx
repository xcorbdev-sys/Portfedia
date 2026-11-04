import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireModerator } from "@/lib/auth";
import { getCollection } from "@/lib/collections";
import { deleteCollectionAction } from "@/lib/actions/admin";
import { Breadcrumbs } from "@/components/ui";
import { CollectionForm } from "@/components/forms/AdminForms";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Edit collection", robots: { index: false } };

export default async function EditCollectionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ missing?: string }> }) {
  await requireModerator("/admin?section=import");
  const { slug } = await params;
  const { missing } = await searchParams;
  const isNew = slug === "new";
  const c = isNew ? null : await getCollection(slug);
  if (!isNew && !c) notFound();
  const base = siteUrl();
  return (
    <div className="narrow">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin?section=import" }, { label: isNew ? "New collection" : c!.title }]} />
      <h1>{isNew ? "New collection" : `Edit “${c!.title}”`}</h1>
      {missing && <div className="notice notice--info" style={{ marginBottom: 14 }}>Not found (left out): {missing}</div>}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card__body">
          <CollectionForm
            initial={{
              originalSlug: c?.slug ?? "",
              title: c?.title ?? "",
              description: c?.description ?? "",
              items: c ? c.cards.map((x) => `${base}${x.type === "person" ? "" : "/org"}/${x.slug}`).join("\n") : "",
              published: c?.published ?? true,
              sponsorName: c?.sponsor?.name ?? "",
              sponsorUrl: c?.sponsor?.url ?? "",
            }}
          />
        </div>
      </div>
      {c && (
        <form action={deleteCollectionAction} style={{ marginTop: 16 }}>
          <input type="hidden" name="slug" value={c.slug} />
          <button className="btn btn--danger btn--sm" type="submit">Delete collection</button>
        </form>
      )}
    </div>
  );
}
