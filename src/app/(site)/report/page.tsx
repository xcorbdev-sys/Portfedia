import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPageBySlug } from "@/lib/pages";
import { REPORT_REASONS } from "@/lib/moderation";
import { pageHref } from "@/lib/wikitext";
import { ReportForm } from "@/components/forms/ReportForm";

export const metadata: Metadata = { title: "Report a problem", robots: { index: false } };

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const slug = ((await searchParams).page ?? "").slice(0, 100);
  const [page, user] = await Promise.all([slug ? getPageBySlug(slug) : null, getCurrentUser()]);
  return (
    <div className="narrow" style={{ maxWidth: 640 }}>
      <h1>Report a problem</h1>
      <p className="muted">
        {page ? (
          <>About <Link href={pageHref(page.type, page.slug)}>{page.title}</Link>. </>
        ) : null}
        Reports are private and reviewed by the Portfedia team. For copyright claims, use the{" "}
        <Link href={`/copyright${slug ? `?page=${slug}` : ""}`}>copyright form</Link>.
      </p>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__body">
          <ReportForm slug={page?.slug ?? ""} reasons={Object.fromEntries(Object.entries(REPORT_REASONS).filter(([k]) => k !== "appeal"))} signedIn={Boolean(user)} />
        </div>
      </div>
    </div>
  );
}
