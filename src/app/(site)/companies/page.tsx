import type { Metadata } from "next";
import Link from "next/link";
import { listPages } from "@/lib/pages";
import { Listing } from "@/components/Listing";

export const metadata: Metadata = { title: "Companies", description: "Companies, holdings, funds and institutions on Portfedia." };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ page?: string; sector?: string }> }) {
  const sp = await searchParams;
  const sector = sp.sector?.slice(0, 80);
  // SaaS projects have their own section (/saas)
  // SaaS projects (/saas) and universities and schools (/education) have their own sections
  const data = await listPages({ types: ["org"], sector, excludeCategory: "saas", page: parseInt(sp.page ?? "1", 10) || 1 });
  return (
    <Listing
      title={sector ? `Companies in ${sector}` : "Companies"}
      intro={sector ? "Organizations in this sector." : "Companies, holdings, funds and other organizations."}
      crumb="Companies"
      baseHref={sector ? `/companies?sector=${encodeURIComponent(sector)}` : "/companies"}
      {...data}
      empty={<>No companies yet. <Link href="/create?type=org">Add one.</Link></>}
    />
  );
}
