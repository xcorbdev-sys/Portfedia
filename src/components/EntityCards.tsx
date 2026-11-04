import Link from "next/link";
import type { PageCard } from "@/lib/pages";
import { pageHref } from "@/lib/wikitext";
import { Thumb, VerifiedBadge } from "./ui";

const TYPE_LABEL = { person: "Person", org: "Company", school: "Institution" } as const;

export function EntityGrid({ items, className = "" }: { items: PageCard[]; className?: string }) {
  return (
    <ul className={`entity-grid ${className}`}>
      {items.map((c) => (
        <li key={c.slug}>
          <Link href={pageHref(c.type, c.slug)} className="entity">
            <Thumb image={c.image} name={c.title} variant={c.type === "person" ? "square" : "logo"} />
            <span style={{ minWidth: 0 }}>
              <span className="entity__name">
                {c.title} {c.verified && <VerifiedBadge size={15} />}
              </span>
              <span className="entity__sub">{c.subtitle || c.summary}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ResultList({ items }: { items: PageCard[] }) {
  return (
    <ul className="result-list card">
      {items.map((c) => (
        <li key={c.slug}>
          <Link href={pageHref(c.type, c.slug)} className="result">
            <Thumb image={c.image} name={c.title} variant={c.type === "person" ? "square" : "logo"} />
            <span style={{ minWidth: 0 }}>
              <span className="result__name">
                {c.title} {c.verified && <VerifiedBadge size={16} />}
              </span>
              {c.subtitle && <span className="result__sub">{c.subtitle}</span>}
              {c.summary && <span className="result__desc">{c.summary}</span>}
            </span>
            <span className="pill">{TYPE_LABEL[c.type]}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PersonRows({ items }: { items: PageCard[] }) {
  return (
    <div>
      {items.map((c) => (
        <Link key={c.slug} href={`/${c.slug}`} className="person-row">
          <Thumb image={c.image} name={c.title} variant="round" />
          <span>
            <b>{c.title}</b>
            <small>{c.detail || c.subtitle}</small>
          </span>
        </Link>
      ))}
    </div>
  );
}
