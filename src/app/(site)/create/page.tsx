import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getPersonPageOf, listMySaas } from "@/lib/pages";
import { CreateWizard } from "@/components/forms/CreateWizard";
import { pageQuota } from "@/lib/quotas";
import { getFeatures } from "@/lib/features";

export const metadata: Metadata = { title: "Create a new profile", robots: { index: false } };

type Props = { searchParams: Promise<{ title?: string; type?: string; welcome?: string }> };

export default async function CreatePage({ searchParams }: Props) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]).toString();
  const user = await requireUser(`/create${qs ? `?${qs}` : ""}`);
  const [myPage, q, mySaas, features] = await Promise.all([getPersonPageOf(user.id), pageQuota(user), listMySaas(user.id), getFeatures()]);
  // Infinity can't be sent to the browser; null means "no limit"
  const quota = {
    upgraded: q.upgraded,
    company: { used: q.company.used, limit: Number.isFinite(q.company.limit) ? q.company.limit : null },
    saas: { used: q.saas.used, limit: Number.isFinite(q.saas.limit) ? q.saas.limit : null },
  };
  const title = (sp.title ?? "").slice(0, 160);
  // A red link always points to an organization page (person pages are created by their owners)
  const kind = sp.type === "person" ? "person" : sp.type === "saas" ? "saas" : title || sp.type === "org" ? "org" : null;

  return (
    <div className="narrow" style={{ maxWidth: 900 }}>
      {!user.emailVerified && (
        <div className="notice notice--info" style={{ marginBottom: 18 }}>
          <b>Don&apos;t forget to confirm your email.</b> You can fill in and save your profile now; it goes to review as soon as your email address is confirmed.
        </div>
      )}
      <div className="wizard-head">
        {sp.welcome && !myPage && <div className="notice notice--ok" style={{ marginBottom: 18 }}>Welcome to Portfedia, {user.name.split(" ")[0]}! Let&apos;s create your profile.</div>}
        <h1>Create a New Profile</h1>
        <p className="muted">Help the business encyclopedia grow by adding a person or company profile to Portfedia.</p>
      </div>
      <CreateWizard myPage={myPage} defaultName={user.name} initialTitle={title} initialKind={features.saas || kind !== "saas" ? kind : "org"} quota={quota} mySaas={mySaas} features={features} />
    </div>
  );
}
