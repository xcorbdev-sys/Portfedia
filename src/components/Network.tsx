import Link from "next/link";
import type { PageCard } from "@/lib/pages";
import { pageHref } from "@/lib/wikitext";
import { Thumb } from "./ui";

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
