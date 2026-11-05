import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser, isModerator } from "@/lib/auth";
import { communityMembers, isMember, listPosts, sectorFromSlug } from "@/lib/communities";
import { deleteCommunityPostAction, joinCommunityAction, postCommunityAction, reportCommunityPostAction } from "@/lib/actions/communities";
import { listPages } from "@/lib/pages";
import { cachedJobs } from "@/lib/cached";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { EntityGrid } from "@/components/EntityCards";
import { featureOn, getFeatures, requireFeature } from "@/lib/features";
import { formatDateTime } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!(await featureOn("communities"))) return {};
  const sector = sectorFromSlug((await params).slug);
  return sector
    ? { title: `${sector} community`, description: `People, companies, jobs and conversations in ${sector} on Portfedia.`, alternates: { canonical: `/sectors/${(await params).slug}` } }
    : { title: "Sector not found" };
}

/** #56: a sector's community: members, their posts, and the sector's people, companies and jobs. */
export default async function SectorCommunityPage({ params, searchParams }: Props) {
  await requireFeature("communities");
  await connection();
  const { slug } = await params;
  const sector = sectorFromSlug(slug);
  if (!sector) notFound();
  const sp = await searchParams;
  const user = await getCurrentUser();
  const features = await getFeatures();
  const [joined, members, posts, people, companies, jobs] = await Promise.all([
    user ? isMember(user.id, sector) : Promise.resolve(false),
    communityMembers(sector),
    listPosts(sector, user?.id ?? null),
    listPages({ types: ["person"], sector, perPage: 6 }),
    listPages({ types: ["org"], sector, excludeCategory: "saas", perPage: 6 }),
    features.jobs ? cachedJobs().then((all) => all.filter((l) => l.org.sectors.includes(sector)).slice(0, 8)) : Promise.resolve([]),
  ]);
  const mod = isModerator(user);
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <Breadcrumbs items={[{ label: "Sectors", href: "/sectors" }, { label: sector }]} />
      <div className="section__head" style={{ marginTop: 10 }}>
        <div>
          <h1 className="section__title">{sector}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {members.total.toLocaleString("en-US")} member{members.total === 1 ? "" : "s"} · {people.total} people · {companies.total} companies
          </p>
        </div>
        <form action={joinCommunityAction}>
          <input type="hidden" name="sector" value={slug} />
          <button className={`btn${joined ? " btn--active" : " btn--primary"}`} type="submit">{joined ? "✓ Joined" : "Join community"}</button>
        </form>
      </div>
      {sp.joined && <div className="notice notice--ok">Welcome to the {sector} community.</div>}
      {sp.left && <div className="notice notice--ok">You left the community.</div>}

      <div className="community">
        <section id="posts">
          <h2 className="section__title" style={{ fontSize: "1.15rem" }}>Posts</h2>
          {sp.posted && <div className="notice notice--ok small">Posted.</div>}
          {sp.removed && <div className="notice notice--ok small">Post removed.</div>}
          {sp.reported && <div className="notice notice--ok small">Thanks, our moderators will take a look.</div>}
          {sp.error && <div className="notice notice--error small">{sp.error}</div>}
          {joined ? (
            <form action={postCommunityAction} className="update-form">
              <input type="hidden" name="sector" value={slug} />
              <textarea name="text" className="textarea textarea--plain" required minLength={5} maxLength={2000} placeholder={`Ask a question or share news with the ${sector} community…`} aria-label="Post" />
              <button className="btn btn--primary btn--sm" type="submit" style={{ justifySelf: "end" }}>Post</button>
            </form>
          ) : (
            <p className="small muted">{user ? "Join the community to post." : <><Link href={`/login?next=/sectors/${slug}`}>Log in</Link> and join to post.</>}</p>
          )}
          {posts.length === 0 ? (
            <div className="empty">No posts yet. Start the conversation.</div>
          ) : (
            <ul className="posts">
              {posts.map((p) => (
                <li key={p.id}>
                  <div className="posts__head">
                    <Thumb image={p.author.image ? { key: "", url: p.author.image } : null} name={p.author.name} />
                    <span>
                      {p.author.slug ? <Link href={`/${p.author.slug}`}><b>{p.author.name}</b></Link> : <b>{p.author.name}</b>}
                      <time>{formatDateTime(p.createdAt)}</time>
                    </span>
                  </div>
                  <p>{p.text}</p>
                  {user && (
                    <div className="posts__tools">
                      {(p.mine || mod) && (
                        <form action={deleteCommunityPostAction}>
                          <input type="hidden" name="sector" value={slug} />
                          <input type="hidden" name="id" value={p.id} />
                          <button className="btn btn--sm btn--ghost" type="submit">Delete</button>
                        </form>
                      )}
                      {!p.mine && (
                        <form action={reportCommunityPostAction}>
                          <input type="hidden" name="sector" value={slug} />
                          <input type="hidden" name="id" value={p.id} />
                          <button className="btn btn--sm btn--ghost" type="submit">Report</button>
                        </form>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside>
          {members.people.length > 0 && (
            <div className="card">
              <div className="card__body">
                <div className="card__title">Members</div>
                <ul className="mini-people">
                  {members.people.map((m) => (
                    <li key={m.slug}>
                      <Link href={`/${m.slug}`}><Thumb image={m.image} name={m.title} /><span>{m.title}</span></Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {jobs.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card__body">
                <div className="card__title">Jobs</div>
                <ul className="mini-jobs">
                  {jobs.map(({ org, job }) => (
                    <li key={`${org.slug}-${job.id}`}>
                      <Link href={`/jobs/${org.slug}/${job.id}`}>{job.title}</Link>
                      <span className="small muted"> · {org.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>
      {people.items.length > 0 && (
        <section style={{ marginTop: 26 }}>
          <div className="section__head">
            <h2 className="section__title" style={{ fontSize: "1.15rem" }}>People in {sector}</h2>
            {features.people && <Link className="link-arrow" href={`/people?sector=${encodeURIComponent(sector)}`}>All {people.total}</Link>}
          </div>
          <EntityGrid items={people.items} />
        </section>
      )}
      {companies.items.length > 0 && (
        <section style={{ marginTop: 26 }}>
          <div className="section__head">
            <h2 className="section__title" style={{ fontSize: "1.15rem" }}>Companies in {sector}</h2>
            {features.companies && <Link className="link-arrow" href={`/companies?sector=${encodeURIComponent(sector)}`}>All {companies.total}</Link>}
          </div>
          <EntityGrid items={companies.items} />
        </section>
      )}
    </div>
  );
}
