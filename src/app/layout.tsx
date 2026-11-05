import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { siteUrl } from "@/lib/site";
import { NavProgress } from "@/components/NavProgress";
import { ServiceWorker } from "@/components/ServiceWorker";
import { Suspense } from "react";
import "./globals.css";
import localFont from "next/font/local";
import { paidPlansEnabled } from "@/lib/pages";
import { FEATURES, getFeatures, type FeatureKey } from "@/lib/features";

// Wordmark typeface: Merriweather Black (SIL Open Font License), bundled so builds need no network
const logoFont = localFont({ src: "./fonts/merriweather-latin-900-normal.woff2", weight: "900", variable: "--font-logo", display: "swap" });

const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Portfedia — The living encyclopedia of the business world", template: "%s — Portfedia" },
  description:
    "Reliable, connected and continuously updated profiles of people, companies, investors and institutions. Portfedia helps you understand the business world better.",
  openGraph: { siteName: "Portfedia", locale: "en_US", type: "website" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "Portfedia", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  // Ownership checks for Google Search Console and Bing Webmaster Tools (codes from their "HTML tag" method)
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
  },
};

/** Site-wide metadata, plus the RSS feeds (#27) of the sections that are switched on, for feed readers to discover. */
export async function generateMetadata(): Promise<Metadata> {
  const features = await getFeatures();
  if (!features.feeds) return baseMetadata;
  const { FEEDS } = await import("@/lib/feeds");
  const feeds = (Object.keys(FEEDS) as (keyof typeof FEEDS)[])
    .filter((n) => FEEDS[n].needs.every((k) => features[k]))
    .map((n) => ({ url: `/feeds/${n}.xml`, title: `Portfedia: ${FEEDS[n].title}` }));
  return { ...baseMetadata, alternates: { types: { "application/rss+xml": feeds } } };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the request makes every page dynamic, which the per-request CSP nonce requires
  await headers();
  const features = await getFeatures();
  return (
    <html lang="en" className={logoFont.variable}>
      <body>
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
        <ServiceWorker />
        <footer className="site-footer">
          <div className="container site-footer__inner">
            <span>© {new Date().getFullYear()} Portfedia · Information on profiles is provided by their owners; ✓ items are confirmed by the other party.</span>
            <nav aria-label="Footer">
              {(Object.keys(FEATURES) as FeatureKey[])
                .filter((k) => features[k] && FEATURES[k].footer && k !== "help")
                .map((k) => (
                  <Link key={k} href={FEATURES[k].href}>{FEATURES[k].footer}</Link>
                ))}
              {paidPlansEnabled() && <Link href="/pricing">Pricing</Link>}
              {features.help && <Link href="/help">Help</Link>}
              <Link href="/random" prefetch={false}>Random profile</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/copyright">Copyright</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/kvkk">KVKK</Link>
              <Link href="/cookies">Cookies</Link>
              <Link href="/legal">Legal notice</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
