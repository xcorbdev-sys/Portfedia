import type { Metadata } from "next";
import Link from "next/link";
import { listPages } from "@/lib/pages";
import { Listing } from "@/components/Listing";

export const metadata: Metadata = { title: "Companies", description: "Companies, holdings, funds and institutions on Portfedia." };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<{ page?: string; sector?: string }> }) {
  const sp = await searchParams;
  const sector = sp.sector?.slice(0, 80);
  const data = await listPages({ types: ["org", "school"], sector, page: parseInt(sp.page ?? "1", 10) || 1 });
  return (
    <Listing
      title={sector ? `Companies in ${sector}` : "Companies"}
      intro={sector ? "Organizations in this sector." : "Companies, holdings, funds and institutions."}
      crumb="Companies"
      baseHref={sector ? `/companies?sector=${encodeURIComponent(sector)}` : "/companies"}
      {...data}
      empty={<>No companies yet. <Link href="/create?type=org">Add one.</Link></>}
    />
  );
}
