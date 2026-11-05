import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cachedJobs } from "@/lib/cached";
import { cityOf, cityPages } from "@/lib/discovery";
import { Breadcrumbs } from "@/components/ui";
import { EntityGrid } from "@/components/EntityCards";
import { featureOn, getFeatures, requireFeature } from "@/lib/features";
import { slugify } from "@/lib/slug";
import { siteUrl } from "@/lib/site";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  if (!(await featureOn("cities"))) return {};
  const data = await cityPages((await params).slug);
  if (!data) return { title: "City not found" };
  const { city } = data;
  return {
    title: `Business in ${city.name}: people, companies and startups`,
    description: `${city.people} people, ${city.companies} companies, ${city.saas} SaaS projects and ${city.events} events in ${city.name} on Portfedia.`,
    alternates: { canonical: `/cities/${city.slug}` },
  };
}

export default async function CityPage({ params }: P) {
  await requireFeature("cities");
  await connection();
  const slug = (await params).slug;
  const data = await cityPages(slug);
  if (!data) notFound();
  const features = await getFeatures();
  const jobs = features.jobs ? (await cachedJobs()).filter((l) => slugify(cityOf(l.job.location)) === slug).slice(0, 30) : [];
  const { city } = data;
  const sections = [
    { title: "People", items: data.people },
    { title: "Companies", items: data.companies },
    { title: "SaaS projects", items: features.saas ? data.saas : [] },
    { title: "Events", items: features.events ? data.events : [] },
  ].filter((s) => s.items.length);
  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Business in ${city.name}`,
    url: `${siteUrl()}/cities/${city.slug}`,
    about: { "@type": "City", name: city.name },
  };
  return (
    <div className="container" style={{ paddingBottom: 56 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cities", href: "/cities" }, { label: city.name }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>{city.name}</h1>
      <p className="muted">People, companies, SaaS projects{features.jobs ? ", jobs" : ""} and events based in {city.name}.</p>
      {sections.map((s) => (
        <section key={s.title} style={{ marginTop: 22 }}>
          <h2 className="section__title" style={{ fontSize: "1.2rem" }}>{s.title} <span className="muted small">{s.items.length}</span></h2>
          <div style={{ marginTop: 10 }}><EntityGrid items={s.items} /></div>
        </section>
      ))}
      {jobs.length > 0 && (
        <section style={{ marginTop: 22 }}>
          <h2 className="section__title" style={{ fontSize: "1.2rem" }}>Jobs <span className="muted small">{jobs.length}</span></h2>
          <ul className="result-list card" style={{ marginTop: 10 }}>
            {jobs.map(({ org, job }) => (
              <li key={`${org.slug}-${job.id}`}>
                <div className="result" style={{ gridTemplateColumns: "1fr" }}>
                  <span>
                    <Link className="result__name" href={`/jobs/${org.slug}/${job.id}`}>{job.title}</Link>
                    <span className="result__sub">{[org.title, job.workplace, job.type].filter(Boolean).join(" · ")}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
