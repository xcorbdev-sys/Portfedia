import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getPageBySlug } from "@/lib/pages";
import { ReportForm } from "@/components/forms/ReportForm";

export const metadata: Metadata = { title: "Copyright & takedown requests" };

export default async function CopyrightPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const slug = ((await searchParams).page ?? "").slice(0, 100);
  const [page, user] = await Promise.all([slug ? getPageBySlug(slug) : null, getCurrentUser()]);
  return (
    <div className="narrow" style={{ maxWidth: 680 }}>
      <h1>Copyright &amp; takedown requests</h1>
      <div className="prose">
        <p>
          Portfedia hosts content that its users upload, such as profile photos, logos and text. We respect intellectual property and
          remove content that infringes it.
        </p>
        <p>
          If you believe content on Portfedia uses your work without permission, send us a request with the form below. We review every
          request, remove or disable access to infringing content promptly, and inform the person who uploaded it. Repeat infringers lose
          their accounts.
        </p>
        <p className="muted small">
          This process also serves notice-and-takedown requests under Turkish Law No. 5651 and similar laws. Knowingly false claims may
          have legal consequences.
        </p>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__body">
          <ReportForm slug={page?.slug ?? ""} reasons={{}} signedIn={Boolean(user)} copyright />
        </div>
      </div>
    </div>
  );
}
