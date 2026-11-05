import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Shown by the service worker when a page is opened without an internet connection (#41). */
export default function OfflinePage() {
  return (
    <div className="narrow" style={{ textAlign: "center", paddingTop: 40 }}>
      <h1>You&apos;re offline</h1>
      <p className="muted">Portfedia needs an internet connection to show this page. Check your connection and try again.</p>
      <a className="btn btn--primary" href="/">Try again</a>
    </div>
  );
}
