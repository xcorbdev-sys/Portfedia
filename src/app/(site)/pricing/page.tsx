import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Breadcrumbs } from "@/components/ui";

export const metadata: Metadata = { title: "Pricing", description: "Portfedia is free for everyone. Pro and Business add statistics and visibility." };

const TIERS = [
  {
    name: "Free",
    price: "$0",
    note: "forever",
    features: ["Your own profile page", "Claim your company with a work email", "Verified positions and education", "Follow people and organizations", "Search engine friendly pages"],
  },
  {
    name: "Pro",
    price: "Contact us",
    note: "for individuals",
    features: ["Everything in Free", "Profile view statistics (30 days)", "Your application is reviewed first", "Pro badge in the review queue"],
  },
  {
    name: "Business",
    price: "Contact us",
    note: "for organizations",
    features: ["Everything in Free", "Page view statistics", "Featured job listings", "Brand colour on your page"],
  },
];

export default function PricingPage() {
  const contact = process.env.CONTACT_EMAIL || "hello@portfedia.com";
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 980 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Pricing" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Pricing</h1>
      <p className="muted">The encyclopedia is free to read and free to be in. Paid plans never change what a page says, only the extras around it.</p>
      <div className="pricing">
        {TIERS.map((t) => (
          <section key={t.name} className={`card pricing__tier${t.name === "Pro" ? " pricing__tier--hl" : ""}`}>
            <div className="card__body">
              <div className="card__title">{t.name}</div>
              <div className="pricing__price">{t.price}</div>
              <div className="small muted">{t.note}</div>
              <ul className="pricing__list">
                {t.features.map((f) => (
                  <li key={f}><Check size={15} /> {f}</li>
                ))}
              </ul>
              {t.name === "Free" ? (
                <Link className="btn btn--primary" href="/signup">Create your profile</Link>
              ) : (
                <a className="btn" href={`mailto:${contact}?subject=${encodeURIComponent(`Portfedia ${t.name}`)}`}>Contact us</a>
              )}
            </div>
          </section>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 20 }}>
        Plans are activated by our team after payment. Questions? Email <a href={`mailto:${contact}`}>{contact}</a>.
      </p>
    </div>
  );
}
