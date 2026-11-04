import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { siteUrl } from "@/lib/site";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavProgress } from "@/components/NavProgress";
import { Suspense } from "react";
import "./globals.css";
import localFont from "next/font/local";

// Wordmark typeface: Merriweather Black (SIL Open Font License), bundled so builds need no network
const logoFont = localFont({ src: "./fonts/merriweather-latin-900-normal.woff2", weight: "900", variable: "--font-logo", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Portfedia — The living encyclopedia of the business world", template: "%s — Portfedia" },
  description:
    "Reliable, connected and continuously updated profiles of people, companies, investors and institutions. Portfedia helps you understand the business world better.",
  openGraph: { siteName: "Portfedia", locale: "en_US", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the request makes every page dynamic, which the per-request CSP nonce requires
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className={logoFont.variable} suppressHydrationWarning>
      <head>
        {/* Applies a saved dark-theme choice before the first paint (light is the default) */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('pf-theme')==='dark')document.documentElement.dataset.theme='dark'}catch(e){}" }} />
      </head>
      <body>
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
        <footer className="site-footer">
          <div className="container site-footer__inner">
            <span>© {new Date().getFullYear()} Portfedia · Information on profiles is provided by their owners; ✓ items are confirmed by the other party.</span>
            <nav aria-label="Footer">
              <Link href="/people">People</Link>
              <Link href="/companies">Companies</Link>
              <Link href="/sectors">Sectors</Link>
              <Link href="/collections">Collections</Link>
              <Link href="/jobs">Jobs</Link>
              <Link href="/events">Events</Link>
              <Link href="/investors">Investors</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/help">Help</Link>
              <Link href="/random" prefetch={false}>Random profile</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/copyright">Copyright</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/kvkk">KVKK</Link>
              <Link href="/cookies">Cookies</Link>
              <Link href="/legal">Legal notice</Link>
              <ThemeToggle />
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
