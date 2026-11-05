import { cityOf } from "@/lib/discovery";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import Link from "next/link";
import { BadgeDollarSign, Building2, CalendarDays, ExternalLink, Laptop, MapPin, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { canEditOrg, getAlumniEmployers, getInvestments, getOrgRelations, getOrgSpans, isOrgAdmin, isProtected, existingPages, getAlumni, getBacklinks, getPageBySlug, getPeopleOfOrg, isFollowing } from "@/lib/pages";
import { slugify } from "@/lib/slug";
import { pageHref, renderArticle, stripWikiLinks } from "@/lib/wikitext";
import { formatDate, initials, plainExcerpt } from "@/lib/site";
import { breadcrumbLd, eventLd, ldJson, organizationLd, softwareLd } from "@/lib/seo";
import { Breadcrumbs, Thumb, VerifiedBadge } from "@/components/ui";
import { Expandable, SectionNav } from "@/components/client";
import { PageActions } from "@/components/PageActions";
import { EntityGrid, PersonRows } from "@/components/EntityCards";
import { FundingTable, InvestmentsList } from "@/components/Funding";
import {
  AcquisitionsSection, AlumniEmployersSection, GroupSection, JobsSection, LeadershipSection, MilestonesSection, OfficesSection, PressSection, ProductsSection, TrendSection,
} from "@/components/OrgSections";
import { findRenamedPage } from "@/lib/account";
import { cachedOrgDerived } from "@/lib/cached";
import { countView } from "@/lib/views";
import { featureUnlocked, followNetwork, keyPeopleOf, makersOf, personSlugsByName, speakerProfiles, talksAtEvent, type PageCard } from "@/lib/pages";
import { NetworkSummary } from "@/components/NetworkDialog";
import { latestLaunch } from "@/lib/launches";
import { attendance, canPostUpdates, listUpdates } from "@/lib/page-social";
import { attendAction, deleteUpdateAction, postUpdateAction, restoreUpdateAction } from "@/lib/actions/page-social";
import { UndoNotice } from "@/components/UndoNotice";
import { JOB_DAYS } from "@/lib/jobs";
import { integratedBy, integrationPages, interestedPeople, listChangelog, raisingInterest } from "@/lib/org-extras";
import { raisingInterestAction } from "@/lib/actions/org-extras";
import { ORG_CATEGORIES, SAAS_PRICING } from "@/lib/types";
import { SafeImg } from "@/components/SafeImg";
import { getFeatures } from "@/lib/features";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ posted?: string; updateError?: string; removed?: string; restored?: string; interest?: string; interestError?: string }> };

const PREVIEW = 24;

const load = cache(async (slug: string) => getPageBySlug(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load((await params).slug);
  if (!page || page.type === "person") return { title: "Page not found" };
  const description = stripWikiLinks(page.summary) || plainExcerpt(page.body) || `${page.title} on Portfedia.`;
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

export default async function OrgPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { posted, updateError, removed, restored, interest: interestDone, interestError } = await searchParams;
  const page = await load(slug);
  if (!page) {
    const moved = await findRenamedPage(slug); // former names and old addresses
    if (moved) permanentRedirect(pageHref(moved.type, moved.slug));
    notFound();
  }
  if (page.type === "person") permanentRedirect(`/${page.slug}`);

  const user = await getCurrentUser();
  const features = await getFeatures();
  const investorSlugs = page.fundingRounds.flatMap((r) => r.investors.map((i) => i.slug));
  const relatedSlugs = [...page.leadership.map((l) => l.slug), ...page.acquisitions.map((a) => a.slug), page.parent?.slug ?? ""].filter(Boolean);
  const [existing, following, derived] = await Promise.all([
    existingPages([...page.outLinks.map((l) => l.slug), ...investorSlugs, ...relatedSlugs]),
    user ? isFollowing(user.id, page._id) : Promise.resolve(false),
    cachedOrgDerived(page.slug, page.type === "school"),
  ]);
  const { backlinks, people, alumni, investments, relations, spans, alumniEmployers } = derived;
  await countView(page._id, isOrgAdmin(user, page) || Boolean(user && (user.role === "admin" || user.role === "moderator")));
  const isEvent = page.category === "event" && page.event;
  const isInvestor = page.category === "investor";
  const isSaas = page.category === "saas";
  const [makers, network, launch, updates, going] = await Promise.all([
    isSaas ? makersOf(page.slug) : Promise.resolve([]),
    followNetwork(page),
    isSaas && features.launches ? latestLaunch(page._id) : Promise.resolve(null),
    features.updates ? listUpdates(page._id) : Promise.resolve([]),
    page.category === "event" && features.events ? attendance(page._id, user?.id) : Promise.resolve(null),
  ]);
  const canPost = features.updates && canPostUpdates(user, page);
  const team = await keyPeopleOf(page, people.current, makers);
  const leaderLinks = await personSlugsByName(page.leadership.filter((l) => !existing.has(l.slug)).map((l) => l.name));
  // #58: speakers link to their profiles (an exact profile address, or a name only one profile has), with photos
  // #64, #65, #70: SaaS changelog and integrations; interest in a raise
  const ownerView = canPostUpdates(user, page);
  const openJobs = page.jobs.filter((j) => j.postedAt && new Date(j.postedAt).getTime() > Date.now() - JOB_DAYS * 86400_000).length;
  const raisingOn = features.raising && page.raising?.active;
  const [changelog, integrationLinks, worksWith, interest, interested] = await Promise.all([
    isSaas ? listChangelog(page._id, 3) : Promise.resolve([]),
    isSaas ? integrationPages(page.saas?.integrations ?? []) : Promise.resolve(new Map<string, string>()),
    isSaas ? integratedBy(page.title, page.slug) : Promise.resolve([]),
    raisingOn ? raisingInterest(page._id, user?.id) : Promise.resolve({ total: 0, mine: false }),
    raisingOn && ownerView ? interestedPeople(page._id) : Promise.resolve([]),
  ]);
  const speakerCards = isEvent && page.event?.speakers.length ? await speakerProfiles(page.event.speakers) : new Map<string, PageCard>();
  const eventTalks = isEvent ? await talksAtEvent(page.title) : [];
  const brand = featureUnlocked(page.plan, "business") && page.brandColor ? page.brandColor : "";
  const canEdit = canEditOrg(user, page);
  const reserved = [
    "overview", "about", "products", "leadership", "jobs", "funding", "acquisitions", "investments", "group", "milestones", "offices", "press",
    "trend", "key-people", "people", "former-people", "alumni", "alumni-work", "connections", "sources", "network", "updates", "raising", "attending",
  ];
  const article = renderArticle(page.body, existing, reserved);
  const ib = page.infobox;
  const isSchool = page.type === "school";
  // A claimed company was verified with a work email; a SaaS project is managed by its maker, so only a moderator's badge counts
  const verified = page.verified || (page.status === "claimed" && page.category !== "saas");
  const website = ib.website ? ib.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : "";
  const keyPeople = people.current.slice(0, 6);

  const nav = [{ id: "overview", label: "Overview" }];
  if (article.leadHtml.trim()) nav.push({ id: "about", label: "About" });
  for (const t of article.toc) if (t.level === 2) nav.push({ id: t.id, label: t.title });
  if (page.products.length) nav.push({ id: "products", label: "Products" });
  if (page.leadership.length) nav.push({ id: "leadership", label: "Leadership" });
  if (page.status === "claimed" && page.jobs.length && features.jobs) nav.push({ id: "jobs", label: "Open Positions" });
  if (page.fundingRounds.length) nav.push({ id: "funding", label: "Funding" });
  if (page.acquisitions.length || relations.acquiredBy.length) nav.push({ id: "acquisitions", label: "Acquisitions" });
  if (page.category === "event" && page.event?.speakers.length) nav.push({ id: "speakers", label: "Speakers" });
  if (investments.length) nav.push({ id: "investments", label: page.category === "investor" ? "Portfolio" : "Investments" });
  if (page.parent || relations.subsidiaries.length) nav.push({ id: "group", label: "Group" });
  if (page.milestones.length) nav.push({ id: "milestones", label: "Milestones" });
  if (page.offices.length) nav.push({ id: "offices", label: "Offices" });
  if (page.press.length) nav.push({ id: "press", label: "In the Press" });
  if (team.people.length) nav.push({ id: "key-people", label: isSaas ? "Team" : "Key People" });
  if (people.current.length > keyPeople.length) nav.push({ id: "people", label: "All People" });
  if (people.former.length) nav.push({ id: "former-people", label: "Former People" });
  if (alumni.length) nav.push({ id: "alumni", label: "Alumni" });
  if (backlinks.length) nav.push({ id: "connections", label: "Connections" });
  if (page.sources.length) nav.push({ id: "sources", label: "Sources" });


  return (
    <div className="container" style={brand ? ({ "--primary": brand, "--primary-hover": brand } as React.CSSProperties) : undefined}>
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, isSaas ? { label: "SaaS Projects", href: "/saas" } : isSchool ? { label: "Education", href: "/education" } : { label: "Companies", href: "/companies" }, { label: page.title }]}
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
              !isSaas && <Link href={`/org/${page.slug}/claim`}>{page.status === "claimed" ? "Join as admin" : "Claim this page"}</Link>
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
                <Link href={`/org/${page.slug}/edit`}>Is it yours? Complete it.</Link>
              ) : (
                <Link href={`/login?next=/org/${page.slug}/edit`}>Is it yours? Log in to complete it.</Link>
              )}
            </div>
          )}
          {page.cover && <div className="p-cover" style={{ backgroundImage: `url(${page.cover.url})` }} role="img" aria-label={`${page.title} cover image`} />}
          <header className="p-head" id="overview">
            <div className="p-photo p-photo--logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {page.image ? <SafeImg src={page.image.url} alt={`${page.title} logo`} width={128} height={128} fallback={initials(page.title)} /> : initials(page.title)}
            </div>
            <div className="p-head__title">
              <h1 className="p-name">
                {page.title} {verified && <VerifiedBadge size={24} label="Verified organization" />}
              </h1>
              <div className="p-sub">
                {page.category !== "company" && <span className="pill" style={{ marginRight: 8 }}>{ORG_CATEGORIES[page.category]}</span>}
                {ib.sector || ib.kind || (isSchool ? "Educational institution" : "Organization")}
                {page.ticker && <span className="pill" style={{ marginLeft: 8 }}>{[page.ticker.exchange, page.ticker.symbol].filter(Boolean).join(": ")}</span>}
              </div>
              {features.jobs && page.status === "claimed" && openJobs > 0 && (
                <Link href="#jobs" className="hiring-chip">We&apos;re hiring · {openJobs} open position{openJobs === 1 ? "" : "s"}</Link>
              )}
              {page.formerNames.length > 0 && <div className="small muted" style={{ marginTop: -6, marginBottom: 8 }}>Formerly {page.formerNames.join(", ")}</div>}
            </div>
            <div className="p-head__body">
              {page.tags.length > 0 && (
                <div className="chips">
                  {page.tags.map((t) => (
                    <Link key={t} className="chip" href={`/tag/${slugify(t)}`}>{t}</Link>
                  ))}
                </div>
              )}
              {launch && (
                <Link href={`/launches?week=${launch.week}`} className="launched-note">
                  🚀 Launched on Portfedia · #{launch.rank} of {launch.week}
                </Link>
              )}
              <NetworkSummary slug={page.slug} name={page.title} faces={network.followers.slice(0, 4).map((c) => ({ slug: c.slug, title: c.title, image: c.image?.thumbUrl ?? c.image?.url ?? "" }))} followerTotal={page.followerCount} />
              {page.summary && <p className="p-summary">{stripWikiLinks(page.summary)}</p>}
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
              <div className="fact"><MapPin /><span><small>Headquarters</small><b>{ib.headquarters ? (features.cities && cityOf(ib.headquarters) ? <Link href={`/cities/${slugify(cityOf(ib.headquarters))}`}>{ib.headquarters}</Link> : ib.headquarters) : "—"}</b></span></div>
              <div className="fact"><Users /><span><small>Employees</small><b>{ib.employees || "—"}</b></span></div>
              <div className="fact"><Building2 /><span><small>Sector</small><b>{ib.sector || "—"}</b></span></div>
            </div>
          )}

          {isEvent && (
            <div className="facts" style={{ marginTop: 14 }}>
              <div className="fact"><CalendarDays /><span><small>When</small><b>{page.event!.start ? formatDate(page.event!.start) : "—"}{page.event!.end && page.event!.start && String(page.event!.end) !== String(page.event!.start) ? ` – ${formatDate(page.event!.end)}` : ""}</b></span></div>
              <div className="fact"><MapPin /><span><small>Where</small><b>{page.event!.city || "—"}</b></span></div>
              <div className="fact"><Users /><span><small>Speakers</small><b>{page.event!.speakers.length || "—"}</b></span></div>
              <div className="fact"><Building2 /><span><small>Format</small><b>{page.event!.format || "—"}</b></span></div>
            </div>
          )}
          {going && (
            <div className="attending" id="attending">
              {user ? (
                <form action={attendAction}>
                  <input type="hidden" name="slug" value={page.slug} />
                  <button className={`btn btn--sm${going.going ? " btn--active" : " btn--primary"}`} type="submit">{going.going ? "✓ Going" : "I'm going"}</button>
                </form>
              ) : (
                <Link className="btn btn--sm btn--primary" href={`/login?next=/org/${page.slug}`}>I&apos;m going</Link>
              )}
              <span className="small muted">{going.total.toLocaleString("en-US")} going</span>
              <span className="attending__faces">
                {going.people.slice(0, 8).map((p) => (
                  <Link key={p.slug} href={`/${p.slug}`} title={p.title}>
                    <Thumb image={p.image} name={p.title} variant="round" />
                  </Link>
                ))}
              </span>
            </div>
          )}
          {page.raising && features.raising && (
            <section className="raising-card" id="raising">
              <div className="raising-card__head">
                <span className="raising-card__badge">Raising now</span>
                <b>
                  {page.raising.stage}
                  {page.raising.amount ? ` · ${page.raising.currency} ${page.raising.amount.toLocaleString("en-US")}` : ""}
                </b>
              </div>
              {page.raising.description && <p>{page.raising.description}</p>}
              <div className="raising-card__actions">
                {page.raising.url && <a className="btn btn--sm btn--primary" href={page.raising.url} rel="nofollow noopener" target="_blank">Learn more</a>}
                {page.raising.email && <a className="btn btn--sm" href={`mailto:${page.raising.email}?subject=${encodeURIComponent(`${page.title}: investment`)}`}>Contact the founders</a>}
                {!ownerView && (
                  <form action={raisingInterestAction}>
                    <input type="hidden" name="slug" value={page.slug} />
                    <button className={`btn btn--sm${interest.mine ? " btn--active" : ""}`} type="submit">{interest.mine ? "✓ Interested" : "I'm interested"}</button>
                  </form>
                )}
                {interest.total > 0 && <span className="small muted">{interest.total} interested</span>}
              </div>
              {interestDone && interest.mine && <div className="notice notice--ok small">The founders were told you&apos;re interested. They&apos;ll get in touch if it&apos;s a fit.</div>}
              {interestError && <div className="notice notice--error small">{interestError}</div>}
              {ownerView && interested.length > 0 && (
                <details className="interested">
                  <summary>Who&apos;s interested ({interested.length}) · only you see this</summary>
                  <ul>
                    {interested.map((x, i) => (
                      <li key={i}>{x.card ? <Link href={`/${x.card.slug}`}>{x.card.title}</Link> : x.name}{x.card?.subtitle ? <span className="muted small"> · {x.card.subtitle}</span> : null} <span className="muted small">· {formatDate(x.at)}</span></li>
                    ))}
                  </ul>
                </details>
              )}
              <p className="raising-card__note">
                Information provided by {page.title}. Portfedia doesn&apos;t collect or hold money and this is not investment advice.
              </p>
            </section>
          )}
          {(updates.length > 0 || canPost) && (
            <section className="p-section" id="updates">
              <h2>Updates</h2>
              {posted && <div className="notice notice--ok small">Posted. Your followers were notified.</div>}
              {removed && canPost && <UndoNotice text="Update deleted." id={removed} action={restoreUpdateAction} fields={{ slug: page.slug }} />}
              {restored && <div className="notice notice--ok small">Update restored.</div>}
              {updateError && <div className="notice notice--error small">{updateError}</div>}
              {canPost && (
                <form action={postUpdateAction} className="update-form">
                  <input type="hidden" name="slug" value={page.slug} />
                  <textarea name="text" className="textarea textarea--plain" required minLength={5} maxLength={1000} placeholder={`Share news from ${page.title}: a launch, a hire, a milestone…`} aria-label="Update" />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input name="url" type="url" className="input" style={{ flex: "1 1 220px" }} placeholder="Link (optional)" aria-label="Link" />
                    <button className="btn btn--primary" type="submit">Post update</button>
                  </div>
                </form>
              )}
              {updates.length === 0 ? (
                <p className="small muted">No updates yet.</p>
              ) : (
                <ul className="updates">
                  {updates.map((u) => (
                    <li key={u.id}>
                      <time dateTime={new Date(u.createdAt).toISOString()}>{formatDate(u.createdAt)}</time>
                      <p>{u.text}</p>
                      {u.url && <a href={u.url} rel="nofollow ugc noopener" className="external small">{u.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}</a>}
                      {canPost && (
                        <form action={deleteUpdateAction}>
                          <input type="hidden" name="slug" value={page.slug} />
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className="read-more small">Delete</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {isSaas && (
            <div className="facts" style={{ marginTop: 14, gridTemplateColumns: "repeat(3, 1fr)" }}>
              <div className="fact"><BadgeDollarSign /><span><small>Pricing</small><b>{page.saas?.pricing ? SAAS_PRICING[page.saas.pricing] : "—"}</b></span></div>
              <div className="fact"><Laptop /><span><small>Platforms</small><b>{page.saas?.platforms.join(", ") || "—"}</b></span></div>
              <div className="fact">
                <ExternalLink />
                <span>
                  <small>Try it</small>
                  <b>{page.infobox.website ? <a href={page.infobox.website} rel="nofollow noopener" target="_blank">{page.infobox.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a> : "—"}</b>
                </span>
              </div>
            </div>
          )}
          {isSaas && (page.saas?.techStack.length || page.saas?.integrations.length || worksWith.length) ? (
            <div className="saas-meta">
              {page.saas!.techStack.length > 0 && (
                <div><small>Built with</small>{page.saas!.techStack.map((t) => <span key={t} className="chip chip--muted">{t}</span>)}</div>
              )}
              {page.saas!.integrations.length > 0 && (
                <div>
                  <small>Integrates with</small>
                  {page.saas!.integrations.map((t) => (integrationLinks.get(t) ? <Link key={t} className="chip" href={`/org/${integrationLinks.get(t)}`}>{t}</Link> : <span key={t} className="chip chip--muted">{t}</span>))}
                </div>
              )}
              {worksWith.length > 0 && (
                <div><small>Works with it</small>{worksWith.map((c) => <Link key={c.slug} className="chip" href={`/org/${c.slug}`}>{c.title}</Link>)}</div>
              )}
            </div>
          ) : null}
          {isSaas && (changelog.length > 0 || ownerView) && (
            <section className="p-section" id="changelog">
              <h2>Changelog</h2>
              {changelog.length === 0 ? (
                <p className="small muted">No releases yet. <Link href={`/org/${page.slug}/changelog`}>Add your first release</Link>.</p>
              ) : (
                <ol className="changelog">
                  {changelog.map((r) => (
                    <li key={r.id}>
                      <div className="changelog__head">{r.version && <span className="chip">{r.version}</span>}<b>{r.title}</b><time>{formatDate(r.createdAt)}</time></div>
                    </li>
                  ))}
                </ol>
              )}
              <p style={{ marginTop: 10 }}><Link className="link-arrow" href={`/org/${page.slug}/changelog`}>{ownerView ? "Add a release · full changelog" : "Full changelog"}</Link></p>
            </section>
          )}
          {isSaas && page.sectors.length > 0 && (
            <p className="small" style={{ margin: "10px 0 0" }}>
              <Link href={`/saas/${page.slug}/alternatives`}>{page.title} alternatives →</Link>
            </p>
          )}
          {isInvestor && page.investor && (page.investor.fundSize || page.investor.stages.length || page.investor.focus.length) ? (
            <div className="facts" style={{ marginTop: 14, gridTemplateColumns: "repeat(3, 1fr)" }}>
              <div className="fact"><Building2 /><span><small>Fund size</small><b>{page.investor.fundSize || "—"}</b></span></div>
              <div className="fact"><Users /><span><small>Stages</small><b>{page.investor.stages.join(", ") || "—"}</b></span></div>
              <div className="fact"><MapPin /><span><small>Focus</small><b>{page.investor.focus.join(", ") || "—"}</b></span></div>
            </div>
          ) : null}
          {article.leadHtml.trim() && (
            <section className="p-section" id="about">
              <h2>About</h2>
              <Expandable>
                <div className="prose" dangerouslySetInnerHTML={{ __html: article.leadHtml }} />
              </Expandable>
            </section>
          )}
          <div className="two-cards">
            <div className="card" id="key-people">
              <div className="card__body">
                <div className="card__title">{isSaas ? "Team" : "Key People"}</div>
                {team.people.length ? (
                  <PersonRows items={team.people.slice(0, 8)} />
                ) : (
                  <p className="muted small" style={{ margin: 0 }}>
                    {isSaas
                      ? `No team yet. Makers who add ${page.title} to the projects on their profile appear here.`
                      : `No one has listed ${page.title} as their current workplace yet.`}
                  </p>
                )}
              </div>
            </div>
            <div className="card">
              <div className="card__body">
                <div className="card__title">Key Facts</div>
                <table className="kv">
                  <tbody>
                    <Fact label="Type">{ib.kind || (isSchool ? "Educational institution" : isSaas ? "SaaS product" : "Company")}</Fact>
                    <Fact label="Founded">{ib.founded ? String(ib.founded) : ""}</Fact>
                    <Fact label="Founders">
                      {ib.founders
                        ? ib.founders.split(/(,|;|&|\band\b)/).map((part, i) => {
                            const slug = team.founderLinks[part.trim()];
                            return slug ? <Link key={i} href={`/${slug}`}>{part}</Link> : <span key={i}>{part}</span>;
                          })
                        : ""}
                    </Fact>
                    <Fact label="Headquarters">{ib.headquarters}</Fact>
                    <Fact label="Sector">{ib.sector}</Fact>
                    <Fact label="Employees">{ib.employees}</Fact>
                    <Fact label="Parent">{page.parent ? (existing.get(page.parent.slug) ? <Link href={`/org/${page.parent.slug}`}>{page.parent.title}</Link> : page.parent.title) : ""}</Fact>
                    <Fact label="Stock">{page.ticker ? [page.ticker.exchange, page.ticker.symbol].filter(Boolean).join(": ") : ""}</Fact>
                    <Fact label="Website">
                      {website && <a href={ib.website} rel="nofollow ugc noopener" className="external">{website}</a>}
                    </Fact>
                    <Fact label="Status">
                      {isSaas && page.status === "claimed" ? (
                        <span style={{ color: "var(--ok)" }}>Managed by its maker</span>
                      ) : verified ? (
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
          {article.restHtml.trim() && <div className="prose" dangerouslySetInnerHTML={{ __html: article.restHtml }} />}

          {isEvent && page.event!.speakers.length > 0 && (
            <section className="p-section" id="speakers">
              <h2>Speakers</h2>
              <ul className="speakers">
                {page.event!.speakers.map((sp) => {
                  const card = speakerCards.get(sp.name);
                  return (
                    <li key={sp.name}>
                      {card ? (
                        <Link href={`/${card.slug}`}>
                          <Thumb image={card.image} name={card.title} />
                          <span><b>{card.title}</b>{card.subtitle && <small>{card.subtitle}</small>}</span>
                        </Link>
                      ) : (
                        <span className="speakers__plain"><Thumb image={null} name={sp.name} /><span><b>{sp.name}</b></span></span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {isEvent && page.event!.sponsors.length > 0 && (
            <section className="p-section" id="sponsors">
              <h2>Sponsors</h2>
              <div className="chips">
                {page.event!.sponsors.map((sp) => (
                  <Link key={sp.slug} className="chip" href={`/org/${sp.slug}`}>{sp.title}</Link>
                ))}
              </div>
            </section>
          )}
          {eventTalks.length > 0 && (
            <section className="p-section" id="talks">
              <h2>Talks at {page.title}</h2>
              <ul className="item-list">
                {eventTalks.map((t, i) => (
                  <li key={i}>
                    <span>
                      {t.url ? <a href={t.url} rel="nofollow noopener" className="external">{t.title}</a> : t.title}
                      <small><Link href={`/${t.person.slug}`}>{t.person.title}</Link>{t.year ? ` · ${t.year}` : ""}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <ProductsSection page={page} />
          <LeadershipSection page={page} existing={existing} byName={leaderLinks} />
          {features.jobs && <JobsSection page={page} />}
          {page.fundingRounds.length > 0 && (
            <section className="p-section" id="funding">
              <h2>Funding</h2>
              <FundingTable rounds={page.fundingRounds} existing={existing} />
            </section>
          )}
          <AcquisitionsSection page={page} existing={existing} acquiredBy={relations.acquiredBy} />
          {investments.length > 0 && (
            <section className="p-section" id="investments">
              <h2>{isInvestor ? "Portfolio" : "Investments"}</h2>
              <InvestmentsList items={investments} />
            </section>
          )}
          <GroupSection page={page} existing={existing} subsidiaries={relations.subsidiaries} />
          <MilestonesSection page={page} />
          <OfficesSection page={page} />
          <PressSection page={page} />
          <TrendSection spans={spans} />
          {page.type === "school" && <AlumniEmployersSection rows={alumniEmployers} />}


          {people.current.length > keyPeople.length && (
            <section className="p-section" id="people">
              <h2>All People</h2>
              <EntityGrid items={people.current.slice(0, PREVIEW)} className="entity-grid--3" />
              {people.current.length > PREVIEW && (
                <p style={{ marginTop: 10 }}>
                  <Link className="link-arrow" href={`/org/${page.slug}/people?list=current`}>See all {people.current.length}</Link>
                </p>
              )}
            </section>
          )}
          {people.former.length > 0 && (
            <section className="p-section" id="former-people">
              <h2>Former People</h2>
              <EntityGrid items={people.former.slice(0, PREVIEW)} className="entity-grid--3" />
              {people.former.length > PREVIEW && (
                <p style={{ marginTop: 10 }}>
                  <Link className="link-arrow" href={`/org/${page.slug}/people?list=former`}>See all {people.former.length}</Link>
                </p>
              )}
            </section>
          )}
          {alumni.length > 0 && (
            <section className="p-section" id="alumni">
              <h2>Alumni</h2>
              <EntityGrid items={alumni.slice(0, PREVIEW)} className="entity-grid--3" />
              {page.type === "school" && (
                <p style={{ marginTop: 10 }}>
                  <Link className="link-arrow" href={`/org/${page.slug}/alumni`}>Alumni network: all {alumni.length}, by year, field and employer</Link>
                </p>
              )}
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
      {softwareLd(page) && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(softwareLd(page)) }} />}
      {eventLd(page) && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(eventLd(page)) }} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd([isSaas ? { name: "SaaS Projects", path: "/saas" } : isSchool ? { name: "Education", path: "/education" } : { name: "Companies", path: "/companies" }, { name: page.title, path: `/org/${page.slug}` }])) }}
      />
    </div>
  );
}
