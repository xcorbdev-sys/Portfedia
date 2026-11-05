"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

type Tab = "people" | "companies" | "saas";

export function FeaturedTabs({
  people,
  companies,
  saas,
  hasPeople,
  hasCompanies,
  hasSaas,
  showSaas = true,
  showPeople = true,
  showCompanies = true,
}: {
  people: React.ReactNode;
  companies: React.ReactNode;
  saas: React.ReactNode;
  hasPeople: boolean;
  hasCompanies: boolean;
  hasSaas: boolean;
  showSaas?: boolean;
  showPeople?: boolean;
  showCompanies?: boolean;
}) {
  // The first tab whose section is switched on
  const [tab, setTab] = useState<Tab>(showPeople ? "people" : showCompanies ? "companies" : "saas");
  if (!showPeople && !showCompanies && !showSaas) return null;
  const empty = tab === "people" ? !hasPeople : tab === "companies" ? !hasCompanies : !hasSaas;
  const viewAll = tab === "people" ? "/people" : tab === "companies" ? "/companies" : "/saas";
  return (
    <>
      <div className="section__head">
        <h2 className="section__title">Featured</h2>
        <Link className="link-arrow" href={viewAll}>
          View all <ArrowRight size={15} />
        </Link>
      </div>
      <div className="tabs" role="tablist">
        {showPeople && <button role="tab" aria-selected={tab === "people"} onClick={() => setTab("people")}>People</button>}
        {showCompanies && <button role="tab" aria-selected={tab === "companies"} onClick={() => setTab("companies")}>Companies</button>}
        {showSaas && <button role="tab" aria-selected={tab === "saas"} onClick={() => setTab("saas")}>SaaS</button>}
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
          saas
        )}
      </div>
    </>
  );
}
