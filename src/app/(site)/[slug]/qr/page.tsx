import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getPageBySlug, currentRole } from "@/lib/pages";
import { getCurrentUser } from "@/lib/auth";
import { isMembersOnly, isPublic } from "@/lib/visibility";
import { siteUrl } from "@/lib/site";
import { PrintButton } from "@/components/client";

export const metadata: Metadata = { title: "QR code", robots: { index: false } };

/** Printable QR card for business cards, slides and events (generated locally, no external service). */
export default async function QrPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPageBySlug(slug, "person");
  if (!page || !isPublic(page) || (isMembersOnly(page) && !(await getCurrentUser()))) notFound();
  const url = `${siteUrl()}/@${page.slug}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } });
  const download = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <div className="narrow" style={{ maxWidth: 520, textAlign: "center" }}>
      <div className="card qr-card">
        <div className="card__body">
          <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
          <h1 style={{ fontSize: "1.4rem", marginTop: 12 }}>{page.title}</h1>
          <p className="muted" style={{ margin: "4px 0 6px" }}>{currentRole(page)}</p>
          <p className="small" style={{ margin: 0, color: "var(--primary)" }}>{url.replace(/^https?:\/\//, "")}</p>
        </div>
      </div>
      <div className="no-print" style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
        <a className="btn btn--primary" href={download} download={`portfedia-${page.slug}-qr.svg`}>Download SVG</a>
        <PrintButton className="btn">Print</PrintButton>
        <Link className="btn btn--ghost" href={`/${page.slug}`}>Back to profile</Link>
      </div>
    </div>
  );
}
