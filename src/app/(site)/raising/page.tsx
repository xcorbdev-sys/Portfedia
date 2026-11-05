import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Bell, BellOff } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listRaising, raiseNotifications } from "@/lib/raising";
import { RAISE_STAGES } from "@/lib/types";
import { pageHref } from "@/lib/wikitext";
import { raiseNotificationsAction } from "@/lib/actions/raising";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { ListFilters } from "@/components/ListFilters";
import { Pagination } from "@/components/Pagination";

export const metadata: Metadata = { title: "Raising now", description: "Companies and SaaS projects on Portfedia that are raising money now." };

type SP = { q?: string; stage?: string; sector?: string; page?: string };

export default async function RaisingPage({ searchParams }: { searchParams: Promise<SP> }) {
  await connection();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const stage = (RAISE_STAGES as readonly string[]).includes(sp.stage ?? "") ? sp.stage! : "";
  const sector = (sp.sector ?? "").trim().slice(0, 80);
  const user = await getCurrentUser();
  const [data, subscribed] = await Promise.all([
    listRaising({ q, stage, sector, page: parseInt(sp.page ?? "1", 10) || 1 }),
    user ? raiseNotifications(user.id) : Promise.resolve(false),
  ]);
  const params = new URLSearchParams(Object.entries({ q, stage, sector }).filter(([, v]) => v));
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 1000 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Raising now" }]} />
      <div className="section__head" style={{ marginTop: 10 }}>
        <div>
          <h1 className="section__title">Raising now</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>Companies and SaaS projects looking for investment. Contact them directly from their page.</p>
        </div>
        {user ? (
          <form action={raiseNotificationsAction}>
            <input type="hidden" name="on" value={subscribed ? "0" : "1"} />
            <button className="btn btn--sm" type="submit">{subscribed ? <><BellOff size={14} /> Stop notifications</> : <><Bell size={14} /> Notify me about new raises</>}</button>
          </form>
        ) : (
          <Link className="btn btn--sm" href="/login?next=/raising"><Bell size={14} /> Notify me about new raises</Link>
        )}
      </div>
      <ListFilters
        action="/raising"
        q={q}
        placeholder="Search companies"
        selects={[
          { name: "stage", label: "Any round", value: stage, options: RAISE_STAGES.map((s) => ({ value: s, label: s })) },
          { name: "sector", label: "Any sector", value: sector, options: data.sectors.map((s) => ({ value: s, label: s })) },
        ]}
      />
      {data.items.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>
          {params.size ? "Nothing matches your search." : <>Nobody is raising right now. Founders can add a round in the <b>Fundraising</b> part of their page.</>}
        </div>
      ) : (
        <ul className="result-list card" style={{ marginTop: 16 }}>
          {data.items.map(({ card, raising, saas }) => (
            <li key={card.slug}>
              <Link href={`${pageHref(card.type, card.slug)}#raising`} className="result">
                <Thumb image={card.image} name={card.title} variant="logo" />
                <span style={{ minWidth: 0 }}>
                  <span className="result__name">{card.title}</span>
                  <span className="result__sub">{[card.subtitle, saas ? "SaaS" : ""].filter(Boolean).join(" · ")}</span>
                  {raising?.description && <span className="result__desc">{raising.description}</span>}
                </span>
                <span className="raising-pill">
                  {raising?.stage}
                  {raising?.amount ? ` · ${raising.currency} ${Number(raising.amount).toLocaleString("en-US")}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={data.page} pages={data.pages} baseHref={params.size ? `/raising?${params}` : "/raising"} />
      <p className="small muted" style={{ marginTop: 20 }}>
        Information is provided by the companies themselves. Portfedia doesn&apos;t collect, hold or transfer money, doesn&apos;t check these
        claims and nothing here is an offer or investment advice.
      </p>
    </div>
  );
}
