"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

export function FeaturedTabs({
  people,
  companies,
  hasPeople,
  hasCompanies,
}: {
  people: React.ReactNode;
  companies: React.ReactNode;
  hasPeople: boolean;
  hasCompanies: boolean;
}) {
  const [tab, setTab] = useState<"people" | "companies">("people");
  const empty = tab === "people" ? !hasPeople : !hasCompanies;
  return (
    <>
      <div className="section__head">
        <h2 className="section__title">Featured</h2>
        <Link className="link-arrow" href={tab === "people" ? "/people" : "/companies"}>
          View all <ArrowRight size={15} />
        </Link>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "people"} onClick={() => setTab("people")}>People</button>
        <button role="tab" aria-selected={tab === "companies"} onClick={() => setTab("companies")}>Companies</button>
      </div>
      <div role="tabpanel">
        {empty ? (
          <div className="empty">
            Nothing here yet. <Link href="/create">Be the first to create a profile.</Link>
          </div>
        ) : tab === "people" ? (
          people
        ) : (
          companies
        )}
      </div>
    </>
  );
}
