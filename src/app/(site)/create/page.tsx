import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getPersonPageOf } from "@/lib/pages";
import { CreateWizard } from "@/components/forms/CreateWizard";

export const metadata: Metadata = { title: "Create a new profile", robots: { index: false } };

type Props = { searchParams: Promise<{ title?: string; type?: string; welcome?: string }> };

export default async function CreatePage({ searchParams }: Props) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]).toString();
  const user = await requireUser(`/create${qs ? `?${qs}` : ""}`);
  const myPage = await getPersonPageOf(user.id);
  const title = (sp.title ?? "").slice(0, 160);
  // A red link always points to an organization page (person pages are created by their owners)
  const kind = sp.type === "person" ? "person" : title || sp.type === "org" ? "org" : null;

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
      <CreateWizard myPage={myPage} defaultName={user.name} initialTitle={title} initialKind={kind} />
    </div>
  );
}
