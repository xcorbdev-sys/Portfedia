import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import Link from "next/link";
import { Globe, Mail } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { findRenamedPage } from "@/lib/account";
import { canView, isMembersOnly, isPublic } from "@/lib/visibility";
import { ReviewBanner } from "@/components/Review";
import { currentRole, existingPages, getBacklinks, getCards, getInvestments, getPageBySlug, isFollowing } from "@/lib/pages";
import { InvestmentsList } from "@/components/Funding";
import { AchievementSections, CompletenessCard, LanguagesFact, OpenToPhoto, ProjectsSection, TimelineSection } from "@/components/ProfileSections";
import { slugify } from "@/lib/slug";
import { buildTimeline } from "@/lib/profile-insights";
import { listTestimonials } from "@/lib/feedback";
import { hasThanked, mutualConnections } from "@/lib/social";
import { featureUnlocked, getPersonPageOf, getUserPlan, linkedProjectPages, viewStatsHidden } from "@/lib/pages";
import { countView } from "@/lib/views";
import { StatsCard } from "@/components/StatsCard";
import { Users as UsersIcon } from "lucide-react";
import { Thumb } from "@/components/ui";
import { pageHref, renderArticle, stripWikiLinks } from "@/lib/wikitext";
import { formatDate, plainExcerpt, initials } from "@/lib/site";
import { breadcrumbLd, ldJson, personProfileLd } from "@/lib/seo";
import { Breadcrumbs, GitHubIcon, LinkedInIcon, VerifiedBadge } from "@/components/ui";
import { Expandable, SectionNav } from "@/components/client";
import { PageActions } from "@/components/PageActions";
import { EntityGrid } from "@/components/EntityCards";

type Props = { params: Promise<{ slug: string }> };

const load = cache(async (slug: string) => getPageBySlug(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load((await params).slug);
  if (!page || page.type !== "person") return { title: "Page not found" };
  if (!isPublic(page)) {
    // Profiles under review never reach search engines and don't leak details in previews
    return { title: canView(page, await getCurrentUser()) ? page.title : "Page not found", robots: { index: false, follow: false } };
  }
  if (isMembersOnly(page)) {
    // #75: no details for previews or search engines
    return { title: (await getCurrentUser()) ? page.title : "Members-only profile", robots: { index: false, follow: false } };
  }
  const role = currentRole(page);
  const description = stripWikiLinks(page.summary) || plainExcerpt(page.body) || `${page.title}, ${role}`;
  return {
    title: page.title,
    description,
    alternates: { canonical: `/${page.slug}` },
    robots: page.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "profile",
      title: role ? `${page.title} — ${role}` : page.title,
      description
    },
  };
}

const range = (a?: number | null, b?: number | null, current?: boolean) =>
  a || b || current ? `${a ?? "?"} – ${current ? "Present" : (b ?? "?")}` : "—";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === null || children === undefined || children === "" || children === false) return null;
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{children}</td>
    </tr>
  );
}

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  const page = await load(slug);
  if (!page) {
    const moved = await findRenamedPage(slug);
    if (moved) permanentRedirect(pageHref(moved.type, moved.slug));
    notFound();
  }
  if (page.type !== "person") permanentRedirect(pageHref(page.type, page.slug));

  const user = await getCurrentUser();
  // Profiles awaiting review are visible only to their owner and moderators
  if (!canView(page, user)) notFound();
  // #75: members-only profiles ask visitors to sign in
  if (isMembersOnly(page) && !user) {
    return (
      <div className="narrow" style={{ textAlign: "center", paddingTop: 64 }}>
        <h1>Members-only profile</h1>
        <p className="muted">This person chose to show their profile only to Portfedia members.</p>
        <p style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Link className="btn btn--primary" href={`/login?next=/${page.slug}`}>Log in to view</Link>
          <Link className="btn" href="/signup">Create an account</Link>
        </p>
      </div>
    );
  }
  const orgSlugs = [...new Set([...page.experiences.map((e) => e.orgSlug), ...page.educations.map((e) => e.schoolSlug)])];
  const [existing, backlinks, related, following, investments, recommendations, viewerPage, thanked] = await Promise.all([
    existingPages([...page.outLinks.map((l) => l.slug), ...page.awards.map((a) => slugify(a.issuer)), ...page.volunteering.map((v) => slugify(v.org))].filter(Boolean)),
    getBacklinks(page.slug),
    getCards(orgSlugs),
    user ? isFollowing(user.id, page._id) : Promise.resolve(false),
    getInvestments(page.slug),
    listTestimonials(page._id, ["published"]),
    user ? getPersonPageOf(user.id) : Promise.resolve(null),
    user ? hasThanked(user.id, page._id) : Promise.resolve(false),
  ]);
  const mutual = mutualConnections(viewerPage, page);
  const ownerViewing = Boolean(user && user.id === page.ownerId);
  await countView(page._id, ownerViewing || Boolean(user && (user.role === "admin" || user.role === "moderator")));
  const linkedProjects = await linkedProjectPages(page.projects.map((x) => x.pageSlug).filter((x): x is string => Boolean(x)));
  const ownerHidesStats = ownerViewing ? await viewStatsHidden(user!.id) : false;
  const ownerPro = ownerViewing ? featureUnlocked(await getUserPlan(user!.id), "pro") : false;
  const isOwner = Boolean(user && (user.id === page.ownerId || user.role === "admin"));
  const reserved = [
    "overview", "biography", "timeline", "career", "education", "projects", "publications", "awards", "talks", "patents", "volunteering",
    "investments", "recommendations", "related-companies", "connections", "sources",
  ];
  const article = renderArticle(page.body, existing, reserved);
  const ib = page.infobox;
  const exps = page.experiences.filter((e) => e.verification !== "rejected");
  const current = exps.filter((e) => e.current);
  const role = currentRole(page);
  const hasLinks = ib.website || ib.github || ib.linkedin || (ib.email && ib.emailPublic);

  const nav = [{ id: "overview", label: "Overview" }];
  if (article.leadHtml.trim()) nav.push({ id: "biography", label: "Biography" });
  for (const t of article.toc) if (t.level === 2) nav.push({ id: t.id, label: t.title });
  if (exps.length) nav.push({ id: "career", label: "Career" });
  if (page.educations.length) nav.push({ id: "education", label: "Education" });
  if (page.projects.length) nav.push({ id: "projects", label: "Projects" });
  if (page.publications.length) nav.push({ id: "publications", label: "Publications" });
  if (page.awards.length) nav.push({ id: "awards", label: "Awards" });
  if (page.talks.length) nav.push({ id: "talks", label: "Talks & Events" });
  if (page.patents.length) nav.push({ id: "patents", label: "Patents" });
  if (page.volunteering.length) nav.push({ id: "volunteering", label: "Volunteering" });
  if (buildTimeline(page)) nav.push({ id: "timeline", label: "Timeline" });
  if (investments.length) nav.push({ id: "investments", label: "Investments" });
  if (recommendations.length) nav.push({ id: "recommendations", label: "Recommendations" });
  if (related.length) nav.push({ id: "related-companies", label: "Related Companies" });
  if (backlinks.length) nav.push({ id: "connections", label: "Connections" });
  if (page.sources.length) nav.push({ id: "sources", label: "Sources" });


  return (
    <div className="container">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "People", href: "/people" }, { label: page.title }]} />
      <div className="profile">
        <aside className="side-nav" aria-label="Sections">
          <SectionNav title={page.title} items={nav} />
          <div className="side-nav__meta">
            <Link href={`/${page.slug}/history`}>View history</Link>
            {isOwner && <Link href="/edit">Edit profile</Link>}
          </div>
        </aside>

        <article className="profile__main">
          {page.cover && <div className="p-cover" style={{ backgroundImage: `url(${page.cover.url})` }} role="img" aria-label={`${page.title} cover image`} />}
          {user && !isPublic(page) && <ReviewBanner page={page} user={user} />}
          {isMembersOnly(page) && isPublic(page) && (
            <div className="notice notice--info small" style={{ marginBottom: 12 }}>🔒 Members-only profile: visible to signed-in members only.</div>
          )}
          <header className="p-head" id="overview">
            <OpenToPhoto page={page}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {page.image ? <img src={page.image.url} alt={page.title} width={128} height={128} /> : initials(page.title)}
            </OpenToPhoto>
            <div className="p-head__title">
              <h1 className="p-name">
                {page.title} {page.verified && <VerifiedBadge size={24} label="Verified identity" />}
              </h1>
              {role && <div className="p-sub">{role}</div>}
            </div>
            <div className="p-head__body">
              {page.tags.length > 0 && (
                <div className="chips">
                  {page.tags.map((t) => (
                    <Link key={t} className="chip" href={`/tag/${slugify(t)}`}>{t}</Link>
                  ))}
                </div>
              )}
              {page.summary && <p className="p-summary">{stripWikiLinks(page.summary)}</p>}
              {mutual.length > 0 && (
                <p className="mutual">
                  <UsersIcon size={16} />
                  <span>
                    You both {mutual.some((m) => m.kind === "work") ? "worked at " : "studied at "}
                    {mutual.map((m, i) => (
                      <span key={m.slug}>
                        {i > 0 && (i === mutual.length - 1 ? " and " : ", ")}
                        <Link href={`/org/${m.slug}`}>{m.title}</Link>
                      </span>
                    ))}
                  </span>
                </p>
              )}
            </div>
            {isPublic(page) ? (
              <PageActions
                slug={page.slug}
                title={page.title}
                base={`/${page.slug}`}
                following={following}
                followers={page.followerCount}
                editHref={isOwner ? "/edit" : null}
                personLinks={!isOwner}
                thanks={user?.id === page.ownerId ? null : { given: thanked, count: page.thanksCount }}
                qr
              />
            ) : (
              // Not public yet: following/sharing make no sense
              <div className="p-actions no-print">{isOwner && <Link className="btn" href="/edit">Edit profile</Link>}</div>
            )}
          </header>

          {article.leadHtml.trim() && (
            <section className="p-section" id="biography">
              <h2>Biography</h2>
              <Expandable>
                <div className="prose" dangerouslySetInnerHTML={{ __html: article.leadHtml }} />
              </Expandable>
            </section>
          )}

          {article.restHtml.trim() && <div className="prose" dangerouslySetInnerHTML={{ __html: article.restHtml }} />}

          {exps.length > 0 && (
            <section className="p-section" id="career">
              <h2>Career</h2>
              <ul className="timeline">
                {exps.map((e, i) => (
                  <li key={i}>
                    <div className="timeline__when">{range(e.startYear, e.endYear, e.current)}</div>
                    <div>
                      <div className="timeline__title">
                        <Link href={`/org/${e.orgSlug}`}><b>{e.orgTitle}</b></Link>
                        {e.role && <span> · {e.role}</span>}
                        {e.verification === "verified" && (
                          <span className="badge-ok" title={e.verifiedVia === "work_email" ? "Verified with a work email" : "Confirmed by the organization"}>
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      {e.description && <div className="timeline__desc">{e.description}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {page.educations.length > 0 && (
            <section className="p-section" id="education">
              <h2>Education</h2>
              <ul className="timeline">
                {page.educations.map((e, i) => (
                  <li key={i}>
                    <div className="timeline__when">{range(e.startYear, e.endYear)}</div>
                    <div>
                      <div className="timeline__title">
                        <Link href={`/org/${e.schoolSlug}`}><b>{e.schoolTitle}</b></Link>
                      </div>
                      {(e.field || e.degree) && <div className="timeline__desc">{[e.field, e.degree].filter(Boolean).join(" · ")}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ProjectsSection page={page} linked={linkedProjects} />
          <AchievementSections page={page} existing={existing} />
          <TimelineSection page={page} />

          {investments.length > 0 && (
            <section className="p-section" id="investments">
              <h2>Investments</h2>
              <InvestmentsList items={investments} />
            </section>
          )}

          {recommendations.length > 0 && (
            <section className="p-section" id="recommendations">
              <h2>Recommendations</h2>
              <ul className="reco-list">
                {recommendations.map((r) => (
                  <li key={r.id} className="card">
                    <div className="card__body">
                      <p style={{ margin: "0 0 12px", whiteSpace: "pre-wrap" }}>&ldquo;{r.text}&rdquo;</p>
                      <div className="person-row" style={{ padding: 0 }}>
                        <Thumb image={r.authorImage} name={r.authorName} variant="round" />
                        <span>
                          <b>{r.authorSlug ? <Link href={`/${r.authorSlug}`}>{r.authorName}</Link> : r.authorName}</b>
                          {r.relationship && <small>{r.relationship}</small>}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section className="p-section" id="related-companies">
              <h2>Related Companies</h2>
              <EntityGrid items={related} className="entity-grid--2" />
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

          {page.sources.length > 0 && (
            <section className="p-section" id="sources">
              <h2>Sources</h2>
              <ol className="sources">
                {page.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} rel="nofollow ugc noopener" className="external">{s.title}</a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <footer className="page-foot">
            <span>Last edited on {formatDate(page.updatedAt)}</span>
            <span>{page.revisionCount} revision{page.revisionCount === 1 ? "" : "s"}</span>
            <span>{page.followerCount.toLocaleString("en-US")} follower{page.followerCount === 1 ? "" : "s"}</span>
            {page.thanksCount > 0 && <span>💙 {page.thanksCount.toLocaleString("en-US")} thanks</span>}
          </footer>
        </article>

        <aside className="profile__aside" aria-label="Key facts">
          {isOwner && user?.id === page.ownerId && <CompletenessCard page={page} />}
          {ownerViewing && !ownerHidesStats && <StatsCard pageId={page._id} enabled={ownerPro} hideBack={`/${page.slug}`} />}
          <div className="card">
            <div className="card__body">
              <div className="card__title">Key Facts</div>
              <table className="kv">
                <tbody>
                  <Fact label="Born">
                    {[ib.birthYearPublic && ib.birthYear ? String(ib.birthYear) : "", ib.birthPlace].filter(Boolean).join(", ")}
                  </Fact>
                  <Fact label="Nationality">{ib.nationality}</Fact>
                  <Fact label="Location">{ib.location}</Fact>
                  <Fact label="Education">
                    {page.educations.length > 0 &&
                      page.educations.slice(0, 2).map((e, i) => (
                        <div key={i}>
                          <Link href={`/org/${e.schoolSlug}`}>{e.schoolTitle}</Link>
                          {e.degree && <span className="muted"> ({e.degree})</span>}
                        </div>
                      ))}
                  </Fact>
                  <Fact label="Role">
                    {current.length > 0
                      ? current.map((e, i) => (
                          <div key={i}>
                            <Link href={`/org/${e.orgSlug}`}>{e.orgTitle}</Link>
                            {e.role && `, ${e.role}`}
                          </div>
                        ))
                      : ib.occupation}
                  </Fact>
                  <Fact label="Sector">{ib.sector}</Fact>
                  <Fact label="Languages">{(page.languageLevels.length > 0 || ib.languages) && <LanguagesFact page={page} />}</Fact>
                  <Fact label="Expertise">{ib.skills}</Fact>
                </tbody>
              </table>
              {exps.some((e) => e.verification === "verified") && (
                <p className="small" style={{ margin: "12px 0 0", color: "var(--ok)" }}>
                  ✓ {exps.filter((e) => e.verification === "verified").length} of {exps.length} positions verified
                </p>
              )}
            </div>
          </div>
          {hasLinks && (
            <div className="card">
              <div className="card__body">
                <div className="card__title">Links</div>
                <div className="social">
                  {ib.linkedin && (
                    <a href={`https://www.linkedin.com/in/${ib.linkedin}`} rel="nofollow ugc noopener"><LinkedInIcon /> LinkedIn</a>
                  )}
                  {ib.github && (
                    <a href={`https://github.com/${ib.github}`} rel="nofollow ugc noopener"><GitHubIcon /> GitHub</a>
                  )}
                  {ib.website && (
                    <a href={ib.website} rel="nofollow ugc noopener"><Globe /> Website</a>
                  )}
                  {ib.email && ib.emailPublic && (
                    <a href={`mailto:${ib.email}`}><Mail /> Email</a>
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
      {isPublic(page) && !isMembersOnly(page) && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(personProfileLd(page)) }} />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd([{ name: "People", path: "/people" }, { name: page.title, path: `/${page.slug}` }])) }}
          />
        </>
      )}
    </div>
  );
}
