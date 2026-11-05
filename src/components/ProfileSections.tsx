/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Award, BadgeCheck, ExternalLink, FileText, Mic, ScrollText } from "lucide-react";
import type { PageDoc, PageType } from "@/lib/types";
import { OPEN_TO } from "@/lib/types";
import { pageHref } from "@/lib/wikitext";
import { slugify } from "@/lib/slug";
import { buildTimeline, profileCompleteness } from "@/lib/profile-insights";
import { SafeImg } from "@/components/SafeImg";

const Ext = ({ url, children }: { url: string; children: React.ReactNode }) =>
  url ? (
    <a href={url} rel="nofollow ugc noopener" className="external">
      {children}
    </a>
  ) : (
    <>{children}</>
  );

/**
 * "Open to …" as a green frame around the profile photo with a ribbon at the bottom
 * (like an "open to work" frame). The ribbon names the first item; all of them are in the tooltip.
 */
export function OpenToPhoto({ page, children }: { page: PageDoc; children: React.ReactNode }) {
  if (page.openTo.length === 0) return <div className="p-photo">{children}</div>;
  const all = page.openTo.map((k) => OPEN_TO[k]);
  const label = `Open to ${all.join(", ")}`;
  return (
    <div className="p-photo p-photo--open" title={label}>
      {children}
      <span className="open-ribbon" aria-label={label}>
        <span className="open-ribbon__top">#OPENTO</span>
        <span className="open-ribbon__what">
          {all[0]}
          {all.length > 1 && <> +{all.length - 1}</>}
        </span>
      </span>
    </div>
  );
}

export function OpenToBadges({ page }: { page: PageDoc }) {
  if (page.openTo.length === 0) return null;
  return (
    <div className="open-badges">
      <span className="open-badges__dot" aria-hidden="true" />
      Open to {page.openTo.map((k) => OPEN_TO[k]).join(" · ")}
    </div>
  );
}

export function ProjectsSection({ page, linked = {} }: { page: PageDoc; linked?: Record<string, { title: string; logo: string }> }) {
  if (page.projects.length === 0) return null;
  return (
    <section className="p-section" id="projects">
      <h2>Projects</h2>
      <ul className="project-grid">
        {page.projects.map((p) => (
          <li key={p.id} className="card project-card">
            {p.image ? (
              <SafeImg src={p.image.url} alt="" loading="lazy" className="project-card__img" fallback={null} />
            ) : p.pageSlug && linked[p.pageSlug]?.logo ? (
              <SafeImg src={linked[p.pageSlug].logo} alt="" loading="lazy" className="project-card__img project-card__img--logo" fallback={null} />
            ) : null}
            <div className="card__body">
              <div className="project-card__title">
                {p.pageSlug && linked[p.pageSlug] ? <Link href={`/org/${p.pageSlug}`}>{p.title}</Link> : <Ext url={p.url}>{p.title}</Ext>}
                {p.year && <span className="muted small"> · {p.year}</span>}
                {p.pageSlug && linked[p.pageSlug] && <span className="pill" style={{ marginLeft: 6 }}>SaaS</span>}
              </div>
              {p.pageSlug && linked[p.pageSlug] && p.url && (
                <a href={p.url} rel="nofollow ugc noopener" className="external small">{p.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>
              )}
              {p.description && <p className="small" style={{ margin: "6px 0 0", color: "var(--text-2)" }}>{p.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SimpleList({ id, title, icon, items }: { id: string; title: string; icon: React.ReactNode; items: { key: string; main: React.ReactNode; meta: string }[] }) {
  if (items.length === 0) return null;
  return (
    <section className="p-section" id={id}>
      <h2>{title}</h2>
      <ul className="item-list">
        {items.map((it) => (
          <li key={it.key}>
            <span className="item-list__icon" aria-hidden="true">{icon}</span>
            <span>
              {it.main}
              {it.meta && <small>{it.meta}</small>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AchievementSections({ page, existing }: { page: PageDoc; existing: Map<string, PageType> }) {
  const issuer = (name: string) => {
    const type = existing.get(slugify(name));
    return type ? <Link href={pageHref(type, slugify(name))}>{name}</Link> : name;
  };
  const byYear = <T extends { year: number | null }>(xs: T[]) => [...xs].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return (
    <>
      <SimpleList
        id="publications"
        title="Publications"
        icon={<FileText size={16} />}
        items={byYear(page.publications).map((p, i) => ({ key: `p${i}`, main: <Ext url={p.url}>{p.title}</Ext>, meta: [p.publisher, p.year].filter(Boolean).join(" · ") }))}
      />
      <SimpleList
        id="awards"
        title="Awards & certifications"
        icon={<Award size={16} />}
        items={byYear(page.awards).map((a, i) => ({
          key: `a${i}`,
          main: (
            <>
              <Ext url={a.url}>{a.title}</Ext>
              {a.issuer && <span className="muted"> — {issuer(a.issuer)}</span>}
            </>
          ),
          meta: [a.kind === "certification" ? "Certification" : "Award", a.year].filter(Boolean).join(" · "),
        }))}
      />
      <SimpleList
        id="talks"
        title="Talks & events"
        icon={<Mic size={16} />}
        items={byYear(page.talks).map((t, i) => ({ key: `t${i}`, main: <Ext url={t.url}>{t.title}</Ext>, meta: [t.event, t.year].filter(Boolean).join(" · ") }))}
      />
      <SimpleList
        id="patents"
        title="Patents"
        icon={<ScrollText size={16} />}
        items={byYear(page.patents).map((p, i) => ({ key: `n${i}`, main: <Ext url={p.url}>{p.title}</Ext>, meta: [p.number, p.year].filter(Boolean).join(" · ") }))}
      />
      {page.volunteering.length > 0 && (
        <section className="p-section" id="volunteering">
          <h2>Volunteering</h2>
          <ul className="timeline">
            {page.volunteering.map((v, i) => (
              <li key={i}>
                <div className="timeline__when">
                  {v.startYear ?? "?"} – {v.endYear ?? "Present"}
                </div>
                <div>
                  <div className="timeline__title">
                    <b>{issuer(v.org)}</b>
                    {v.role && <span> · {v.role}</span>}
                  </div>
                  {v.description && <div className="timeline__desc">{v.description}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export function TimelineSection({ page }: { page: PageDoc }) {
  const t = buildTimeline(page);
  if (!t) return null;
  return (
    <section className="p-section" id="timeline">
      <h2>Timeline</h2>
      <div className="tl" role="img" aria-label={`Career timeline from ${t.min} to ${t.max}`}>
        <div className="tl__axis">
          {t.ticks.map((x) => (
            <span key={x.year} style={{ left: `${x.left}%` }}>{x.year}</span>
          ))}
        </div>
        {t.bars.map((b, i) => (
          <div key={i} className="tl__row">
            <div className={`tl__bar tl__bar--${b.kind}${b.current ? " is-current" : ""}`} style={{ left: `${b.left}%`, width: `${b.width}%` }} title={`${b.label}${b.sub ? ` · ${b.sub}` : ""}: ${b.start}–${b.current ? "Present" : b.end}`}>
              <span>{b.label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="tl__legend small muted">
        <span><i className="tl__bar--work" /> Work</span>
        <span><i className="tl__bar--education" /> Education</span>
        <span><i className="tl__bar--volunteering" /> Volunteering</span>
      </div>
    </section>
  );
}

export function CompletenessCard({ page }: { page: PageDoc }) {
  const c = profileCompleteness(page);
  if (c.percent >= 100) return null;
  return (
    <div className="card completeness no-print">
      <div className="card__body">
        <div className="card__title" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Profile strength</span>
          <span style={{ color: "var(--primary)" }}>{c.percent}%</span>
        </div>
        <div className="progress"><span style={{ width: `${c.percent}%` }} /></div>
        <ul className="small" style={{ margin: "10px 0 0", paddingLeft: 18, color: "var(--text-2)" }}>
          {c.missing.slice(0, 4).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <Link className="btn btn--sm" href="/edit" style={{ marginTop: 10 }}>
          <BadgeCheck size={15} /> Improve profile
        </Link>
      </div>
    </div>
  );
}

export function LanguagesFact({ page }: { page: PageDoc }) {
  if (page.languageLevels.length === 0) return <>{page.infobox.languages}</>;
  return (
    <>
      {page.languageLevels.map((l, i) => (
        <span key={l.name}>
          {i > 0 && ", "}
          {l.name}
          {l.level && <span className="muted"> ({l.level})</span>}
        </span>
      ))}
    </>
  );
}

export { ExternalLink };
