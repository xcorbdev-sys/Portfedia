import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import Link from "next/link";
import { Building2, CalendarDays, MapPin, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { canEditOrg, getInvestments, isOrgAdmin, isProtected, existingPages, getAlumni, getBacklinks, getPageBySlug, getPeopleOfOrg, isFollowing } from "@/lib/pages";
import { pageHref, renderArticle } from "@/lib/wikitext";
import { formatDate, initials, plainExcerpt } from "@/lib/site";
import { breadcrumbLd, ldJson, organizationLd } from "@/lib/seo";
import { Breadcrumbs, VerifiedBadge } from "@/components/ui";
import { Expandable, SectionNav } from "@/components/client";
import { PageActions } from "@/components/PageActions";
import { EntityGrid, PersonRows } from "@/components/EntityCards";
import { FundingTable, InvestmentsList } from "@/components/Funding";

type Props = { params: Promise<{ slug: string }> };

const load = cache(async (slug: string) => getPageBySlug(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load((await params).slug);
  if (!page || page.type === "person") return { title: "Page not found" };
  const description = page.summary || plainExcerpt(page.body) || `${page.title} on Portfedia.`;
  return {
    title: page.title,
    description,
    alternates: { canonical: `/org/${page.slug}` },
    // Empty draft pages are kept out of search engines
    robots: page.status === "draft" && !page.body ? { index: false, follow: true } : undefined,
    openGraph: { title: page.title, description },
  };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{children}</td>
    </tr>
  );
}

export default async function OrgPage({ params }: Props) {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) notFound();
  if (page.type === "person") permanentRedirect(`/${page.slug}`);

  const user = await getCurrentUser();
  const investorSlugs = page.fundingRounds.flatMap((r) => r.investors.map((i) => i.slug));
  const [existing, backlinks, people, alumni, following, investments] = await Promise.all([
    existingPages([...page.outLinks.map((l) => l.slug), ...investorSlugs]),
    getBacklinks(page.slug),
    getPeopleOfOrg(page.slug),
    page.type === "school" ? getAlumni(page.slug) : Promise.resolve([]),
    user ? isFollowing(user.id, page._id) : Promise.resolve(false),
    getInvestments(page.slug),
  ]);
  const canEdit = canEditOrg(user, page);
  const reserved = ["overview", "about", "funding", "investments", "key-people", "people", "former-people", "alumni", "connections", "sources"];
  const article = renderArticle(page.body, existing, reserved);
  const ib = page.infobox;
  const isSchool = page.type === "school";
  const verified = page.verified || page.status === "claimed";
  const website = ib.website ? ib.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : "";
  const keyPeople = people.current.slice(0, 6);

  const nav = [{ id: "overview", label: "Overview" }];
  if (article.leadHtml.trim()) nav.push({ id: "about", label: "About" });
  for (const t of article.toc) if (t.level === 2) nav.push({ id: t.id, label: t.title });
  if (page.fundingRounds.length) nav.push({ id: "funding", label: "Funding" });
  if (investments.length) nav.push({ id: "investments", label: "Investments" });
  if (keyPeople.length) nav.push({ id: "key-people", label: "Key People" });
  if (people.current.length > keyPeople.length) nav.push({ id: "people", label: "All People" });
  if (people.former.length) nav.push({ id: "former-people", label: "Former People" });
  if (alumni.length) nav.push({ id: "alumni", label: "Alumni" });
  if (backlinks.length) nav.push({ id: "connections", label: "Connections" });
  if (page.sources.length) nav.push({ id: "sources", label: "Sources" });


  return (
    <div className="container">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: isSchool ? "Institutions" : "Companies", href: "/companies" }, { label: page.title }]}
      />
      <div className="profile profile--org">
        <aside className="side-nav" aria-label="Sections">
          <SectionNav title={page.title} items={nav} />
          <div className="side-nav__meta">
            <Link href={`/org/${page.slug}/history`}>View history</Link>
            {canEdit && <Link href={`/org/${page.slug}/edit`}>Edit page</Link>}
            {isOrgAdmin(user, page) || (user && (user.role === "admin" || user.role === "moderator")) ? (
              <Link href={`/org/${page.slug}/manage`}>Manage page</Link>
            ) : (
              <Link href={`/org/${page.slug}/claim`}>{page.status === "claimed" ? "Join as admin" : "Claim this page"}</Link>
            )}
          </div>
        </aside>

        <article className="profile__main">
          {isProtected(page) && (
            <div className="notice notice--info" style={{ marginBottom: 18 }}>
              🔒 This page is protected until {formatDate(page.protectedUntil!)}
              {page.protectedReason ? ` (${page.protectedReason})` : ""}. Only moderators and the organization can edit it.
            </div>
          )}
          {page.status === "draft" && !page.body.trim() && !page.summary && (
            <div className="notice notice--info" style={{ marginBottom: 18 }}>
              This is a <b>draft</b> page, created automatically when a member added {page.title} to their profile.{" "}
              {user ? (
                <Link href={`/org/${page.slug}/edit`}>Help complete it.</Link>
              ) : (
                <Link href={`/login?next=/org/${page.slug}/edit`}>Log in to help complete it.</Link>
              )}
            </div>
          )}
          <header className="p-head" id="overview">
            <div className="p-photo p-photo--logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {page.image ? <img src={page.image.url} alt={`${page.title} logo`} width={128} height={128} /> : initials(page.title)}
            </div>
            <div className="p-head__title">
              <h1 className="p-name">
                {page.title} {verified && <VerifiedBadge size={24} label="Verified organization" />}
              </h1>
              <div className="p-sub">{ib.sector || ib.kind || (isSchool ? "Educational institution" : "Organization")}</div>
            </div>
            <div className="p-head__body">
              {page.tags.length > 0 && (
                <div className="chips">
                  {page.tags.map((t) => (
                    <Link key={t} className="chip" href={`/search?q=${encodeURIComponent(t)}`}>{t}</Link>
                  ))}
                </div>
              )}
              {page.summary && <p className="p-summary">{page.summary}</p>}
            </div>
            <PageActions
              slug={page.slug}
              title={page.title}
              base={`/org/${page.slug}`}
              following={following}
              followers={page.followerCount}
              editHref={canEdit ? `/org/${page.slug}/edit` : null}
            />
          </header>

          {(ib.founded || ib.headquarters || ib.employees || ib.sector) && (
            <div className="facts">
              <div className="fact"><CalendarDays /><span><small>Founded</small><b>{ib.founded ?? "—"}</b></span></div>
              <div className="fact"><MapPin /><span><small>Headquarters</small><b>{ib.headquarters || "—"}</b></span></div>
              <div className="fact"><Users /><span><small>Employees</small><b>{ib.employees || "—"}</b></span></div>
              <div className="fact"><Building2 /><span><small>Sector</small><b>{ib.sector || "—"}</b></span></div>
            </div>
          )}

          {article.leadHtml.trim() && (
            <section className="p-section" id="about">
              <h2>About</h2>
              <Expandable>
                <div className="prose" dangerouslySetInnerHTML={{ __html: article.leadHtml }} />
              </Expandable>
            </section>
          )}
          {article.restHtml.trim() && <div className="prose" dangerouslySetInnerHTML={{ __html: article.restHtml }} />}

          {page.fundingRounds.length > 0 && (
            <section className="p-section" id="funding">
              <h2>Funding</h2>
              <FundingTable rounds={page.fundingRounds} existing={existing} />
            </section>
          )}
          {investments.length > 0 && (
            <section className="p-section" id="investments">
              <h2>Investments</h2>
              <InvestmentsList items={investments} />
            </section>
          )}

          <div className="two-cards">
            <div className="card" id="key-people">
              <div className="card__body">
                <div className="card__title">Key People</div>
                {keyPeople.length ? (
                  <PersonRows items={keyPeople} />
                ) : (
                  <p className="muted small" style={{ margin: 0 }}>
                    No one has listed {page.title} as their current workplace yet.
                  </p>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card__body">
                <div className="card__title">Key Facts</div>
                <table className="kv">
                  <tbody>
                    <Fact label="Type">{ib.kind || (isSchool ? "Educational institution" : "Company")}</Fact>
                    <Fact label="Founded">{ib.founded ? String(ib.founded) : ""}</Fact>
                    <Fact label="Founders">{ib.founders}</Fact>
                    <Fact label="Headquarters">{ib.headquarters}</Fact>
                    <Fact label="Sector">{ib.sector}</Fact>
                    <Fact label="Employees">{ib.employees}</Fact>
                    <Fact label="Website">
                      {website && <a href={ib.website} rel="nofollow ugc noopener" className="external">{website}</a>}
                    </Fact>
                    <Fact label="Status">
                      {verified ? (
                        <span style={{ color: "var(--ok)" }}>Managed by the organization</span>
                      ) : (
                        <>
                          Community maintained · <Link href={`/org/${page.slug}/claim`}>Claim</Link>
                        </>
                      )}
                    </Fact>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {people.current.length > keyPeople.length && (
            <section className="p-section" id="people">
              <h2>All People</h2>
              <EntityGrid items={people.current} className="entity-grid--3" />
            </section>
          )}
          {people.former.length > 0 && (
            <section className="p-section" id="former-people">
              <h2>Former People</h2>
              <EntityGrid items={people.former} className="entity-grid--3" />
            </section>
          )}
          {alumni.length > 0 && (
            <section className="p-section" id="alumni">
              <h2>Alumni</h2>
              <EntityGrid items={alumni} className="entity-grid--3" />
            </section>
          )}
          {backlinks.length > 0 && (
            <section className="p-section" id="connections">
              <h2>Connections</h2>
              <p className="muted small">Pages that mention {page.title}:</p>
              <div className="chips">
                {backlinks.map((b) => (
                  <Link key={b.slug} className="chip" href={pageHref(b.type, b.slug)}>{b.title}</Link>
                ))}
              </div>
            </section>
          )}
          {page.status !== "claimed" && (
            <div className="cta-band no-print" style={{ marginTop: 26 }}>
              <div>
                <h2 style={{ fontSize: "1.05rem" }}>Do you work at {page.title}?</h2>
                <p className="muted small" style={{ margin: "4px 0 0" }}>Claim this page with your work email to manage it and verify your team.</p>
              </div>
              <Link className="btn btn--primary" href={`/org/${page.slug}/claim`}>Claim this page</Link>
            </div>
          )}
          {page.sources.length > 0 && (
            <section className="p-section" id="sources">
              <h2>Sources</h2>
              <ol className="sources">
                {page.sources.map((s, i) => (
                  <li key={i}><a href={s.url} rel="nofollow ugc noopener" className="external">{s.title}</a></li>
                ))}
              </ol>
            </section>
          )}
          <footer className="page-foot">
            <span>Last edited on {formatDate(page.updatedAt)}</span>
            <span>{page.revisionCount} revision{page.revisionCount === 1 ? "" : "s"}</span>
            <span>{page.followerCount.toLocaleString("en-US")} follower{page.followerCount === 1 ? "" : "s"}</span>
          </footer>
        </article>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationLd(page)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd([{ name: "Companies", path: "/companies" }, { name: page.title, path: `/org/${page.slug}` }])) }}
      />
    </div>
  );
}
