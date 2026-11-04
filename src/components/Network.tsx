import Link from "next/link";
import type { PageCard } from "@/lib/pages";
import { pageHref } from "@/lib/wikitext";
import { Thumb } from "./ui";
import { initials } from "@/lib/site";

function People({ title, items, total, empty }: { title: string; items: PageCard[]; total: number; empty: string }) {
  return (
    <div className="card network">
      <div className="card__body">
        <div className="card__title">
          {title} <span className="muted">· {total.toLocaleString("en-US")}</span>
        </div>
        {items.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            {total > 0 ? `${total.toLocaleString("en-US")} member${total === 1 ? "" : "s"} without a public profile.` : empty}
          </p>
        ) : (
          <ul className="network__list">
            {items.map((c) => (
              <li key={c.slug}>
                <Link href={pageHref(c.type, c.slug)} title={c.subtitle ? `${c.title} · ${c.subtitle}` : c.title}>
                  <Thumb image={c.image} name={c.title} variant={c.type === "person" ? "round" : "logo"} />
                  <span>{c.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {total > items.length && items.length > 0 && <p className="small muted" style={{ margin: "10px 0 0" }}>and {(total - items.length).toLocaleString("en-US")} more</p>}
      </div>
    </div>
  );
}

/** Compact line under the page title: a few follower photos and the counts, linking to the full lists below. */
export function NetworkSummary({ followers, followerTotal, followingTotal }: { followers: PageCard[]; followerTotal: number; followingTotal?: number }) {
  const faces = followers.slice(0, 4);
  return (
    <a className="net-summary" href="#network">
      {faces.length > 0 && (
        <span className="net-summary__faces" aria-hidden="true">
          {faces.map((c) =>
            c.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={c.slug} src={c.image.thumbUrl ?? c.image.url} alt="" width={22} height={22} />
            ) : (
              <span key={c.slug} className="net-summary__initials">{initials(c.title)}</span>
            ),
          )}
        </span>
      )}
      <span>
        <b>{followerTotal.toLocaleString("en-US")}</b> follower{followerTotal === 1 ? "" : "s"}
      </span>
      {followingTotal !== undefined && (
        <>
          <span className="net-summary__dot" aria-hidden="true">·</span>
          <span>
            <b>{followingTotal.toLocaleString("en-US")}</b> following
          </span>
        </>
      )}
    </a>
  );
}

/**
 * Followers and following. A person's profile shows both; company and SaaS pages show their followers.
 * Followers are listed by their own profiles; members without a public profile are only counted.
 */
export function NetworkSection({
  name,
  followers,
  followerTotal,
  following,
  followingTotal,
}: {
  name: string;
  followers: PageCard[];
  followerTotal: number;
  following?: PageCard[];
  followingTotal?: number;
}) {
  return (
    <section className="p-section" id="network">
      <h2>{following ? "Network" : "Followers"}</h2>
      <div className={following ? "two-cards" : ""} style={{ marginTop: 0 }}>
        <People title="Followers" items={followers} total={followerTotal} empty={`Nobody follows ${name} yet.`} />
        {following && <People title="Following" items={following} total={followingTotal ?? following.length} empty={`${name} doesn't follow any pages yet.`} />}
      </div>
    </section>
  );
}
