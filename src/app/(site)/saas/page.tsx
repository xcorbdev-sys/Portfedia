import type { Metadata } from "next";
import Link from "next/link";
import { listPages, sectorsFor } from "@/lib/pages";
import { SAAS_PRICING } from "@/lib/types";
import { listParams, SORTS } from "@/lib/list-params";
import { Listing } from "@/components/Listing";
import { requireFeature } from "@/lib/features";

export const metadata: Metadata = { title: "SaaS Projects", description: "Software products introduced by their makers on Portfedia." };

type SP = Record<string, string | undefined>;

export default async function SaasPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireFeature("saas"); // the section can be switched off in Admin → Sections
  const { values, page, href } = listParams(await searchParams, ["q", "sector", "pricing", "sort"]);
  const pricing = values.pricing in SAAS_PRICING ? values.pricing : "";
  const [data, sectors] = await Promise.all([
    listPages({ types: ["org"], category: "saas", q: values.q, sector: values.sector || undefined, pricing: pricing || undefined, sort: values.sort as never, page }),
    sectorsFor(["org"], "saas"),
  ]);
  const filtered = Boolean(values.q || values.sector || pricing);
  return (
    <Listing
      title={values.sector ? `SaaS projects in ${values.sector}` : "SaaS Projects"}
      intro="Software products introduced by the people who build them. See this week's launches on the Launches page."
      crumb="SaaS Projects"
      baseHref={href("/saas")}
      noun="projects"
      {...data}
      saveSearch={{ kind: "saas", q: values.q, sector: values.sector }}
      filters={{
        action: "/saas",
        q: values.q,
        placeholder: "Search SaaS projects by name",
        selects: [
          { name: "sector", label: "All categories", value: values.sector, options: sectors.map((s) => ({ value: s, label: s })) },
          { name: "pricing", label: "Any pricing", value: pricing, options: Object.entries(SAAS_PRICING).map(([k, v]) => ({ value: k, label: v })) },
          { name: "sort", label: "Most followed", value: values.sort, options: SORTS },
        ],
      }}
      empty={filtered ? <>No project matches. <Link href="/saas">Clear the filters.</Link></> : <>No SaaS projects yet. <Link href="/create?type=saas">Add yours.</Link></>}
    />
  );
}
