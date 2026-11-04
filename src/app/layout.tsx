import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Portfedia — The living encyclopedia of the business world", template: "%s — Portfedia" },
  description:
    "Reliable, connected and continuously updated profiles of people, companies, investors and institutions. Portfedia helps you understand the business world better.",
  openGraph: { siteName: "Portfedia", locale: "en_US", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c111b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="site-footer">
          <div className="container site-footer__inner">
            <span>© {new Date().getFullYear()} Portfedia · Information on profiles is provided by their owners; ✓ items are confirmed by the other party.</span>
            <nav aria-label="Footer">
              <Link href="/people">People</Link>
              <Link href="/companies">Companies</Link>
              <Link href="/sectors">Sectors</Link>
              <Link href="/random" prefetch={false}>Random profile</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/copyright">Copyright</Link>
              <Link href="/privacy">Privacy</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
