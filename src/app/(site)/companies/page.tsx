import type { Metadata } from "next";
import Link from "next/link";
import { listPages, sectorsFor } from "@/lib/pages";
import { ORG_CATEGORIES, type OrgCategory } from "@/lib/types";
import { listParams, SORTS } from "@/lib/list-params";
import { Listing } from "@/components/Listing";
import { requireFeature } from "@/lib/features";

export const metadata: Metadata = { title: "Companies", description: "Companies, holdings, funds and organizations on Portfedia." };

type SP = Record<string, string | undefined>;

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireFeature("companies"); // the section can be switched off in Admin → Sections
  const { values, page, href } = listParams(await searchParams, ["q", "sector", "category", "sort"]);
  // SaaS projects (/saas) and universities and schools (/education) have their own sections
  const category = values.category in ORG_CATEGORIES && values.category !== "saas" ? (values.category as OrgCategory) : undefined;
  const [data, sectors] = await Promise.all([
    listPages({ types: ["org"], q: values.q, sector: values.sector || undefined, category, excludeCategory: "saas", sort: values.sort as never, page }),
    sectorsFor(["org"], undefined, "saas"),
  ]);
  const filtered = Boolean(values.q || values.sector || category);
  return (
    <Listing
      title={values.sector ? `Companies in ${values.sector}` : "Companies"}
      intro="Companies, holdings, funds and other organizations."
      crumb="Companies"
      baseHref={href("/companies")}
      noun="companies"
      {...data}
      filters={{
        action: "/companies",
        q: values.q,
        placeholder: "Search companies by name",
        selects: [
          { name: "sector", label: "All sectors", value: values.sector, options: sectors.map((s) => ({ value: s, label: s })) },
          {
            name: "category",
            label: "All types",
            value: category ?? "",
            options: Object.entries(ORG_CATEGORIES).filter(([k]) => k !== "saas").map(([k, v]) => ({ value: k, label: v })),
          },
          { name: "sort", label: "Most followed", value: values.sort, options: SORTS },
        ],
      }}
      empty={filtered ? <>No company matches. <Link href="/companies">Clear the filters.</Link></> : <>No companies yet. <Link href="/create?type=org">Add one.</Link></>}
    />
  );
}
