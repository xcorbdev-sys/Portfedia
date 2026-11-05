"use server";

import { redirect } from "next/navigation";
import { expireOrg, revalidatePath } from "../revalidate";
import { getCurrentUser } from "../auth";
import { canView, isPublic } from "../visibility";
import { guardContent } from "../guard";
import { externalLinks } from "../content-rules";
import { getPersonPageOf, listMySaas } from "../pages";
import { notify, notifyFollowers } from "../notifications";
import { giveThanks, notifyMentions } from "../social";
import { getPageBySlug, PermissionError, savePersonPage, saveOrgPage, toggleFollow, type PersonInput } from "../pages";
import { saveImage, UploadError } from "../storage";
import { bool, email, handle, httpUrl, str, year } from "../validate";
import { slugify } from "../slug";
import { rateLimit } from "../rate-limit";
import { duplicatePositions, yearProblems } from "../data-rules";
import { findSimilarOrgs } from "../org-tools";
import { pageHref } from "../wikitext";
import type { FormState } from "./auth";
import type { Acquisition, Award, FundingRound, Job, LanguageLevel, Leader, Milestone, Office, OpenTo, PageDoc, Patent, SessionUser, PressItem, Project, Publication, SourceRef, StoredImage, Talk, Volunteering } from "../types";
import { OPEN_TO, ORG_CATEGORIES, RAISE_STAGES, SAAS_PRICING, type OrgCategory, type RaisingInfo, type SaasInfo } from "../types";
import { cleanSectors } from "../sectors";
import { CURRENCIES, JOB_TYPES, LEVELS as JOB_LEVELS, SALARY_PERIODS, WORKPLACES } from "../jobs";
import { featureUnlocked, paidPlansEnabled, planActive } from "../pages";
import { featureOn } from "../features";
import { announce } from "../indexing";

const MAX_BODY = 100_000;
const VERIFY_FIRST = "Please confirm your email address first. We sent you a link when you signed up; you can request a new one from the banner at the top of the page.";

async function coverFrom(fd: FormData): Promise<StoredImage | null | undefined> {
  if (bool(fd.get("removeCover"))) return null;
  const f = fd.get("cover");
  if (f instanceof File && f.size > 0) return saveImage(f, "cover");
  return undefined;
}

async function imageFrom(fd: FormData, kind: "photo" | "logo"): Promise<StoredImage | null | undefined> {
  if (bool(fd.get("removeImage"))) return null;
  const f = fd.get("image");
  if (f instanceof File && f.size > 0) return saveImage(f, kind);
  return undefined;
}

function parseJsonArray(v: FormDataEntryValue | null, max: number): Record<string, unknown>[] {
  try {
    const arr = JSON.parse(String(v ?? "[]"));
    return Array.isArray(arr) ? arr.filter((x) => x && typeof x === "object").slice(0, max) : [];
  } catch {
    return [];
  }
}

function parseTags(v: FormDataEntryValue | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of String(v ?? "").split(",")) {
    const t = str(raw, 30);
    const k = t.toLocaleLowerCase("en-US");
    if (t && !seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out.slice(0, 8);
}

function parseFunding(v: FormDataEntryValue | null): FundingRound[] {
  return parseJsonArray(v, 30)
    .map((r) => ({
      round: str(r.round, 40),
      year: year(r.year),
      amount: str(r.amount, 60),
      investors: String(r.investors ?? "")
        .split(",")
        .map((t) => str(t, 120))
        .filter((t) => slugify(t))
        .slice(0, 20)
        .map((title) => ({ title, slug: slugify(title) })),
    }))
    .filter((r) => r.round || r.amount || r.investors.length);
}

function yearOrNull(v: unknown) {
  return year(v);
}

/** Generic parser for the simple repeatable lists of a profile (publications, awards, …). */
function parseRows<T>(fd: FormData, name: string, max: number, map: (r: Record<string, unknown>) => T | null): T[] {
  return parseJsonArray(fd.get(name), max)
    .map(map)
    .filter((x): x is T => x !== null);
}

const LEVELS = ["Native", "C2", "C1", "B2", "B1", "A2", "A1"];

/** Cards with an optional image each (profile projects, organization products). */
async function parseImageCards(fd: FormData, prevItems: Project[], field: string, filePrefix: string, max = 20, allowLinks = false): Promise<Project[]> {
  const prevImages = new Map(prevItems.filter((x) => x.image).map((x) => [x.image!.key, x.image!]));
  const out: Project[] = [];
  for (const r of parseJsonArray(fd.get(field), max)) {
    const title = str(r.title, 120);
    if (!title) continue;
    const id = /^[a-z0-9]{6,16}$/.test(String(r.id)) ? String(r.id) : Math.random().toString(36).slice(2, 10);
    // Only images this page already owns may be kept (never trust a client-sent URL)
    let image = typeof r.imageKey === "string" && !r.removeImage ? (prevImages.get(r.imageKey) ?? null) : null;
    // An image uploaded by an earlier (automatic) save of the same card is kept, unless it was removed
    if (!image && !r.removeImage && !r.imageKey) image = prevItems.find((x) => x.id === id)?.image ?? null;
    const file = fd.get(`${filePrefix}${id}`);
    if (file instanceof File && file.size > 0) image = await saveImage(file, "logo");
    const pageSlug = allowLinks ? slugify(str(r.pageSlug, 100)) : "";
    out.push({ id, title, url: httpUrl(r.url), year: yearOrNull(r.year), description: str(r.description, 600), image, ...(pageSlug ? { pageSlug } : {}) });
  }
  return out;
}

/** Profile projects; a link to a Portfedia SaaS page is kept only for the person's own SaaS projects. */
async function parseProjects(fd: FormData, prev: PageDoc | null, userId: string): Promise<Project[]> {
  const projects = await parseImageCards(fd, prev?.projects ?? [], "projects", "projectImage_", 20, true);
  if (!projects.some((p) => p.pageSlug)) return projects;
  const mine = new Set((await listMySaas(userId)).map((x) => x.slug));
  return projects.map((p) => (p.pageSlug && !mine.has(p.pageSlug) ? { ...p, pageSlug: undefined } : p));
}

const linked = (title: string) => ({ title, slug: slugify(title) });

function parseOrgExtras(fd: FormData) {
  const parentTitle = str(fd.get("parent"), 160);
  const exchange = str(fd.get("tickerExchange"), 20).toUpperCase();
  const symbol = str(fd.get("tickerSymbol"), 20).toUpperCase();
  return {
    offices: parseRows<Office>(fd, "offices", 50, (r) =>
      str(r.city, 80) ? { city: str(r.city, 80), country: str(r.country, 80), address: str(r.address, 200), kind: ["HQ", "Office", "Factory", "R&D", "Store", "Warehouse"].includes(String(r.kind)) ? String(r.kind) : "Office" } : null,
    ),
    parent: parentTitle && slugify(parentTitle) ? linked(parentTitle) : null,
    acquisitions: parseRows<Acquisition>(fd, "acquisitions", 50, (r) => (str(r.title, 160) && slugify(str(r.title, 160)) ? { ...linked(str(r.title, 160)), year: year(r.year), amount: str(r.amount, 60) } : null)),
    leadership: parseRows<Leader>(fd, "leadership", 40, (r) =>
      str(r.name, 120) && slugify(str(r.name, 120))
        ? {
            name: str(r.name, 120),
            // A person picked from the suggestions keeps their profile's address; otherwise the name decides it
            slug: /^[a-z0-9-]{2,100}$/.test(String(r.slug ?? "")) ? String(r.slug) : slugify(str(r.name, 120)),
            role: str(r.role, 120),
            kind: r.kind === "board" ? "board" : "executive",
          }
        : null,
    ),
    formerNames: String(fd.get("formerNames") ?? "").split(",").map((x) => str(x, 160)).filter(Boolean).slice(0, 10),
    milestones: parseRows<Milestone>(fd, "milestones", 60, (r) => (str(r.text, 300) ? { year: year(r.year), text: str(r.text, 300) } : null)).sort((a, b) => (a.year ?? 0) - (b.year ?? 0)),
    press: parseRows<PressItem>(fd, "press", 60, (r) => (str(r.title, 200) && httpUrl(r.url) ? { title: str(r.title, 200), outlet: str(r.outlet, 120), year: year(r.year), url: httpUrl(r.url) } : null)),
    ticker: symbol ? { exchange, symbol } : null,
  };
}

/** "Raising now" details; information only (Portfedia never handles the money). */
function parseRaising(fd: FormData, prev: PageDoc | null): RaisingInfo | null {
  if (!bool(fd.get("raisingActive"))) return null;
  const amount = Math.round(Number(String(fd.get("raisingAmount") ?? "").replace(/[^\d.]/g, "")));
  const stage = String(fd.get("raisingStage") ?? "");
  const currency = String(fd.get("raisingCurrency") ?? "USD");
  return {
    active: true,
    stage: (RAISE_STAGES as readonly string[]).includes(stage) ? stage : "Seed",
    amount: Number.isFinite(amount) && amount > 0 && amount < 1e12 ? amount : null,
    currency: ["USD", "EUR", "GBP", "TRY"].includes(currency) ? currency : "USD",
    description: str(fd.get("raisingDescription"), 600),
    url: httpUrl(fd.get("raisingUrl")),
    email: email(fd.get("raisingEmail")),
    since: prev?.raising?.since ?? new Date(),
  };
}

/** A JSON array of strings from a hidden form field (the sector picker). */
function parseJsonList(v: FormDataEntryValue | null): string[] {
  try {
    const arr = JSON.parse(String(v ?? "[]"));
    return Array.isArray(arr) ? arr.map((x) => String(x)).slice(0, 10) : [];
  } catch {
    return [];
  }
}

function parseCategory(fd: FormData) {
  const raw = String(fd.get("category") ?? "company");
  const category = (raw in ORG_CATEGORIES ? raw : "company") as OrgCategory;
  const list = (name: string, max: number) => String(fd.get(name) ?? "").split(",").map((x) => str(x, 60)).filter(Boolean).slice(0, max);
  const date = (name: string) => {
    const v = str(fd.get(name), 10);
    const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00Z`) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };
  const named = (name: string) => list(name, 40).map((title) => ({ title, slug: slugify(title) })).filter((x) => x.slug);
  return {
    category,
    investor: category === "investor" ? { fundSize: str(fd.get("fundSize"), 60), stages: list("stages", 10), focus: list("focus", 12) } : null,
    event:
      category === "event"
        ? {
            start: date("eventStart"),
            end: date("eventEnd"),
            city: str(fd.get("eventCity"), 80),
            format: ["In person", "Online", "Hybrid"].includes(String(fd.get("eventFormat"))) ? String(fd.get("eventFormat")) : "In person",
            speakers: named("speakers").map((x) => ({ name: x.title, slug: x.slug })),
            sponsors: named("sponsors"),
          }
        : null,
    saas:
      category === "saas"
        ? {
            pricing: (String(fd.get("saasPricing") ?? "") in SAAS_PRICING ? String(fd.get("saasPricing")) : "") as SaasInfo["pricing"],
            platforms: list("saasPlatforms", 8),
          }
        : null,
  };
}

function parseJobs(fd: FormData, prev: PageDoc | null): Job[] {
  const prevById = new Map((prev?.jobs ?? []).map((j) => [j.id, j]));
  const seen = new Set<string>();
  return parseRows<Job>(fd, "jobs", 50, (r) => {
    const title = str(r.title, 120);
    if (!title) return null;
    let id = /^[a-z0-9]{6,16}$/.test(String(r.id)) ? String(r.id) : "";
    if (!id || seen.has(id)) id = Math.random().toString(36).slice(2, 10);
    seen.add(id);
    const pick = <T extends readonly string[]>(list: T, v: unknown, fallback: string) => ((list as readonly string[]).includes(String(v)) ? String(v) : fallback);
    const money = (v: unknown) => {
      const n = Math.round(Number(String(v ?? "").replace(/[^\d.]/g, "")));
      return Number.isFinite(n) && n > 0 && n < 100_000_000 ? n : null;
    };
    let salaryMin = money(r.salaryMin);
    let salaryMax = money(r.salaryMax);
    if (salaryMin && salaryMax && salaryMin > salaryMax) [salaryMin, salaryMax] = [salaryMax, salaryMin];
    const prevJob = prevById.get(id);
    const description = String(r.description ?? "").trim().slice(0, 5000);
    return {
      id,
      title,
      location: str(r.location, 120),
      type: pick(JOB_TYPES, r.type, "Full-time"),
      url: httpUrl(r.url),
      // An edited listing counts as fresh again (it stays up for JOB_DAYS from here)
      postedAt: prevJob && prevJob.title === title && (prevJob.description ?? "") === description ? prevJob.postedAt : new Date(),
      featured: bool(r.featured),
      workplace: pick(WORKPLACES, r.workplace, "On-site"),
      level: pick(JOB_LEVELS, r.level, ""),
      salaryMin,
      salaryMax,
      currency: pick(CURRENCIES, r.currency, "USD"),
      salaryPeriod: pick(SALARY_PERIODS, r.salaryPeriod, "year"),
      description,
      applyEmail: email(r.applyEmail),
    };
  });
}

function parseSources(v: FormDataEntryValue | null): SourceRef[] {
  return parseJsonArray(v, 30)
    .map((s) => ({ title: str(s.title, 200), url: httpUrl(s.url) }))
    .filter((s) => s.url)
    .map((s) => ({ ...s, title: s.title || s.url }));
}

/** Reads and checks the profile form. Returns the data to save, or an error to show. */
async function personFromForm(user: SessionUser, fd: FormData): Promise<{ error: string } | { input: PersonInput; prev: PageDoc | null }> {
  const title = str(fd.get("title"), 120);
  const occupation = str(fd.get("occupation"), 120);
  if (title.length < 2) return { error: "Full name is required." };
  if (!occupation) return { error: "Occupation is required." };
  const body = String(fd.get("body") ?? "").slice(0, MAX_BODY);

  const experiences: PersonInput["experiences"] = parseJsonArray(fd.get("experiences"), 30)
    .map((e) => {
      const current = bool(e.current);
      return {
        orgTitle: str(e.orgTitle, 160),
        role: str(e.role, 120),
        startYear: year(e.startYear),
        endYear: current ? null : year(e.endYear),
        current,
        description: str(e.description, 2000),
      };
    })
    .filter((e) => slugify(e.orgTitle));

  const educations: PersonInput["educations"] = parseJsonArray(fd.get("educations"), 15)
    .map((e) => ({
      schoolTitle: str(e.schoolTitle, 160),
      degree: str(e.degree, 80),
      field: str(e.field, 120),
      startYear: year(e.startYear),
      endYear: year(e.endYear),
    }))
    .filter((e) => slugify(e.schoolTitle));

  // #28 / #29: date consistency and duplicate positions
  const problems = [
    ...experiences.flatMap((e) => yearProblems(e.orgTitle, e)),
    ...educations.flatMap((e) => yearProblems(e.schoolTitle, e)),
    ...duplicatePositions(experiences).map((t) => `${t}: this position appears twice.`),
  ];
  if (problems.length) return { error: problems.slice(0, 4).join(" ") };

  const sources = parseSources(fd.get("sources"));
  const tags = parseTags(fd.get("tags"));
  const summary = str(fd.get("summary"), 400);
  const website = httpUrl(fd.get("website"));
  const prev = await getPersonPageOf(user.id);
  const before = new Set(prev ? externalLinks(prev.body, prev.infobox.website, ...prev.sources.map((x) => x.url)) : []);
  const guardError = await guardContent(user, {
    texts: [title, occupation, summary, body, tags.join(" "), ...experiences.map((e) => `${e.role} ${e.description}`)],
    newLinks: externalLinks(body, website, ...sources.map((x) => x.url)).filter((l) => !before.has(l)),
    page: prev,
  });
  if (guardError) return { error: guardError };

  let image: StoredImage | null | undefined;
  let projects: Project[];
  let cover: StoredImage | null | undefined;
  try {
    image = await imageFrom(fd, "photo");
    cover = await coverFrom(fd);
    projects = await parseProjects(fd, prev, user.id);
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message };
    throw err;
  }
  const publications = parseRows<Publication>(fd, "publications", 50, (r) =>
    str(r.title, 200) ? { title: str(r.title, 200), publisher: str(r.publisher, 120), year: year(r.year), url: httpUrl(r.url) } : null,
  );
  const awards = parseRows<Award>(fd, "awards", 50, (r) =>
    str(r.title, 160) ? { title: str(r.title, 160), issuer: str(r.issuer, 120), year: year(r.year), url: httpUrl(r.url), kind: r.kind === "certification" ? "certification" : "award" } : null,
  );
  const talks = parseRows<Talk>(fd, "talks", 50, (r) => (str(r.title, 200) ? { title: str(r.title, 200), event: str(r.event, 120), year: year(r.year), url: httpUrl(r.url) } : null));
  const patents = parseRows<Patent>(fd, "patents", 30, (r) => (str(r.title, 200) ? { title: str(r.title, 200), number: str(r.number, 60), year: year(r.year), url: httpUrl(r.url) } : null));
  const volunteering = parseRows<Volunteering>(fd, "volunteering", 20, (r) =>
    str(r.org, 120) ? { org: str(r.org, 120), role: str(r.role, 120), startYear: year(r.startYear), endYear: year(r.endYear), description: str(r.description, 600) } : null,
  );
  const languageLevels = parseRows<LanguageLevel>(fd, "languageLevels", 15, (r) =>
    str(r.name, 40) ? { name: str(r.name, 40), level: LEVELS.includes(String(r.level)) ? String(r.level) : "" } : null,
  );
  const openTo = fd.getAll("openTo").map(String).filter((k): k is OpenTo => k in OPEN_TO);
  const prevExtra = new Set(
    prev ? externalLinks(...[...prev.projects, ...prev.publications, ...prev.awards, ...prev.talks, ...prev.patents].map((x) => x.url)) : [],
  );
  const extraGuard = await guardContent(user, {
    texts: [...projects.map((x) => `${x.title} ${x.description}`), ...publications.map((x) => x.title), ...awards.map((x) => x.title), ...talks.map((x) => x.title), ...volunteering.map((x) => x.description)],
    newLinks: externalLinks(...[...projects, ...publications, ...awards, ...talks, ...patents].map((x) => x.url)).filter((l) => !prevExtra.has(l)),
    page: prev,
  });
  if (extraGuard) return { error: extraGuard };

  const sectors = cleanSectors(parseJsonList(fd.get("sectors")), false);
  const input: PersonInput = {
    title,
    summary,
    tags,
    sectors,
    infobox: {
      occupation,
      sector: sectors.join(", "),
      nationality: str(fd.get("nationality"), 80),
      birthYear: year(fd.get("birthYear")),
      birthYearPublic: bool(fd.get("birthYearPublic")),
      birthPlace: str(fd.get("birthPlace"), 120),
      location: str(fd.get("location"), 120),
      languages: languageLevels.map((l) => l.name).join(", ") || str(fd.get("languages"), 200),
      skills: str(fd.get("skills"), 400),
      website,
      github: handle(fd.get("github")),
      linkedin: handle(fd.get("linkedin")),
      email: email(fd.get("email")),
      emailPublic: bool(fd.get("emailPublic")),
    },
    body,
    experiences,
    educations,
    sources,
    projects,
    publications,
    awards,
    talks,
    patents,
    volunteering,
    languageLevels,
    openTo,
    noindex: bool(fd.get("noindex")),
    visibility: fd.get("visibility") === "members" ? "members" : "public",
    editSummary: str(fd.get("editSummary"), 300),
    image,
    cover,
  };
  return { input, prev };
}

export async function savePersonAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/edit");
  // Unconfirmed emails can still save: the profile stays private and goes to review once the email is confirmed
  const parsed = await personFromForm(user, fd);
  if ("error" in parsed) return { error: parsed.error };
  const { input, prev } = parsed;
  const page = await savePersonPage(user, input);

  if (isPublic(page)) {
    await notifyFollowers(page._id, user.id, { type: "page_update", text: `${page.title} updated their profile.`, href: `/${page.slug}` });
    await notifyMentions(user, prev?.body ?? "", page.body, { title: `${page.title}'s profile`, href: `/${page.slug}` });
  }
  revalidatePath(`/${page.slug}`);
  if (isPublic(page) && page.visibility !== "members" && !page.noindex) await announce([`/${page.slug}`]);
  // Organizations the person was removed from also need fresh data
  for (const e of prev?.experiences ?? []) expireOrg(e.orgSlug);
  for (const e of prev?.educations ?? []) expireOrg(e.schoolSlug);
  for (const e of page.experiences) revalidatePath(`/org/${e.orgSlug}`);
  for (const e of page.educations) revalidatePath(`/org/${e.schoolSlug}`);
  redirect(`/${page.slug}`);
}

export type AutosaveState = { ok: true; savedAt: string } | { ok: false; error: string } | { ok: false; skipped: true };

/**
 * Saves a profile that isn't public yet while the person is filling it in, so nothing is lost if the
 * browser closes or the final submit fails. Public profiles are only changed by an explicit save.
 */
export async function autosavePersonAction(fd: FormData): Promise<AutosaveState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You are signed out. Log in again to keep your changes." };
  const prev = await getPersonPageOf(user.id);
  if (prev && isPublic(prev)) return { ok: false, skipped: true };
  // Not enough to create a profile yet: wait for the required fields
  if (str(fd.get("title"), 120).length < 2 || !str(fd.get("occupation"), 120)) return { ok: false, skipped: true };
  if (!(await rateLimit(`autosave:${user.id}`, 240, 3600_000))) return { ok: false, skipped: true };
  const parsed = await personFromForm(user, fd);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  await savePersonPage(user, parsed.input, { autosave: true });
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function saveOrgAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const slug = str(fd.get("slug"), 100) || null;
  if (!user) redirect(`/login?next=${encodeURIComponent(slug ? `/org/${slug}/edit` : "/create")}`);
  if (!user.emailVerified) return { error: VERIFY_FIRST };

  const title = str(fd.get("title"), 160);
  if (!slug && !slugify(title)) return { error: "Organization name is required." };
  const type = fd.get("type") === "school" ? "school" : "org";

  if (!slug) {
    const existing = await getPageBySlug(slugify(title));
    if (existing && existing.type !== "person" && existing.body) {
      return { error: `A page called "${existing.title}" already exists. You can edit it instead.` };
    }
    // #25: warn about likely duplicates ("Acme Inc." vs "ACME") unless the user confirms
    const similar = (await findSimilarOrgs(title)).filter((x) => x.slug !== existing?.slug);
    if (similar.length && !bool(fd.get("notDuplicate"))) {
      return { error: `Similar pages already exist: ${similar.map((x) => x.title).join(", ")}. Edit one of them, or tick “This is a different organization” and save again.` };
    }
  }

  const orgBody = String(fd.get("body") ?? "").slice(0, MAX_BODY);
  const orgSources = parseSources(fd.get("sources"));
  const prevOrg = slug ? await getPageBySlug(slug) : null;
  const orgBefore = new Set(prevOrg ? externalLinks(prevOrg.body, prevOrg.infobox.website, ...prevOrg.sources.map((x) => x.url)) : []);
  const orgGuard = await guardContent(user, {
    texts: [title, str(fd.get("summary"), 400), orgBody, String(fd.get("tags") ?? "")],
    newLinks: externalLinks(orgBody, httpUrl(fd.get("website")), ...orgSources.map((x) => x.url)).filter((l) => !orgBefore.has(l)),
    page: prevOrg,
  });
  if (orgGuard) return { error: orgGuard };
  const orgExtras = parseOrgExtras(fd);
  let orgExtrasJobs: Job[] | undefined;
  if (!slug && fd.get("category") === "saas" && !(await featureOn("saas"))) return { error: "SaaS projects can't be added right now." };
  // SaaS projects pick from the SaaS categories, other organizations from the industry list
  const orgSectors = cleanSectors(parseJsonList(fd.get("sectors")), fd.get("category") === "saas");
  // "Part of": a company can't be its own parent, nor the parent of its parent
  if (orgExtras.parent) {
    const self = slug ?? slugify(title);
    if (orgExtras.parent.slug === self) return { error: "A company can't be part of itself." };
    const parentPage = await getPageBySlug(orgExtras.parent.slug, ["org", "school"]);
    if (parentPage?.parent?.slug === self) {
      return { error: `${parentPage.title} is already listed as part of this company, so it can't also be its parent. Remove one of the two links.` };
    }
  }
  const extrasGuard = await guardContent(user, {
    texts: [...orgExtras.milestones.map((m) => m.text), ...orgExtras.press.map((x) => x.title), ...orgExtras.leadership.map((l) => `${l.name} ${l.role}`), ...orgExtras.formerNames],
    newLinks: externalLinks(...orgExtras.press.map((x) => x.url)).filter((l) => !new Set(externalLinks(...(prevOrg?.press ?? []).map((x) => x.url))).has(l)),
    page: prevOrg,
  });
  if (extrasGuard) return { error: extrasGuard };
  const canManageJobs = user.role !== "user" || Boolean(prevOrg && prevOrg.orgAdmins.includes(user.id));
  const business = Boolean(prevOrg && featureUnlocked(prevOrg.plan, "business") && canManageJobs);
  const featuredJobs = Boolean(business && prevOrg && paidPlansEnabled() && planActive(prevOrg.plan, "business"));

  let image: StoredImage | null | undefined;
  let products: Project[];
  let orgCover: StoredImage | null | undefined;
  try {
    image = await imageFrom(fd, "logo");
    orgCover = await coverFrom(fd);
    products = await parseImageCards(fd, prevOrg?.products ?? [], "products", "productImage_");
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message };
    throw err;
  }

  let pageSlug: string;
  try {
    const page = await saveOrgPage(user, slug, {
      title,
      type,
      summary: str(fd.get("summary"), 400),
      tags: parseTags(fd.get("tags")),
      sectors: orgSectors,
      infobox: {
        kind: str(fd.get("kind"), 60),
        founded: year(fd.get("founded")),
        founders: str(fd.get("founders"), 300),
        headquarters: str(fd.get("headquarters"), 120),
        sector: orgSectors.join(", "),
        employees: str(fd.get("employees"), 40),
        website: httpUrl(fd.get("website")),
      },
      body: orgBody,
      sources: orgSources,
      fundingRounds: parseFunding(fd.get("fundingRounds")),
      products,
      ...orgExtras,
      // Job listings: only the organization's own admins (and moderators) can publish them
      jobs: (orgExtrasJobs = canManageJobs && fd.has("jobs") ? parseJobs(fd, prevOrg).map((j) => ({ ...j, featured: featuredJobs && j.featured })) : undefined),
      ...parseCategory(fd),
      raising: fd.has("raisingStage") ? parseRaising(fd, prevOrg) : undefined,
      // #97: brand colour is a Business-plan feature
      brandColor: business && fd.has("brandColor") ? (/^#[0-9a-f]{6}$/i.test(String(fd.get("brandColor"))) ? String(fd.get("brandColor")) : "") : undefined,
      editSummary: str(fd.get("editSummary"), 300),
      image,
      cover: orgCover,
      protectDays: fd.has("protectDays") ? Math.max(0, Math.min(365, Number(fd.get("protectDays")) || 0)) : undefined,
      protectReason: str(fd.get("protectReason"), 200),
      claimDomain: fd.has("claimDomain") ? str(fd.get("claimDomain"), 120).toLowerCase().replace(/^@/, "").replace(/^www\./, "") : undefined,
    });
    pageSlug = page.slug;
    // Members who asked to hear about new raises get a notification when a company starts raising
    if (page.raising && !prevOrg?.raising && (await featureOn("raising"))) {
      const { notifyNewRaise } = await import("../raising");
      await notifyNewRaise(page, user.id);
    }
    // Moderators and the page's own admins can rename it here: the address changes and the old one redirects
    const canRename = user.role === "admin" || user.role === "moderator" || page.orgAdmins.includes(user.id);
    if (slug && canRename && title.length >= 2 && title !== page.title) {
      const { renameOrg } = await import("../org-tools");
      const res = await renameOrg(user, page.slug, title);
      if (res.error) return { error: res.error };
      if (res.slug) {
        expireOrg(page.slug);
        pageSlug = res.slug;
      }
    }
    await notifyFollowers(page._id, user.id, { type: "page_update", text: `The ${title.length >= 2 && slug && canRename ? title : page.title} page was updated.`, href: `/org/${pageSlug}` });
    await notifyMentions(user, prevOrg?.body ?? "", page.body, { title: page.title, href: `/org/${page.slug}` });
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/org/${pageSlug}`);
  {
    // Search engines learn about the page and any new job listings right away
    const newJobs = (orgExtrasJobs ?? []).filter((j) => !(prevOrg?.jobs ?? []).some((p) => p.id === j.id));
    await announce([`/org/${pageSlug}`, ...newJobs.map((j) => `/jobs/${pageSlug}/${j.id}`)]);
  }
  // Pages that show this organization's data (investors' "Investments", acquired companies, parent's "Group")
  const related = new Set([
    ...orgExtras.acquisitions.map((a) => a.slug),
    ...(orgExtras.parent ? [orgExtras.parent.slug] : []),
    ...(prevOrg?.parent ? [prevOrg.parent.slug] : []),
    ...(prevOrg?.acquisitions ?? []).map((a) => a.slug),
    ...parseFunding(fd.get("fundingRounds")).flatMap((r) => r.investors.map((i) => i.slug)),
    ...(prevOrg?.fundingRounds ?? []).flatMap((r) => r.investors.map((i) => i.slug)),
  ]);
  for (const s of related) expireOrg(s);
  redirect(`/org/${pageSlug}`);
}

export async function toggleFollowAction(fd: FormData): Promise<void> {
  const slug = str(fd.get("slug"), 100);
  const page = await getPageBySlug(slug);
  if (!page) return;
  const href = pageHref(page.type, page.slug);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(href)}`);
  if (!canView(page, user)) return;
  const nowFollowing = await toggleFollow(user.id, page._id);
  if (nowFollowing && page.type === "person" && page.ownerId && page.ownerId !== user.id) {
    await notify([page.ownerId], { type: "follower", text: `${user.name} started following you.`, href: `/${page.slug}`, pageId: page._id });
  }
  revalidatePath(href);
}

export async function thankAction(fd: FormData): Promise<void> {
  const slug = str(fd.get("slug"), 100);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/${slug}`);
  const page = await getPageBySlug(slug, "person");
  if (!page || !isPublic(page) || !user.emailVerified) return;
  if (!(await rateLimit(`thanks:${user.id}`, 30, 3600_000))) return;
  await giveThanks(user, page);
  revalidatePath(`/${slug}`);
}

/** #51: renders Markdown exactly like the published page (wiki links resolved, red links for missing pages). */
export async function previewMarkdownAction(text: string): Promise<{ html: string }> {
  const user = await getCurrentUser();
  if (!user) return { html: "" };
  const { renderArticle, extractWikiLinks } = await import("../wikitext");
  const { existingPages } = await import("../pages");
  const body = String(text ?? "").slice(0, 100_000);
  const existing = await existingPages(extractWikiLinks(body).map((l) => l.slug));
  const r = renderArticle(body, existing);
  return { html: r.leadHtml + r.restHtml };
}
