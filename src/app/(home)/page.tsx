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

/** Decorative globe; real profiles float around it. */
function Globe() {
  return (
    <svg className="globe" viewBox="0 0 400 360" aria-hidden="true">
      <defs>
        <radialGradient id="g" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="var(--primary-soft)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--primary-soft)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="170" r="160" fill="url(#g)" />
      <g fill="none" stroke="var(--primary)" strokeOpacity="0.22" strokeWidth="1">
        <circle cx="200" cy="170" r="140" />
        <ellipse cx="200" cy="170" rx="140" ry="50" />
        <ellipse cx="200" cy="170" rx="140" ry="100" />
        <ellipse cx="200" cy="170" rx="50" ry="140" />
        <ellipse cx="200" cy="170" rx="100" ry="140" />
        <line x1="60" y1="170" x2="340" y2="170" />
        <line x1="200" y1="30" x2="200" y2="310" />
      </g>
      <g fill="var(--primary)" fillOpacity="0.5">
        <circle cx="120" cy="110" r="3" /><circle cx="270" cy="95" r="3" /><circle cx="300" cy="210" r="3" />
        <circle cx="150" cy="245" r="3" /><circle cx="215" cy="140" r="3" /><circle cx="95" cy="190" r="3" />
      </g>
      <g stroke="var(--primary)" strokeOpacity="0.35" strokeDasharray="3 4">
        <line x1="120" y1="110" x2="215" y2="140" /><line x1="215" y1="140" x2="270" y2="95" />
        <line x1="215" y1="140" x2="300" y2="210" /><line x1="150" y1="245" x2="215" y2="140" />
      </g>
      <g fill="var(--surface)" stroke="var(--border-strong)">
        <rect x="170" y="150" width="34" height="150" rx="2" />
        <rect x="208" y="120" width="40" height="180" rx="2" />
        <rect x="252" y="175" width="30" height="125" rx="2" />
        <rect x="140" y="200" width="26" height="100" rx="2" />
      </g>
      <g stroke="var(--border-strong)" strokeWidth="1">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1="212" y1={135 + i * 18} x2="244" y2={135 + i * 18} />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`b${i}`} x1="174" y1={165 + i * 18} x2="200" y2={165 + i * 18} />
        ))}
      </g>
    </svg>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await connection(); // always run at request time
  const { deleted } = await searchParams;
  const [data, collections] = await Promise.all([cachedHomeData(), cachedCollections()]);
  const floaters = [...data.featuredPeople.slice(0, 2), ...data.featuredOrgs.slice(0, 1)];
  const positions = [
    { top: "6%", left: "4%" },
    { top: "30%", right: "0%" },
    { bottom: "6%", left: "18%" },
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
            {floaters.map((c, i) => (
              <Link key={c.slug} href={pageHref(c.type, c.slug)} className="hero-art__card" style={positions[i]}>
                <Thumb image={c.image} name={c.title} variant={c.type === "person" ? "square" : "logo"} />
                <span>
                  {c.title}
                  <span>{c.subtitle}</span>
                </span>
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
