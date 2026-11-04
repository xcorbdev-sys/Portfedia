import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, Building2, FileText, Layers, Search, User } from "lucide-react";
import { cachedCollections, cachedHomeData } from "@/lib/cached";
import { pageHref } from "@/lib/wikitext";
import { EntityGrid } from "@/components/EntityCards";
import { Thumb } from "@/components/ui";
import { FeaturedTabs } from "./FeaturedTabs";
import { ldJson, websiteLd } from "@/lib/seo";

const fmt = (n: number) => n.toLocaleString("en-US");

/** Decorative globe with a city skyline (pure SVG, theme-aware). Real profile photos float around it. */
function Globe() {
  const towers = [
    { x: 150, w: 34, h: 120, t: 0.55 },
    { x: 186, w: 42, h: 190, t: 0.7 },
    { x: 232, w: 36, h: 150, t: 0.6 },
    { x: 270, w: 48, h: 250, t: 0.85 },
    { x: 322, w: 34, h: 135, t: 0.6 },
  ];
  const base = 330;
  return (
    <svg className="globe" viewBox="0 0 440 380" aria-hidden="true">
      <defs>
        <radialGradient id="glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="var(--primary-soft)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--primary-soft)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="glass" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#c9d3e3" />
          <stop offset="55%" stopColor="#8e9bb3" />
          <stop offset="100%" stopColor="#5b6781" />
        </linearGradient>
      </defs>
      <circle cx="235" cy="170" r="165" fill="url(#glow)" />
      {/* geodesic globe */}
      <g fill="none" stroke="var(--primary)" strokeOpacity="0.18" strokeWidth="1">
        <circle cx="235" cy="170" r="150" />
        <ellipse cx="235" cy="170" rx="150" ry="55" />
        <ellipse cx="235" cy="170" rx="150" ry="105" />
        <ellipse cx="235" cy="170" rx="55" ry="150" />
        <ellipse cx="235" cy="170" rx="105" ry="150" />
        <path d="M120 75 L235 40 L350 75 L385 170 L350 265 L235 300 L120 265 L85 170 Z" />
        <path d="M235 40 L180 120 L120 75 M235 40 L290 120 L350 75 M180 120 L290 120 L235 200 Z M85 170 L180 120 M385 170 L290 120" />
      </g>
      <g fill="var(--primary)" fillOpacity="0.55">
        {[[120, 75], [235, 40], [350, 75], [385, 170], [85, 170], [180, 120], [290, 120], [235, 200], [120, 265], [350, 265]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" />
        ))}
      </g>
      {/* skyline */}
      <g>
        {towers.map((t, i) => (
          <g key={i}>
            <rect x={t.x} y={base - t.h} width={t.w} height={t.h} fill="url(#glass)" opacity={t.t} />
            <rect x={t.x + t.w * 0.62} y={base - t.h} width={t.w * 0.38} height={t.h} fill="#000" opacity="0.12" />
            {Array.from({ length: Math.floor(t.h / 11) }, (_, r) => (
              <line key={r} x1={t.x + 3} x2={t.x + t.w - 3} y1={base - t.h + 8 + r * 11} y2={base - t.h + 8 + r * 11} stroke="#fff" strokeOpacity="0.35" strokeWidth="1" />
            ))}
            {Array.from({ length: Math.max(1, Math.floor(t.w / 9)) }, (_, c) => (
              <line key={`c${c}`} x1={t.x + 6 + c * 9} x2={t.x + 6 + c * 9} y1={base - t.h + 4} y2={base} stroke="#fff" strokeOpacity="0.18" strokeWidth="1" />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await connection(); // always run at request time
  const { deleted } = await searchParams;
  const [data, collections] = await Promise.all([cachedHomeData(), cachedCollections()]);
  // Photo tiles (no text) like the design: two people with photos, one organization below
  const people = data.featuredPeople.filter((c) => c.image).slice(0, 2);
  const org = data.featuredOrgs.find((c) => c.image); // only real images, like the design
  const tiles = [
    ...people.map((c, i) => ({ c, style: i === 0 ? { top: "9%", left: "8%" } : { top: "24%", right: "0%" }, wide: false })),
    ...(org ? [{ c: org, style: { bottom: "4%", left: "34%" }, wide: true }] : []),
  ];

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <div>
            {deleted && <div className="notice notice--ok" style={{ marginBottom: 20 }}>Your account and profile have been permanently deleted.</div>}
            <h1>
              The living encyclopedia
              <br />
              of the business world.
            </h1>
            <p className="hero__lead">
              Reliable, connected and continuously updated information about people, companies, investors and institutions.{" "}
              <b>Portfedia</b> is designed to help you understand the business world better.
            </p>
            <form action="/search" className="hero-search" role="search">
              <Search className="icon" aria-hidden="true" />
              <label htmlFor="home-q" className="visually-hidden">Search</label>
              <input id="home-q" name="q" type="search" placeholder="Search people, companies, investors or topics..." autoComplete="off" />
              <button type="submit" aria-label="Search"><ArrowRight size={18} /></button>
            </form>
          </div>
          <div className="hero-art">
            <Globe />
            {tiles.map(({ c, style, wide }) => (
              <Link key={c.slug} href={pageHref(c.type, c.slug)} className={`hero-art__tile${wide ? " hero-art__tile--wide" : ""}`} style={style} title={c.title} aria-label={c.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.image ? <img src={c.image.url} alt="" style={wide ? { objectFit: "cover" } : undefined} /> : c.title.slice(0, 2).toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
        <div className="container stats">
          <div className="stat"><User /><div><b>{fmt(data.stats.people)}</b><span>People Profiles</span></div></div>
          <div className="stat"><Building2 /><div><b>{fmt(data.stats.orgs)}</b><span>Company Profiles</span></div></div>
          <div className="stat"><Layers /><div><b>{fmt(data.stats.sectors)}</b><span>Sectors</span></div></div>
          <div className="stat"><FileText /><div><b>Up to date</b><span>Sourced content</span></div></div>
        </div>
      </section>

      <section className="container section">
        <FeaturedTabs
          people={<EntityGrid items={data.featuredPeople} />}
          companies={<EntityGrid items={data.featuredOrgs} />}
          collections={
            <ul className="entity-grid">
              {collections.slice(0, 8).map((c) => (
                <li key={c.slug}>
                  <Link href={`/collections/${c.slug}`} className="entity">
                    <span className="thumb"><Layers size={20} /></span>
                    <span style={{ minWidth: 0 }}>
                      <span className="entity__name">{c.title}</span>
                      <span className="entity__sub">{c.count} profiles</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          }
          hasPeople={data.featuredPeople.length > 0}
          hasCompanies={data.featuredOrgs.length > 0}
          hasCollections={collections.length > 0}
        />
        <div className="cta-band" style={{ marginTop: 36 }}>
          <div>
            <h2>Put yourself on the map</h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Create your profile in minutes. Every company you mention becomes a connected page.
            </p>
          </div>
          <Link href="/create" className="btn btn--primary btn--lg">
            Create a profile <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(websiteLd()) }} />
    </>
  );
}
