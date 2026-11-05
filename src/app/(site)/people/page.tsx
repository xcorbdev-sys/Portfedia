import type { Metadata } from "next";
import Link from "next/link";
import { listPages, sectorsFor } from "@/lib/pages";
import { OPEN_TO } from "@/lib/types";
import { listParams, SORTS } from "@/lib/list-params";
import { Listing } from "@/components/Listing";
import { requireFeature } from "@/lib/features";

export const metadata: Metadata = { title: "People", description: "Profiles of entrepreneurs, executives, investors and professionals on Portfedia." };

type SP = Record<string, string | undefined>;

export default async function PeoplePage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireFeature("people"); // the section can be switched off in Admin → Sections
  const { values, page, href } = listParams(await searchParams, ["q", "sector", "openTo", "sort"]);
  const openTo = values.openTo in OPEN_TO ? values.openTo : "";
  const [data, sectors] = await Promise.all([
    listPages({ types: ["person"], q: values.q, sector: values.sector || undefined, openTo: openTo || undefined, sort: values.sort as never, page }),
    sectorsFor(["person"]),
  ]);
  return (
    <Listing
      title="People"
      intro="Entrepreneurs, executives, investors and professionals."
      crumb="People"
      baseHref={href("/people")}
      noun="profiles"
      {...data}
      filters={{
        action: "/people",
        q: values.q,
        placeholder: "Search people by name",
        selects: [
          { name: "sector", label: "All sectors", value: values.sector, options: sectors.map((s) => ({ value: s, label: s })) },
          { name: "openTo", label: "Open to anything", value: openTo, options: Object.entries(OPEN_TO).map(([k, v]) => ({ value: k, label: `Open to ${v.toLowerCase()}` })) },
          { name: "sort", label: "Most followed", value: values.sort, options: SORTS },
        ],
      }}
      empty={values.q || values.sector || openTo ? <>No one matches. <Link href="/people">Clear the filters.</Link></> : <>No profiles yet. <Link href="/create">Create the first one.</Link></>}
    />
  );
}
