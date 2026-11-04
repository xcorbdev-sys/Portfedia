import type { Metadata } from "next";
import { listPages } from "@/lib/pages";
import { Listing } from "@/components/Listing";

export const metadata: Metadata = { title: "Education", description: "Universities, schools and other educational institutions on Portfedia, with their alumni." };

export default async function EducationPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const data = await listPages({ types: ["school"], page: parseInt(sp.page ?? "1", 10) || 1 });
  return (
    <Listing
      title="Education"
      intro="Universities, schools and institutes. People add them from the education section of their profile."
      crumb="Education"
      baseHref="/education"
      {...data}
      empty={<>No universities or schools yet. They appear when people add their education to their profile.</>}
    />
  );
}
