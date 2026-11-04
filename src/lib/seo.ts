import { siteUrl } from "./site";
import type { PageDoc } from "./types";
import { stripWikiLinks } from "./wikitext";

/**
 * schema.org structured data. Google uses ProfilePage for "profile" results and
 * BreadcrumbList for the breadcrumb shown above the result title.
 */
export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${siteUrl()}${it.path}` })),
  };
}

const sameAs = (p: PageDoc) =>
  [
    p.infobox.website,
    p.infobox.github && `https://github.com/${p.infobox.github}`,
    p.infobox.linkedin && `https://www.linkedin.com/in/${p.infobox.linkedin}`,
  ].filter(Boolean) as string[];

export function personProfileLd(p: PageDoc) {
  const base = siteUrl();
  const current = p.experiences.filter((e) => e.current && e.verification !== "rejected");
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${base}/${p.slug}`,
    dateCreated: new Date(p.createdAt).toISOString(),
    dateModified: new Date(p.updatedAt).toISOString(),
    mainEntity: {
      "@type": "Person",
      "@id": `${base}/${p.slug}#person`,
      name: p.title,
      description: p.summary ? stripWikiLinks(p.summary) : undefined,
      jobTitle: current[0]?.role || p.infobox.occupation || undefined,
      image: p.image?.url ? (p.image.url.startsWith("/") ? `${base}${p.image.url}` : p.image.url) : undefined,
      nationality: p.infobox.nationality || undefined,
      homeLocation: p.infobox.location ? { "@type": "Place", name: p.infobox.location } : undefined,
      knowsLanguage: p.infobox.languages ? p.infobox.languages.split(/,\s*/) : undefined,
      knowsAbout: p.infobox.skills ? p.infobox.skills.split(/,\s*/) : undefined,
      worksFor: current.map((e) => ({ "@type": "Organization", name: e.orgTitle, url: `${base}/org/${e.orgSlug}` })),
      alumniOf: p.educations.map((e) => ({ "@type": "EducationalOrganization", name: e.schoolTitle, url: `${base}/org/${e.schoolSlug}` })),
      sameAs: sameAs(p),
      interactionStatistic: { "@type": "InteractionCounter", interactionType: "https://schema.org/FollowAction", userInteractionCount: p.followerCount },
    },
  };
}

export function organizationLd(p: PageDoc) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": p.type === "school" ? "EducationalOrganization" : "Organization",
    "@id": `${base}/org/${p.slug}#org`,
    name: p.title,
    url: `${base}/org/${p.slug}`,
    description: p.summary ? stripWikiLinks(p.summary) : undefined,
    logo: p.image?.url ? (p.image.url.startsWith("/") ? `${base}${p.image.url}` : p.image.url) : undefined,
    foundingDate: p.infobox.founded ? String(p.infobox.founded) : undefined,
    founder: p.infobox.founders ? p.infobox.founders.split(/,\s*/).map((name) => ({ "@type": "Person", name })) : undefined,
    address: p.infobox.headquarters ? { "@type": "PostalAddress", addressLocality: p.infobox.headquarters } : undefined,
    numberOfEmployees: p.infobox.employees ? { "@type": "QuantitativeValue", description: p.infobox.employees } : undefined,
    sameAs: p.infobox.website ? [p.infobox.website] : undefined,
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Portfedia",
    alternateName: "Portfedia — The living encyclopedia of the business world",
    url: `${siteUrl()}/`,
  };
}

/** Serialises JSON-LD safely inside a <script> tag. */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
