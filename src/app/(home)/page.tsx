import { existsSync } from "node:fs";
import { join } from "node:path";
import { connection } from "next/server";
import Link from "next/link";
import { ArrowRight, Building2, FileText, Layers, Search, User } from "lucide-react";
import { cachedCollections, cachedHomeData } from "@/lib/cached";
import { EntityGrid } from "@/components/EntityCards";
import { HeroArt, NODES } from "@/components/HeroArt";
import { pageHref } from "@/lib/wikitext";
import { FeaturedTabs } from "./FeaturedTabs";
import { ldJson, websiteLd } from "@/lib/seo";

const fmt = (n: number) => n.toLocaleString("en-US");

// A real hero image in public/brand/ replaces the drawn illustration
const HERO_IMAGE = ["hero.webp", "hero.png"].find((f) => existsSync(join(process.cwd(), "public", "brand", f)));

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  await connection(); // always run at request time
  const { deleted } = await searchParams;
  const [data, collections] = await Promise.all([cachedHomeData(), cachedCollections()]);
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
            {HERO_IMAGE ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="hero-art__img" src={`/brand/${HERO_IMAGE}`} alt="Office towers inside a connected globe" />
            ) : (
              <>
                <HeroArt />
                {/* Members' profile photos sit on the globe's dots, one per dot; each opens the profile */}
                {data.globePeople.slice(0, NODES.length).map((p, i) => (
                  <Link
                    key={p.slug}
                    href={pageHref(p.type, p.slug)}
                    className={`globe-avatar${p.type === "person" ? "" : " globe-avatar--logo"}`}
                    style={{ left: `${(NODES[i][0] / 480) * 100}%`, top: `${(NODES[i][1] / 390) * 100}%`, animationDelay: `${i * 60}ms` }}
                    title={p.occupation ? `${p.title} · ${p.occupation}` : p.title}
                    aria-label={p.title}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.photo} alt="" width={48} height={48} loading="lazy" decoding="async" />
                  </Link>
                ))}
              </>
            )}
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
