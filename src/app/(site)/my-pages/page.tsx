import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Settings } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listMyOrgPages } from "@/lib/pages";
import { pageQuota } from "@/lib/quotas";
import { Breadcrumbs, Thumb } from "@/components/ui";

export const metadata: Metadata = { title: "My pages", robots: { index: false } };

type Item = Awaited<ReturnType<typeof listMyOrgPages>>["companies"][number];

function PageList({ items, empty }: { items: Item[]; empty: React.ReactNode }) {
  if (items.length === 0) return <div className="empty">{empty}</div>;
  return (
    <ul className="result-list card">
      {items.map(({ card, isAdmin }) => (
        <li key={card.slug}>
          <div className="result">
            <Thumb image={card.image} name={card.title} variant="logo" />
            <span style={{ minWidth: 0 }}>
              <Link href={`/org/${card.slug}`} className="result__name">{card.title}</Link>
              {card.summary && <span className="result__desc">{card.summary}</span>}
            </span>
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Link className="btn btn--sm btn--primary" href={`/org/${card.slug}/edit`}><Pencil size={14} /> Edit</Link>
              {isAdmin && <Link className="btn btn--sm" href={`/org/${card.slug}/manage`}><Settings size={14} /> Manage</Link>}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

const usage = (q: { used: number; limit: number }) => (Number.isFinite(q.limit) ? `${q.used} of ${q.limit} used` : `${q.used} created`);

export default async function MyPages() {
  const user = await requireUser("/my-pages");
  const [{ companies, saas }, quota] = await Promise.all([listMyOrgPages(user.id), pageQuota(user)]);
  return (
    <div className="container" style={{ maxWidth: 900, paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My pages" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>My pages</h1>
      <p className="muted">Only you (and the people you add as admins) can edit these pages.</p>

      <section id="companies" style={{ marginTop: 24 }}>
        <div className="section__head">
          <h2 className="card__title" style={{ margin: 0 }}>My companies <span className="muted small">· {usage(quota.company)}</span></h2>
          {quota.company.used < quota.company.limit && <Link className="btn btn--sm" href="/create?type=org"><Plus size={14} /> New company</Link>}
        </div>
        <PageList items={companies} empty={<>You haven&apos;t added a company yet. <Link href="/create?type=org">Add your company</Link>.</>} />
      </section>

      <section id="saas" style={{ marginTop: 28 }}>
        <div className="section__head">
          <h2 className="card__title" style={{ margin: 0 }}>My SaaS projects <span className="muted small">· {usage(quota.saas)}</span></h2>
          {quota.saas.used < quota.saas.limit && <Link className="btn btn--sm" href="/create?type=saas"><Plus size={14} /> New SaaS project</Link>}
        </div>
        <PageList items={saas} empty={<>You haven&apos;t added a SaaS project yet. <Link href="/create?type=saas">Introduce your product</Link>.</>} />
      </section>
      {!quota.upgraded && !quota.unlimited && (
        <p className="small muted" style={{ marginTop: 20 }}>Need more? Upgraded accounts can add 5 companies and 10 SaaS projects. Contact us to upgrade.</p>
      )}
    </div>
  );
}
