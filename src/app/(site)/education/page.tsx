import type { Metadata } from "next";
import Link from "next/link";
import { listPages } from "@/lib/pages";
import { listParams, SORTS } from "@/lib/list-params";
import { Listing } from "@/components/Listing";

export const metadata: Metadata = { title: "Education", description: "Universities, schools and other educational institutions on Portfedia, with their alumni." };

type SP = Record<string, string | undefined>;

export default async function EducationPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { values, page, href } = listParams(await searchParams, ["q", "sort"]);
  const data = await listPages({ types: ["school"], q: values.q, sort: values.sort as never, page });
  return (
    <Listing
      title="Education"
      intro="Universities, schools and institutes. People add them from the education section of their profile."
      crumb="Education"
      baseHref={href("/education")}
      noun="institutions"
      {...data}
      filters={{
        action: "/education",
        q: values.q,
        placeholder: "Search universities and schools",
        selects: [{ name: "sort", label: "Most followed", value: values.sort, options: SORTS }],
      }}
      empty={values.q ? <>Nothing matches. <Link href="/education">Clear the search.</Link></> : <>No universities or schools yet. They appear when people add their education to their profile.</>}
    />
  );
}
