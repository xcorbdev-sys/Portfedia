import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { listInvestors } from "@/lib/pages";
import { Breadcrumbs, Thumb } from "@/components/ui";

export const metadata: Metadata = { title: "Investors", description: "Venture capital firms, angels and funds on Portfedia, with the companies they backed." };

export default async function InvestorsPage() {
  await connection();
  const investors = await listInvestors();
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 980 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Investors" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Investors</h1>
      <p className="muted">Funds and investment firms. The portfolio count comes from funding rounds listed on company pages.</p>
      {investors.length === 0 ? (
        <div className="empty">No investor pages yet.</div>
      ) : (
        <ul className="result-list card" style={{ marginTop: 16 }}>
          {investors.map(({ card, portfolio, stages }) => (
            <li key={card.slug}>
              <Link href={`/org/${card.slug}`} className="result">
                <Thumb image={card.image} name={card.title} variant="logo" />
                <span style={{ minWidth: 0 }}>
                  <span className="result__name">{card.title}</span>
                  <span className="result__sub">
                    {[portfolio ? `${portfolio} portfolio ${portfolio === 1 ? "company" : "companies"}` : "", stages.join(", ")].filter(Boolean).join(" · ") || card.subtitle}
                  </span>
                  {card.summary && <span className="result__desc">{card.summary}</span>}
                </span>
                <span className="pill">Investor</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
