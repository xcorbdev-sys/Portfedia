import type { Metadata } from "next";
import Link from "next/link";
import { listPages } from "@/lib/pages";
import { Listing } from "@/components/Listing";

export const metadata: Metadata = { title: "People", description: "Profiles of entrepreneurs, executives, investors and professionals on Portfedia." };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const n = parseInt((await searchParams).page ?? "1", 10) || 1;
  const data = await listPages({ types: ["person"], page: n });
  return (
    <Listing
      title="People"
      intro="Entrepreneurs, executives, investors and professionals."
      crumb="People"
      baseHref="/people"
      {...data}
      empty={<>No profiles yet. <Link href="/create">Create the first one.</Link></>}
    />
  );
}
