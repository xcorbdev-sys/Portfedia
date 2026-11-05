import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { listInvestors } from "@/lib/pages";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { ListFilters } from "@/components/ListFilters";
import { Pagination, paginate } from "@/components/Pagination";
import { requireFeature } from "@/lib/features";

const norm = (s: string) => s.toLocaleLowerCase("en-US").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");


export const metadata: Metadata = { title: "Investors", description: "Venture capital firms, angels and funds on Portfedia, with the companies they backed." };

export default async function InvestorsPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string; page?: string }> }) {
  await requireFeature("investors"); // the section can be switched off in Admin → Sections
  await connection();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const stage = (sp.stage ?? "").trim().slice(0, 60);
  const all = await listInvestors();
  const stages = [...new Set(all.flatMap((i) => i.stages))].sort();
  const matching = all.filter((i) => (!q || norm(i.card.title).includes(norm(q))) && (!stage || i.stages.includes(stage)));
  const { items: investors, page, pages } = paginate(matching, parseInt(sp.page ?? "1", 10) || 1);
  const params = new URLSearchParams(Object.entries({ q, stage }).filter(([, v]) => v));
  const base = params.size ? `/investors?${params}` : "/investors";
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 980 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Investors" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Investors</h1>
      <p className="muted">Funds and investment firms. The portfolio count comes from funding rounds listed on company pages.</p>
      <ListFilters action="/investors" q={q} placeholder="Search investors" selects={[{ name: "stage", label: "All stages", value: stage, options: stages.map((s) => ({ value: s, label: s })) }]} />
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
      <Pagination page={page} pages={pages} baseHref={base} />
    </div>
  );
}
