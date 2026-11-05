import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { HELP_ARTICLES } from "@/lib/help";
import { Breadcrumbs } from "@/components/ui";
import { requireFeature } from "@/lib/features";

export const metadata: Metadata = { title: "Help center", description: "Answers about profiles, verification, company pages and privacy on Portfedia." };

export default async function HelpPage() {
  await connection();
  await requireFeature("help"); // the section can be switched off in Admin → Sections
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 820 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Help" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Help center</h1>
      <ul className="help-list">
        {HELP_ARTICLES.map((a) => (
          <li key={a.slug} className="card">
            <div className="card__body">
              <Link href={`/help/${a.slug}`}>{a.title}</Link>
              <div className="small muted">{a.summary}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
