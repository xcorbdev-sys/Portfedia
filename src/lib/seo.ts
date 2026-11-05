import { siteUrl } from "./site";
import type { Job, PageDoc } from "./types";
import { EMPLOYMENT_TYPE, JOB_DAYS } from "./jobs";
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

/** SaaS projects also describe the product itself (Google "software app" results). */
export function softwareLd(p: PageDoc) {
  if (p.category !== "saas") return null;
  const base = siteUrl();
  const free = p.saas?.pricing === "free" || p.saas?.pricing === "open-source" || p.saas?.pricing === "freemium";
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: p.title,
    url: p.infobox.website || `${base}/org/${p.slug}`,
    description: p.summary ? stripWikiLinks(p.summary) : undefined,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: p.sectors?.[0],
    operatingSystem: p.saas?.platforms?.length ? p.saas.platforms.join(", ") : "Web",
    image: p.image?.url ? (p.image.url.startsWith("/") ? `${base}${p.image.url}` : p.image.url) : undefined,
    datePublished: p.infobox.founded ? String(p.infobox.founded) : undefined,
    ...(free ? { offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } } : {}),
    publisher: { "@id": `${base}/org/${p.slug}#org` },
  };
}

/** Event pages (Google event results). */
export function eventLd(p: PageDoc) {
  if (p.category !== "event" || !p.event?.start) return null;
  const base = siteUrl();
  const online = p.event.format === "Online";
  const place = { "@type": "Place", name: p.event.city || p.title, address: { "@type": "PostalAddress", addressLocality: p.event.city || undefined } };
  const virtual = { "@type": "VirtualLocation", url: p.infobox.website || `${base}/org/${p.slug}` };
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: p.title,
    description: p.summary ? stripWikiLinks(p.summary) : undefined,
    startDate: new Date(p.event.start).toISOString().slice(0, 10),
    endDate: p.event.end ? new Date(p.event.end).toISOString().slice(0, 10) : undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : p.event.format === "Hybrid"
        ? "https://schema.org/MixedEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
    location: online ? virtual : p.event.format === "Hybrid" ? [place, virtual] : place,
    image: p.image?.url ? (p.image.url.startsWith("/") ? `${base}${p.image.url}` : p.image.url) : undefined,
    organizer: { "@type": "Organization", name: p.title, url: p.infobox.website || `${base}/org/${p.slug}` },
    performer: p.event.speakers.length ? p.event.speakers.map((s) => ({ "@type": "Person", name: s.name })) : undefined,
    url: `${base}/org/${p.slug}`,
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
/** Google for Jobs: https://developers.google.com/search/docs/appearance/structured-data/job-posting */
export function jobPostingLd(org: PageDoc, job: Job) {
  const posted = job.postedAt ? new Date(job.postedAt) : new Date();
  const remote = job.workplace === "Remote";
  const [city, ...rest] = (job.location || org.infobox.headquarters || "").split(",").map((x) => x.trim());
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: (job.description || "").replace(/\n/g, "<br>"),
    datePosted: posted.toISOString().slice(0, 10),
    validThrough: new Date(posted.getTime() + JOB_DAYS * 86400_000).toISOString(),
    employmentType: EMPLOYMENT_TYPE[job.type] ?? "FULL_TIME",
    identifier: { "@type": "PropertyValue", name: org.title, value: job.id },
    hiringOrganization: {
      "@type": "Organization",
      name: org.title,
      ...(org.infobox.website ? { sameAs: org.infobox.website } : {}),
      ...(org.image?.url ? { logo: org.image.url.startsWith("http") ? org.image.url : `${siteUrl()}${org.image.url}` } : {}),
    },
    ...(remote
      ? { jobLocationType: "TELECOMMUTE", ...(city ? { applicantLocationRequirements: { "@type": "Country", name: rest.pop() || city } } : {}) }
      : city
        ? { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: city, ...(rest.length ? { addressCountry: rest[rest.length - 1] } : {}) } } }
        : {}),
    ...(job.salaryMin || job.salaryMax
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: job.currency || "USD",
            value: {
              "@type": "QuantitativeValue",
              ...(job.salaryMin && job.salaryMax ? { minValue: job.salaryMin, maxValue: job.salaryMax } : { value: job.salaryMin || job.salaryMax }),
              unitText: (job.salaryPeriod || "year").toUpperCase(),
            },
          },
        }
      : {}),
    directApply: false,
  };
}

export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
