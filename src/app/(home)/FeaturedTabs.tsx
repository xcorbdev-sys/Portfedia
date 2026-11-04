"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

type Tab = "people" | "companies" | "collections";

export function FeaturedTabs({
  people,
  companies,
  collections,
  hasPeople,
  hasCompanies,
  hasCollections,
}: {
  people: React.ReactNode;
  companies: React.ReactNode;
  collections: React.ReactNode;
  hasPeople: boolean;
  hasCompanies: boolean;
  hasCollections: boolean;
}) {
  const [tab, setTab] = useState<Tab>("people");
  const empty = tab === "people" ? !hasPeople : tab === "companies" ? !hasCompanies : !hasCollections;
  const viewAll = tab === "people" ? "/people" : tab === "companies" ? "/companies" : "/collections";
  return (
    <>
      <div className="section__head">
        <h2 className="section__title">Featured</h2>
        <Link className="link-arrow" href={viewAll}>
          View all <ArrowRight size={15} />
        </Link>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "people"} onClick={() => setTab("people")}>People</button>
        <button role="tab" aria-selected={tab === "companies"} onClick={() => setTab("companies")}>Companies</button>
        <button role="tab" aria-selected={tab === "collections"} onClick={() => setTab("collections")}>Collections</button>
      </div>
      <div role="tabpanel">
        {empty ? (
          <div className="empty">
            Nothing here yet. <Link href="/create">Be the first to create a profile.</Link>
          </div>
        ) : tab === "people" ? (
          people
        ) : tab === "companies" ? (
          companies
        ) : (
          collections
        )}
      </div>
    </>
  );
}
