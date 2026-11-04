import Link from "next/link";
import type { FundingRound, PageType } from "@/lib/types";
import type { PageCard } from "@/lib/pages";
import { pageHref } from "@/lib/wikitext";
import { Thumb } from "./ui";

function Investors({ list, existing }: { list: FundingRound["investors"]; existing: Map<string, PageType> }) {
  if (list.length === 0) return <>—</>;
  return (
    <>
      {list.map((inv, i) => {
        const type = existing.get(inv.slug);
        return (
          <span key={inv.slug}>
            {i > 0 && ", "}
            {type ? <Link href={pageHref(type, inv.slug)}>{inv.title}</Link> : inv.title}
          </span>
        );
      })}
    </>
  );
}

export function FundingTable({ rounds, existing }: { rounds: FundingRound[]; existing: Map<string, PageType> }) {
  const sorted = [...rounds].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr><th>Round</th><th>Year</th><th>Amount</th><th>Investors</th></tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i}>
              <td><b>{r.round || "—"}</b></td>
              <td>{r.year ?? "—"}</td>
              <td>{r.amount || "—"}</td>
              <td><Investors list={r.investors} existing={existing} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InvestmentsList({ items }: { items: { company: PageCard; rounds: FundingRound[] }[] }) {
  return (
    <ul className="entity-grid entity-grid--2">
      {items.map(({ company, rounds }) => (
        <li key={company.slug}>
          <Link href={pageHref(company.type, company.slug)} className="entity">
            <Thumb image={company.image} name={company.title} variant="logo" />
            <span style={{ minWidth: 0 }}>
              <span className="entity__name">{company.title}</span>
              <span className="entity__sub">{rounds.map((r) => [r.round, r.year].filter(Boolean).join(" ")).join(" · ")}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
