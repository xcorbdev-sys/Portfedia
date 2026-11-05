import type { Metadata } from "next";
import Link from "next/link";
import { listPages, sectorsFor } from "@/lib/pages";
import { listParams, SORTS } from "@/lib/list-params";
import { Listing } from "@/components/Listing";
import { requireFeature } from "@/lib/features";

export const metadata: Metadata = { title: "Mentors", description: "Experienced people on Portfedia who are open to mentoring." };

type SP = Record<string, string | undefined>;

/** People who ticked "Open to mentoring" on their profile. Contact them through the links on their profile. */
export default async function MentorsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireFeature("mentors"); // the section can be switched off in Admin → Sections
  const { values, page, href } = listParams(await searchParams, ["q", "sector", "sort"]);
  const [data, sectors] = await Promise.all([
    listPages({ types: ["person"], openTo: "mentoring", q: values.q, sector: values.sector || undefined, sort: values.sort as never, page }),
    sectorsFor(["person"]),
  ]);
  return (
    <Listing
      title="Mentors"
      intro="People who are open to mentoring. Open a profile to see how to reach them. Want to help others? Tick “Open to mentoring” in your profile."
      crumb="Mentors"
      baseHref={href("/mentors")}
      noun="mentors"
      {...data}
      filters={{
        action: "/mentors",
        q: values.q,
        placeholder: "Search mentors by name",
        selects: [
          { name: "sector", label: "All sectors", value: values.sector, options: sectors.map((s) => ({ value: s, label: s })) },
          { name: "sort", label: "Most followed", value: values.sort, options: SORTS },
        ],
      }}
      empty={values.q || values.sector ? <>No mentor matches. <Link href="/mentors">Clear the filters.</Link></> : <>No mentors yet. <Link href="/edit">Offer mentoring on your profile.</Link></>}
    />
  );
}
