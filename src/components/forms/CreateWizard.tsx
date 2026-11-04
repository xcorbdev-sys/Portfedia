"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Rocket, User } from "lucide-react";
import type { PageDoc } from "@/lib/types";
import { Stepper } from "./shared";
import { PersonForm } from "./PersonForm";
import { OrgForm } from "./OrgForm";
import type { LinkableProject } from "./Achievements";

type Kind = "person" | "org" | "saas";

/** How many company pages and SaaS projects the member may still create (Infinity for moderators). */
export interface QuotaView {
  upgraded: boolean;
  company: { used: number; limit: number | null };
  saas: { used: number; limit: number | null };
}

function left(q: { used: number; limit: number | null }) {
  return q.limit === null ? Infinity : Math.max(0, q.limit - q.used);
}

function QuotaNote({ q, what }: { q: { used: number; limit: number | null }; what: string }) {
  if (q.limit === null) return null;
  const n = left(q);
  return (
    <span className={`quota${n === 0 ? " quota--full" : ""}`}>
      {n === 0 ? `Limit reached (${q.used}/${q.limit} ${what})` : `${q.used}/${q.limit} ${what} used`}
    </span>
  );
}

export function CreateWizard({
  myPage,
  defaultName,
  initialTitle,
  initialKind,
  quota,
  mySaas = [],
}: {
  myPage: PageDoc | null;
  defaultName: string;
  initialTitle: string;
  initialKind: Kind | null;
  quota: QuotaView;
  mySaas?: LinkableProject[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>(initialKind ?? (myPage ? "org" : "person"));
  const [started, setStarted] = useState(Boolean(initialKind && initialTitle));
  const full = (kind === "org" && left(quota.company) === 0) || (kind === "saas" && left(quota.saas) === 0);

  if (started && kind === "person") return <PersonForm page={null} defaultName={defaultName} mySaas={mySaas} onBackToType={() => setStarted(false)} />;
  if (started && kind !== "person" && !full) {
    return <OrgForm page={null} defaultTitle={initialTitle} initialCategory={kind === "saas" ? "saas" : "company"} onBackToType={() => setStarted(false)} />;
  }

  return (
    <div>
      <Stepper labels={["Profile Type", "Basic Info", "Details", "Sources & Submit"]} current={0} />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="visually-hidden">Profile type</legend>
        <div className="choice-grid choice-grid--3">
          <label className="choice">
            <input type="radio" name="kind" value="person" checked={kind === "person"} onChange={() => setKind("person")} />
            <User />
            <b>Person Profile</b>
            <span>
              {myPage
                ? "You already have a profile. Continue to edit it."
                : "Apply for your own profile as an entrepreneur, executive, investor or industry professional. We review every profile before it goes live."}
            </span>
          </label>
          <label className="choice">
            <input type="radio" name="kind" value="org" checked={kind === "org"} onChange={() => setKind("org")} />
            <Building2 />
            <b>Company Profile</b>
            <span>Create a profile for a company, holding, fund or institution.</span>
            <QuotaNote q={quota.company} what="company pages" />
          </label>
          <label className="choice">
            <input type="radio" name="kind" value="saas" checked={kind === "saas"} onChange={() => setKind("saas")} />
            <Rocket />
            <b>SaaS Project</b>
            <span>Introduce your software product. You manage its page yourself.</span>
            <QuotaNote q={quota.saas} what="SaaS projects" />
          </label>
        </div>
      </fieldset>
      {full && (
        <div className="notice notice--info" style={{ marginTop: 16 }}>
          {quota.upgraded
            ? "You have reached the limit for your account. Contact us if you need more."
            : "You have used the free limit for this kind of page. Contact us to upgrade your account: upgraded accounts can add 5 company pages and 10 SaaS projects."}
        </div>
      )}
      <div className="wizard-actions" style={{ justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn btn--primary"
          disabled={full}
          onClick={() => (kind === "person" && myPage ? router.push("/edit") : setStarted(true))}
        >
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
