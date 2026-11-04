"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, User } from "lucide-react";
import type { PageDoc } from "@/lib/types";
import { Stepper } from "./shared";
import { PersonForm } from "./PersonForm";
import { OrgForm } from "./OrgForm";

type Kind = "person" | "org";

export function CreateWizard({
  myPage,
  defaultName,
  initialTitle,
  initialKind,
}: {
  myPage: PageDoc | null;
  defaultName: string;
  initialTitle: string;
  initialKind: Kind | null;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>(initialKind ?? (myPage ? "org" : "person"));
  const [started, setStarted] = useState(Boolean(initialKind && initialTitle));

  if (started && kind === "person") return <PersonForm page={null} defaultName={defaultName} onBackToType={() => setStarted(false)} />;
  if (started && kind === "org") return <OrgForm page={null} defaultTitle={initialTitle} onBackToType={() => setStarted(false)} />;

  return (
    <div>
      <Stepper labels={["Profile Type", "Basic Info", "Details", "Sources & Submit"]} current={0} />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="visually-hidden">Profile type</legend>
        <div className="choice-grid">
          <label className="choice">
            <input type="radio" name="kind" value="person" checked={kind === "person"} onChange={() => setKind("person")} />
            <User />
            <b>Person Profile</b>
            <span>
              {myPage
                ? "You already have a profile. Continue to edit it."
                : "Create your own profile as an entrepreneur, executive, investor or industry professional."}
            </span>
          </label>
          <label className="choice">
            <input type="radio" name="kind" value="org" checked={kind === "org"} onChange={() => setKind("org")} />
            <Building2 />
            <b>Company Profile</b>
            <span>Create a profile for a company, holding, fund or institution.</span>
          </label>
        </div>
      </fieldset>
      <div className="wizard-actions" style={{ justifyContent: "flex-end" }}>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => (kind === "person" && myPage ? router.push("/edit") : setStarted(true))}
        >
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
