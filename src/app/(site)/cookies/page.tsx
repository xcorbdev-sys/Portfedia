import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = { title: "Cookie Policy", description: "The cookies and browser storage Portfedia uses." };

const COOKIES = [
  { name: "pf_session", kind: "Cookie", purpose: "Keeps you signed in. Only a random token; the server stores a hash of it.", duration: "30 days, or until you log out" },
  { name: "pf_oauth_state", kind: "Cookie", purpose: "Protects Google/LinkedIn sign-in against forged requests.", duration: "10 minutes" },
  { name: "pf_oauth_signup", kind: "Cookie", purpose: "Remembers a Google/LinkedIn sign-up while you finish the age and terms step.", duration: "30 minutes" },
  { name: "pf-draft:…", kind: "Local storage", purpose: "Keeps an unsaved form draft on your device so you don't lose your work.", duration: "Until you save or discard it" },
];

export default function CookiesPage() {
  return (
    <div className="narrow prose">
      <h1>Cookie Policy</h1>
      <p className="muted">Last updated: {LEGAL_UPDATED}</p>
      <p>
        Portfedia only uses cookies and browser storage that are strictly necessary for the service you ask for. We don&apos;t use
        analytics, advertising or tracking cookies, don&apos;t load scripts or fonts from third-party servers (uploaded images come from
        our storage provider, which sets no cookies), and don&apos;t share cookie data with anyone. Because of that, the law (EU ePrivacy Directive Art. 5(3), GDPR and KVKK) does not
        require a consent banner.
      </p>
      <table>
        <thead>
          <tr><th>Name</th><th>Type</th><th>Purpose</th><th>Duration</th></tr>
        </thead>
        <tbody>
          {COOKIES.map((c) => (
            <tr key={c.name}><td><code>{c.name}</code></td><td>{c.kind}</td><td>{c.purpose}</td><td>{c.duration}</td></tr>
          ))}
        </tbody>
      </table>
      <p>
        You can delete cookies and local storage in your browser settings at any time; you will then be signed out. If we ever add
        cookies that are not strictly necessary, we will ask for your consent first. More about personal data:{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </div>
  );
}
