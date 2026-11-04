import type { Metadata } from "next";
import Link from "next/link";
import { listPages } from "@/lib/pages";
import { Listing } from "@/components/Listing";

export const metadata: Metadata = { title: "SaaS Projects", description: "Software products introduced by their makers on Portfedia." };

export default async function SaasPage({ searchParams }: { searchParams: Promise<{ page?: string; sector?: string }> }) {
  const sp = await searchParams;
  const sector = sp.sector?.slice(0, 80);
  const data = await listPages({ types: ["org"], category: "saas", sector, page: parseInt(sp.page ?? "1", 10) || 1 });
  return (
    <Listing
      title={sector ? `SaaS projects in ${sector}` : "SaaS Projects"}
      intro="Software products introduced by the people who build them."
      crumb="SaaS Projects"
      baseHref={sector ? `/saas?sector=${encodeURIComponent(sector)}` : "/saas"}
      {...data}
      empty={<>No SaaS projects yet. <Link href="/create?type=saas">Add yours.</Link></>}
    />
  );
}
