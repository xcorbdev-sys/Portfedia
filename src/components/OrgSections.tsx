/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Briefcase, Building, Factory, FlaskConical, MapPin, Newspaper, Store, Warehouse } from "lucide-react";
import type { PageDoc, PageType } from "@/lib/types";
import type { PageCard } from "@/lib/pages";
import { pageHref } from "@/lib/wikitext";
import { formatDate } from "@/lib/site";
import { employeeTrend } from "@/lib/profile-insights";
import { EntityGrid } from "./EntityCards";

const linkIf = (existing: Map<string, PageType>, slug: string, text: string) => {
  const t = existing.get(slug);
  return t ? <Link href={pageHref(t, slug)}>{text}</Link> : <>{text}</>;
};

export function ProductsSection({ page }: { page: PageDoc }) {
  if (page.products.length === 0) return null;
  return (
    <section className="p-section" id="products">
      <h2>Products</h2>
      <ul className="project-grid">
        {page.products.map((p) => (
          <li key={p.id} className="card project-card">
            {p.image && <img src={p.image.url} alt="" loading="lazy" className="project-card__img" style={{ objectFit: "contain", background: "var(--surface)" }} />}
            <div className="card__body">
              <div className="project-card__title">
                {p.url ? <a href={p.url} rel="nofollow ugc noopener" className="external">{p.title}</a> : p.title}
                {p.year && <span className="muted small"> · since {p.year}</span>}
              </div>
              {p.description && <p className="small" style={{ margin: "6px 0 0", color: "var(--text-2)" }}>{p.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LeadershipSection({ page, existing }: { page: PageDoc; existing: Map<string, PageType> }) {
  if (page.leadership.length === 0) return null;
  const groups = [
    { key: "executive", title: "Executives" },
    { key: "board", title: "Board of directors" },
  ];
  return (
    <section className="p-section" id="leadership">
      <h2>Leadership</h2>
      <div className="two-cards" style={{ marginTop: 0 }}>
        {groups.map((g) => {
          const people = page.leadership.filter((l) => l.kind === g.key);
          if (people.length === 0) return null;
          return (
            <div key={g.key} className="card">
              <div className="card__body">
                <div className="card__title">{g.title}</div>
                <table className="kv">
                  <tbody>
                    {people.map((l) => (
                      <tr key={l.slug + l.role}>
                        <th>{l.role || "—"}</th>
                        <td>{linkIf(existing, l.slug, l.name)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const OFFICE_ICON: Record<string, React.ReactNode> = {
  HQ: <Building size={16} />,
  Factory: <Factory size={16} />,
  "R&D": <FlaskConical size={16} />,
  Store: <Store size={16} />,
  Warehouse: <Warehouse size={16} />,
};

export function OfficesSection({ page }: { page: PageDoc }) {
  if (page.offices.length === 0) return null;
  const sorted = [...page.offices].sort((a, b) => Number(b.kind === "HQ") - Number(a.kind === "HQ"));
  return (
    <section className="p-section" id="offices">
      <h2>Offices</h2>
      <ul className="item-list">
        {sorted.map((o, i) => (
          <li key={i}>
            <span className="item-list__icon" aria-hidden="true">{OFFICE_ICON[o.kind] ?? <MapPin size={16} />}</span>
            <span>
              <b>{[o.city, o.country].filter(Boolean).join(", ")}</b> <span className="pill" style={{ marginLeft: 6 }}>{o.kind}</span>
              {o.address && <small>{o.address}</small>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MilestonesSection({ page }: { page: PageDoc }) {
  if (page.milestones.length === 0) return null;
  return (
    <section className="p-section" id="milestones">
      <h2>Milestones</h2>
      <ul className="timeline">
        {page.milestones.map((m, i) => (
          <li key={i}>
            <div className="timeline__when">{m.year ?? "—"}</div>
            <div className="timeline__title">{m.text}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AcquisitionsSection({ page, existing, acquiredBy }: { page: PageDoc; existing: Map<string, PageType>; acquiredBy: PageCard[] }) {
  if (page.acquisitions.length === 0 && acquiredBy.length === 0) return null;
  return (
    <section className="p-section" id="acquisitions">
      <h2>Acquisitions</h2>
      {acquiredBy.length > 0 && (
        <p className="notice notice--info small">
          {page.title} was acquired by{" "}
          {acquiredBy.map((a, i) => (
            <span key={a.slug}>
              {i > 0 && ", "}
              <Link href={pageHref(a.type, a.slug)}>{a.title}</Link>
              {a.detail && ` (${a.detail})`}
            </span>
          ))}
          .
        </p>
      )}
      {page.acquisitions.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Company</th><th>Year</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {[...page.acquisitions].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).map((a) => (
                <tr key={a.slug}>
                  <td><b>{linkIf(existing, a.slug, a.title)}</b></td>
                  <td>{a.year ?? "—"}</td>
                  <td>{a.amount || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function GroupSection({ page, existing, subsidiaries }: { page: PageDoc; existing: Map<string, PageType>; subsidiaries: PageCard[] }) {
  if (!page.parent && subsidiaries.length === 0) return null;
  return (
    <section className="p-section" id="group">
      <h2>Group</h2>
      {page.parent && (
        <p style={{ margin: "0 0 12px" }}>
          Part of <b>{linkIf(existing, page.parent.slug, page.parent.title)}</b>.
        </p>
      )}
      {subsidiaries.length > 0 && (
        <>
          <p className="small muted" style={{ margin: "0 0 10px" }}>Subsidiaries and group companies</p>
          <EntityGrid items={subsidiaries} className="entity-grid--3" />
        </>
      )}
    </section>
  );
}

export function PressSection({ page }: { page: PageDoc }) {
  if (page.press.length === 0) return null;
  return (
    <section className="p-section" id="press">
      <h2>In the press</h2>
      <ul className="item-list">
        {[...page.press].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).map((p, i) => (
          <li key={i}>
            <span className="item-list__icon" aria-hidden="true"><Newspaper size={16} /></span>
            <span>
              <a href={p.url} rel="nofollow ugc noopener" className="external">{p.title}</a>
              <small>{[p.outlet, p.year].filter(Boolean).join(" · ")}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function JobsSection({ page }: { page: PageDoc }) {
  if (page.status !== "claimed" || page.jobs.length === 0) return null;
  return (
    <section className="p-section" id="jobs">
      <h2>Open positions</h2>
      <ul className="item-list">
        {page.jobs.map((j) => (
          <li key={j.id}>
            <span className="item-list__icon" aria-hidden="true"><Briefcase size={16} /></span>
            <span style={{ flex: 1 }}>
              {j.url ? <a href={j.url} rel="nofollow noopener" className="external"><b>{j.title}</b></a> : <b>{j.title}</b>}
              <small>{[j.location, j.type, j.postedAt && `posted ${formatDate(j.postedAt)}`].filter(Boolean).join(" · ")}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TrendSection({ spans }: { spans: { start: number | null; end: number | null; current: boolean }[] }) {
  const t = employeeTrend(spans);
  if (!t) return null;
  return (
    <section className="p-section" id="trend">
      <h2>People on Portfedia</h2>
      <p className="small muted" style={{ margin: "0 0 10px" }}>Profiles that list a position here, per year. It reflects Portfedia members, not the official headcount.</p>
      <div className="bars" role="img" aria-label={t.points.map((p) => `${p.year}: ${p.count}`).join(", ")}>
        {t.points.map((p) => (
          <div key={p.year} className="bars__col" title={`${p.year}: ${p.count}`}>
            <span className="bars__val">{p.count || ""}</span>
            <span className="bars__bar" style={{ height: `${(p.count / t.max) * 100}%` }} />
            <span className="bars__label">{String(p.year).slice(2)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AlumniEmployersSection({ rows }: { rows: { slug: string; title: string; count: number }[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <section className="p-section" id="alumni-work">
      <h2>Where alumni work</h2>
      <ul className="hbars">
        {rows.map((r) => (
          <li key={r.slug}>
            <Link href={`/org/${r.slug}`}>{r.title}</Link>
            <span className="hbars__track"><span style={{ width: `${(r.count / max) * 100}%` }} /></span>
            <span className="muted small">{r.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
