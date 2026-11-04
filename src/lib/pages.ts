import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Follow, Page, Revision, Session, Suggestion, Testimonial, Thank, Token, User } from "./models";
import { isReservedSlug, searchKey, slugify } from "./slug";
import { extractWikiLinks } from "./wikitext";
import { deleteImage } from "./storage";
import { PUBLIC_FILTER, statusAfterOwnerSave } from "./visibility";
import type {
  Acquisition, Award, Education, Experience, FundingRound, Job, LanguageLevel, Leader, LinkedName, Milestone, Office, OpenTo, OrgInfobox, Patent, PressItem, Project, Publication, Talk, Ticker, Volunteering, PageDoc, PageType, PersonInfobox, RevisionDoc, SessionUser, SourceRef, StoredImage,
} from "./types";

/* ───────────── Mapping ───────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPage(d: any): PageDoc {
  return {
    _id: String(d._id),
    type: d.type,
    slug: d.slug,
    title: d.title,
    titleKey: d.titleKey,
    summary: d.summary ?? "",
    ownerId: d.ownerId ? String(d.ownerId) : null,
    status: d.status,
    image: d.image?.url ? { key: d.image.key, url: d.image.url, hash: d.image.hash } : null,
    infobox: d.infobox ?? {},
    body: d.body ?? "",
    experiences: d.experiences ?? [],
    educations: d.educations ?? [],
    outLinks: d.outLinks ?? [],
    tags: d.tags ?? [],
    orgAdmins: (d.orgAdmins ?? []).map(String),
    claimDomain: d.claimDomain ?? null,
    websiteChangedAt: d.websiteChangedAt ?? null,
    protectedUntil: d.protectedUntil ?? null,
    protectedReason: d.protectedReason ?? "",
    sources: d.sources ?? [],
    fundingRounds: d.fundingRounds ?? [],
    projects: d.projects ?? [],
    publications: d.publications ?? [],
    awards: d.awards ?? [],
    talks: d.talks ?? [],
    patents: d.patents ?? [],
    volunteering: d.volunteering ?? [],
    languageLevels: d.languageLevels ?? [],
    openTo: d.openTo ?? [],
    products: d.products ?? [],
    offices: d.offices ?? [],
    parent: d.parent?.slug ? { title: d.parent.title, slug: d.parent.slug } : null,
    acquisitions: d.acquisitions ?? [],
    leadership: d.leadership ?? [],
    formerNames: d.formerNames ?? [],
    milestones: d.milestones ?? [],
    press: d.press ?? [],
    jobs: d.jobs ?? [],
    ticker: d.ticker?.symbol ? { exchange: d.ticker.exchange ?? "", symbol: d.ticker.symbol } : null,
    verified: Boolean(d.verified),
    review: {
      submittedAt: d.review?.submittedAt ?? null,
      reviewedAt: d.review?.reviewedAt ?? null,
      reviewerName: d.review?.reviewerName ?? "",
      note: d.review?.note ?? "",
      flags: d.review?.flags ?? [],
    },
    followerCount: d.followerCount ?? 0,
    thanksCount: d.thanksCount ?? 0,
    noindex: Boolean(d.noindex),
    revisionCount: d.revisionCount ?? 0,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

/** Lightweight shape used by cards, lists and search results. */
export interface PageCard {
  slug: string;
  title: string;
  type: PageType;
  summary: string;
  image: StoredImage | null;
  verified: boolean;
  /** e.g. "Acme · Senior Engineer" for people, sector for organisations */
  subtitle: string;
  detail?: string;
}

const CARD_FIELDS = { slug: 1, title: 1, type: 1, summary: 1, image: 1, verified: 1, infobox: 1, experiences: 1 };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCard(d: any, detail?: string): PageCard {
  let subtitle = "";
  if (d.type === "person") {
    const cur = (d.experiences as Experience[] | undefined)?.find((e) => e.current && e.verification !== "rejected");
    subtitle = cur ? [cur.orgTitle, cur.role].filter(Boolean).join(" · ") : (d.infobox?.occupation ?? "");
  } else {
    subtitle = d.infobox?.sector || (d.type === "school" ? "Education" : "");
  }
  return {
    slug: d.slug,
    title: d.title,
    type: d.type,
    summary: d.summary ?? "",
    image: d.image?.url ? { key: d.image.key, url: d.image.url } : null,
    verified: Boolean(d.verified) || d.status === "claimed",
    subtitle,
    detail,
  };
}

export function currentRole(page: Pick<PageDoc, "experiences" | "infobox">): string {
  const cur = page.experiences.find((e) => e.current && e.verification !== "rejected");
  return cur ? [cur.orgTitle, cur.role].filter(Boolean).join(" · ") : (page.infobox.occupation ?? "");
}

/* ───────────── Reads ───────────── */

export async function getPageBySlug(slug: string, type?: PageType | PageType[]): Promise<PageDoc | null> {
  await connectDB();
  const filter: Record<string, unknown> = { slug };
  if (type) filter.type = Array.isArray(type) ? { $in: type } : type;
  const d = await Page.findOne(filter).lean();
  return d ? toPage(d) : null;
}

export async function getPersonPageOf(userId: string): Promise<PageDoc | null> {
  await connectDB();
  const d = await Page.findOne({ type: "person", ownerId: new Types.ObjectId(userId) }).lean();
  return d ? toPage(d) : null;
}

/** Which of these slugs exist? (blue vs. red link) */
export async function existingPages(slugs: string[]): Promise<Map<string, PageType>> {
  if (slugs.length === 0) return new Map();
  await connectDB();
  const rows = await Page.find(
    { $or: [{ slug: { $in: slugs } }, { oldSlugs: { $in: slugs } }], ...PUBLIC_FILTER },
    { slug: 1, type: 1, oldSlugs: 1 },
  ).lean<{ slug: string; type: PageType; oldSlugs?: string[] }[]>();
  const map = new Map<string, PageType>();
  // A renamed page still counts as existing under its old address (that URL redirects)
  for (const r of rows) for (const s of [r.slug, ...(r.oldSlugs ?? [])]) if (slugs.includes(s)) map.set(s, r.type);
  return map;
}

export async function getCards(slugs: string[]): Promise<PageCard[]> {
  if (slugs.length === 0) return [];
  await connectDB();
  const rows = await Page.find({ slug: { $in: slugs }, ...PUBLIC_FILTER }, { ...CARD_FIELDS, status: 1 }).lean();
  const bySlug = new Map(rows.map((r) => [r.slug as string, toCard(r)]));
  return slugs.map((s) => bySlug.get(s)).filter((c): c is PageCard => Boolean(c));
}

const yearRange = (a?: number | null, b?: number | null, current?: boolean) =>
  a || b || current ? `${a ?? "?"}–${current ? "Present" : (b ?? "?")}` : "";

/** People who work / worked at an organisation (derived from their career entries). */
export async function getPeopleOfOrg(orgSlug: string) {
  await connectDB();
  const docs = await Page.find({ type: "person", "experiences.orgSlug": orgSlug, ...PUBLIC_FILTER }, CARD_FIELDS)
    .sort({ title: 1 })
    .limit(500)
    .lean();
  const current: PageCard[] = [];
  const former: PageCard[] = [];
  for (const d of docs) {
    const exps = (d.experiences as Experience[]).filter((e) => e.orgSlug === orgSlug && e.verification !== "rejected");
    if (exps.length === 0) continue;
    const now = exps.find((e) => e.current);
    const e = now ?? exps[0];
    const c = toCard(d, [e.role, yearRange(e.startYear, e.endYear, e.current)].filter(Boolean).join(" · "));
    c.subtitle = e.role || c.subtitle;
    (now ? current : former).push(c);
  }
  return { current, former };
}

export async function getAlumni(schoolSlug: string): Promise<PageCard[]> {
  await connectDB();
  const docs = await Page.find({ type: "person", "educations.schoolSlug": schoolSlug, ...PUBLIC_FILTER }, { ...CARD_FIELDS, educations: 1 })
    .sort({ title: 1 })
    .limit(500)
    .lean();
  return docs.map((d) => {
    const e = (d.educations as Education[]).find((x) => x.schoolSlug === schoolSlug)!;
    return toCard(d, [e.field, e.degree, e.endYear].filter(Boolean).join(", "));
  });
}

/** "What links here" */
export async function getBacklinks(slug: string) {
  await connectDB();
  return Page.find({ "outLinks.slug": slug, ...PUBLIC_FILTER }, { slug: 1, title: 1, type: 1 })
    .sort({ title: 1 })
    .limit(200)
    .lean<{ slug: string; title: string; type: PageType }[]>();
}

export async function listRevisions(pageId: string): Promise<RevisionDoc[]> {
  await connectDB();
  const rows = await Revision.find({ pageId }, { snapshot: 0 }).sort({ createdAt: -1 }).limit(200).lean();
  return rows.map((r) => ({
    _id: String(r._id),
    pageId: String(r.pageId),
    authorId: String(r.authorId),
    authorName: r.authorName,
    editSummary: r.editSummary,
    size: r.size,
    delta: r.delta,
    createdAt: r.createdAt,
  }));
}

/** Rounds in which this page (person or organization) invested. */
export async function getInvestments(slug: string) {
  await connectDB();
  const rows = await Page.find({ "fundingRounds.investors.slug": slug, ...PUBLIC_FILTER }, { ...CARD_FIELDS, status: 1, fundingRounds: 1 })
    .sort({ title: 1 })
    .limit(200)
    .lean();
  return rows.map((r) => ({
    company: toCard(r),
    rounds: (r.fundingRounds as FundingRound[]).filter((f) => f.investors.some((i) => i.slug === slug)),
  }));
}

/* ───────────── Search & listings ───────────── */

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface SearchParams {
  q: string;
  types?: PageType[];
  sectors?: string[];
  limit?: number;
}

export async function searchPages({ q, types, sectors, limit = 40 }: SearchParams) {
  const key = searchKey(q);
  await connectDB();
  const base: Record<string, unknown> = { ...PUBLIC_FILTER };
  if (key) {
    const rx = { $regex: `(^| )${escapeRegex(key)}` };
    base.$or = [
      { titleKey: rx },
      { tags: { $regex: escapeRegex(q.trim()), $options: "i" } },
      { formerNames: { $regex: escapeRegex(q.trim()), $options: "i" } },
    ];
  }
  const filter: Record<string, unknown> = { ...base };
  if (types?.length) filter.type = { $in: types };
  if (sectors?.length) filter["infobox.sector"] = { $in: sectors };

  const [rows, total, typeFacet, sectorFacet] = await Promise.all([
    Page.find(filter, { ...CARD_FIELDS, status: 1 }).sort({ type: 1, followerCount: -1, title: 1 }).limit(limit).lean(),
    Page.countDocuments(filter),
    // Facet counts ignore their own filter so users can switch between options
    Page.aggregate([
      { $match: { ...base, ...(sectors?.length ? { "infobox.sector": { $in: sectors } } : {}) } },
      { $group: { _id: "$type", n: { $sum: 1 } } },
    ]),
    Page.aggregate([
      { $match: { ...base, ...(types?.length ? { type: { $in: types } } : {}), "infobox.sector": { $nin: [null, ""] } } },
      { $group: { _id: "$infobox.sector", n: { $sum: 1 } } },
      { $sort: { n: -1, _id: 1 } },
      { $limit: 12 },
    ]),
  ]);
  return {
    results: rows.map((r) => toCard(r)),
    total,
    typeCounts: Object.fromEntries(typeFacet.map((f) => [f._id, f.n])) as Partial<Record<PageType, number>>,
    sectorCounts: sectorFacet.map((f) => ({ sector: f._id as string, count: f.n as number })),
  };
}

export async function listPages(opts: { types: PageType[]; sector?: string; page?: number; perPage?: number }) {
  await connectDB();
  const perPage = opts.perPage ?? 24;
  const page = Math.max(1, opts.page ?? 1);
  const filter: Record<string, unknown> = { type: { $in: opts.types }, ...PUBLIC_FILTER };
  if (opts.sector) filter["infobox.sector"] = opts.sector;
  const [rows, total] = await Promise.all([
    Page.find(filter, { ...CARD_FIELDS, status: 1 })
      .sort({ followerCount: -1, updatedAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
    Page.countDocuments(filter),
  ]);
  return { items: rows.map((r) => toCard(r)), total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function listSectors() {
  await connectDB();
  const rows = await Page.aggregate([
    { $match: { "infobox.sector": { $nin: [null, ""] }, ...PUBLIC_FILTER } },
    { $group: { _id: "$infobox.sector", orgs: { $sum: { $cond: [{ $eq: ["$type", "person"] }, 0, 1] } }, people: { $sum: { $cond: [{ $eq: ["$type", "person"] }, 1, 0] } } } },
    { $sort: { orgs: -1, people: -1, _id: 1 } },
    { $limit: 300 },
  ]);
  return rows.map((r) => ({ sector: r._id as string, orgs: r.orgs as number, people: r.people as number }));
}

export async function homeData() {
  await connectDB();
  const [people, orgs, sectors, featuredPeople, featuredOrgs] = await Promise.all([
    Page.countDocuments({ type: "person", ...PUBLIC_FILTER }),
    Page.countDocuments({ type: { $in: ["org", "school"] } }),
    Page.distinct("infobox.sector", { "infobox.sector": { $nin: [null, ""] }, ...PUBLIC_FILTER }),
    Page.find({ type: "person", ...PUBLIC_FILTER }, { ...CARD_FIELDS, status: 1 }).sort({ followerCount: -1, updatedAt: -1 }).limit(8).lean(),
    Page.find({ type: { $in: ["org", "school"] }, body: { $ne: "" } }, { ...CARD_FIELDS, status: 1 })
      .sort({ followerCount: -1, updatedAt: -1 })
      .limit(8)
      .lean(),
  ]);
  return {
    stats: { people, orgs, sectors: sectors.length },
    featuredPeople: featuredPeople.map((d) => toCard(d)),
    featuredOrgs: featuredOrgs.map((d) => toCard(d)),
  };
}

export async function randomSlug(): Promise<{ slug: string; type: PageType } | null> {
  await connectDB();
  const [r] = await Page.aggregate([{ $match: { ...PUBLIC_FILTER } }, { $sample: { size: 1 } }, { $project: { slug: 1, type: 1 } }]);
  return r ?? null;
}

export async function allSlugsForSitemap() {
  await connectDB();
  return Page.find({ noindex: { $ne: true }, ...PUBLIC_FILTER, $or: [{ type: "person" }, { body: { $ne: "" } }] }, { slug: 1, type: 1, updatedAt: 1 })
    .limit(50_000)
    .lean<{ slug: string; type: PageType; updatedAt: Date }[]>();
}

/** For the organisation autocomplete in the editor. */
export async function suggestOrgs(q: string) {
  const key = searchKey(q);
  if (!key) return [];
  await connectDB();
  return Page.find({ type: { $in: ["org", "school"] }, titleKey: { $regex: `(^| )${escapeRegex(key)}` } }, { slug: 1, title: 1, type: 1 })
    .sort({ followerCount: -1 })
    .limit(8)
    .lean<{ slug: string; title: string; type: PageType }[]>();
}

/* ───────────── Review queue (profile applications) ───────────── */

export interface ApplicationRow extends PageCard {
  status: PageDoc["status"];
  occupation: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewerName: string;
  note: string;
  flags: string[];
  email: string;
}

export async function listApplications(status: "pending" | "rejected" | "published", limit = 100): Promise<ApplicationRow[]> {
  await connectDB();
  const sort: Record<string, 1 | -1> = status === "pending" ? { "review.submittedAt": 1 } : { "review.reviewedAt": -1 };
  const filter: Record<string, unknown> = { type: "person", status };
  if (status === "published") filter["review.reviewedAt"] = { $ne: null };
  const rows = await Page.find(filter, { ...CARD_FIELDS, status: 1, review: 1, ownerId: 1 }).sort(sort).limit(limit).lean();
  const owners = await User.find({ _id: { $in: rows.map((r) => r.ownerId).filter(Boolean) } }, { email: 1 }).lean<{ _id: unknown; email: string }[]>();
  const emailOf = new Map(owners.map((o) => [String(o._id), o.email]));
  return rows.map((r) => ({
    ...toCard(r),
    status: r.status,
    occupation: r.infobox?.occupation ?? "",
    submittedAt: r.review?.submittedAt ?? null,
    reviewedAt: r.review?.reviewedAt ?? null,
    reviewerName: r.review?.reviewerName ?? "",
    note: r.review?.note ?? "",
    flags: r.review?.flags ?? [],
    email: emailOf.get(String(r.ownerId)) ?? "",
  }));
}

export async function countPendingApplications(): Promise<number> {
  await connectDB();
  return Page.countDocuments({ type: "person", status: "pending" });
}

export async function getOwnerContact(ownerId: string | null): Promise<{ email: string; name: string; notify: boolean } | null> {
  if (!ownerId) return null;
  await connectDB();
  const u = await User.findById(ownerId, { email: 1, name: 1, emailPrefs: 1 }).lean<{ email: string; name: string; emailPrefs?: { profileUpdates?: boolean } }>();
  return u ? { email: u.email, name: u.name, notify: u.emailPrefs?.profileUpdates !== false } : null;
}

/** Approve or reject a person profile application. */
export async function decideApplication(
  reviewer: SessionUser,
  slug: string,
  decision: { approve: true; verified: boolean } | { approve: false; note: string },
): Promise<PageDoc | null> {
  await connectDB();
  const page = await Page.findOne({ slug, type: "person" });
  if (!page) return null;
  page.status = decision.approve ? "published" : "rejected";
  if (decision.approve && decision.verified) page.verified = true;
  page.set("review.reviewedAt", new Date());
  page.set("review.reviewerId", reviewer.id);
  page.set("review.reviewerName", reviewer.name);
  page.set("review.note", decision.approve ? "" : decision.note);
  page.revisionCount = (page.revisionCount ?? 0) + 1;
  await page.save();
  await Revision.create({
    pageId: page._id,
    authorId: reviewer.id,
    authorName: reviewer.name,
    editSummary: decision.approve ? "Application approved" : `Application not approved: ${decision.note}`.slice(0, 300),
    snapshot: { status: page.status },
    size: page.body?.length ?? 0,
    delta: 0,
  });
  return toPage(page.toObject());
}

/* ───────────── Follow ───────────── */

export async function isFollowing(userId: string, pageId: string): Promise<boolean> {
  await connectDB();
  return Boolean(await Follow.exists({ userId, pageId }));
}

export async function toggleFollow(userId: string, pageId: string): Promise<boolean> {
  await connectDB();
  const removed = await Follow.deleteOne({ userId, pageId });
  if (removed.deletedCount) {
    await Page.updateOne({ _id: pageId, followerCount: { $gt: 0 } }, { $inc: { followerCount: -1 } });
    return false;
  }
  try {
    await Follow.create({ userId, pageId });
    await Page.updateOne({ _id: pageId }, { $inc: { followerCount: 1 } });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err; // double click: already following
  }
  return true;
}

/* ───────────── Writes ───────────── */

export type OrgRef = { title: string; type: "org" | "school" };

/**
 * Resolves the organisation named in a career/education entry; creates a draft page if
 * it does not exist yet. (The "red link loop": the encyclopedia grows by itself.)
 */
export async function ensureOrgPage(ref: OrgRef, authorId: string): Promise<{ slug: string; title: string }> {
  await connectDB();
  const title = ref.title.trim().slice(0, 160);
  const base = slugify(title);
  if (!base) throw new Error("Invalid organization name");

  for (const slug of [base, `${base}-${ref.type === "school" ? "school" : "company"}`, `${base}-org`]) {
    if (isReservedSlug(slug)) continue;
    const existing = await Page.findOne({ slug }, { type: 1, title: 1 }).lean<{ type: PageType; title: string }>();
    if (existing) {
      if (existing.type !== "person") return { slug, title: existing.title };
      continue; // a person already uses this slug, try the next candidate
    }
    try {
      const page = await Page.create({
        type: ref.type,
        slug,
        title,
        titleKey: searchKey(title),
        status: "draft",
        infobox: {},
        body: "",
        revisionCount: 1,
      });
      await Revision.create({
        pageId: page._id,
        authorId,
        authorName: "Portfedia",
        editSummary: "Draft page created automatically",
        snapshot: { title, infobox: {}, body: "" },
        size: 0,
        delta: 0,
      });
      return { slug, title };
    } catch (err) {
      // Someone created it concurrently (unique index): use theirs
      if ((err as { code?: number }).code === 11000) {
        const again = await Page.findOne({ slug }, { type: 1, title: 1 }).lean<{ type: PageType; title: string }>();
        if (again && again.type !== "person") return { slug, title: again.title };
        continue;
      }
      throw err;
    }
  }
  throw new Error("Could not find a free address for this organization");
}

async function uniquePersonSlug(name: string, occupation: string): Promise<string> {
  const base = slugify(name) || "person";
  const candidates = [base, slugify(`${name} ${occupation}`)];
  for (let i = 2; i < 50; i++) candidates.push(`${base}-${i}`);
  for (const c of candidates) {
    if (!c || isReservedSlug(c)) continue;
    if (!(await Page.exists({ slug: c }))) return c;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export interface PersonInput {
  title: string;
  summary: string;
  tags: string[];
  infobox: PersonInfobox;
  body: string;
  experiences: (Omit<Experience, "orgSlug" | "orgTitle" | "verification"> & { orgTitle: string })[];
  educations: (Omit<Education, "schoolSlug" | "schoolTitle"> & { schoolTitle: string })[];
  sources: SourceRef[];
  projects: Project[];
  publications: Publication[];
  awards: Award[];
  talks: Talk[];
  patents: Patent[];
  volunteering: Volunteering[];
  languageLevels: LanguageLevel[];
  openTo: OpenTo[];
  noindex: boolean;
  editSummary: string;
  image?: StoredImage | null; // undefined = keep, null = remove
}

export async function savePersonPage(user: SessionUser, input: PersonInput): Promise<PageDoc> {
  await connectDB();
  const existing = await Page.findOne({ type: "person", ownerId: new Types.ObjectId(user.id) });

  // Link organisations/schools to pages (creating drafts when missing)
  const prevExps: Experience[] = existing?.experiences?.map((e: { toObject: () => Experience }) => e.toObject()) ?? [];
  const prevProjects: Project[] = existing?.projects?.map((e: { toObject: () => Project }) => e.toObject()) ?? [];
  const experiences: Experience[] = [];
  for (const e of input.experiences) {
    const org = await ensureOrgPage({ title: e.orgTitle, type: "org" }, user.id);
    // An unchanged entry keeps its verification; an edited entry must be verified again
    const same = prevExps.find(
      (p) => p.orgSlug === org.slug && p.role === e.role && p.startYear === e.startYear && p.endYear === e.endYear && p.current === e.current,
    );
    experiences.push({
      ...e,
      orgSlug: org.slug,
      orgTitle: org.title,
      verification: same?.verification ?? "unverified",
      verifiedVia: same?.verifiedVia ?? null,
    });
  }
  const educations: Education[] = [];
  for (const e of input.educations) {
    const school = await ensureOrgPage({ title: e.schoolTitle, type: "school" }, user.id);
    educations.push({ ...e, schoolSlug: school.slug, schoolTitle: school.title });
  }

  const content = {
    title: input.title,
    titleKey: searchKey(input.title),
    summary: input.summary,
    tags: input.tags,
    infobox: input.infobox,
    body: input.body,
    experiences,
    educations,
    sources: input.sources,
    projects: input.projects,
    publications: input.publications,
    awards: input.awards,
    talks: input.talks,
    patents: input.patents,
    volunteering: input.volunteering,
    languageLevels: input.languageLevels,
    openTo: input.openTo,
    outLinks: extractWikiLinks(input.body),
    noindex: input.noindex,
  };

  let page;
  let oldImage: StoredImage | null = null;
  const prevSize = existing?.body?.length ?? 0;
  const status = statusAfterOwnerSave(existing ? existing.status : null);
  // A new or resubmitted application goes (back) to the review queue
  const resubmitted = status === "pending" && (!existing || existing.status !== "pending");
  if (existing) {
    if (input.image !== undefined) {
      oldImage = existing.image?.url ? { key: existing.image.key, url: existing.image.url } : null;
      existing.image = input.image;
    }
    existing.set(content);
    existing.status = status;
    if (resubmitted) existing.set("review.submittedAt", new Date());
    existing.revisionCount = (existing.revisionCount ?? 0) + 1;
    page = await existing.save();
  } else {
    const slug = await uniquePersonSlug(input.title, input.infobox.occupation ?? "");
    page = await Page.create({
      ...content,
      type: "person",
      slug,
      ownerId: user.id,
      status,
      review: { submittedAt: new Date() },
      image: input.image ?? null,
      revisionCount: 1,
    });
  }

  if (page.status === "pending") {
    // Warn moderators about possible impersonation: same name or same photo as another profile
    const flags: string[] = [];
    const sameName = await Page.find({ type: "person", titleKey: page.titleKey, _id: { $ne: page._id } }, { slug: 1 }).limit(5).lean<{ slug: string }[]>();
    for (const o of sameName) flags.push(`Same name as /${o.slug}`);
    if (page.image?.hash) {
      const samePhoto = await Page.find({ "image.hash": page.image.hash, _id: { $ne: page._id } }, { slug: 1 }).limit(5).lean<{ slug: string }[]>();
      for (const o of samePhoto) flags.push(`Same photo as /${o.slug}`);
    }
    await Page.updateOne({ _id: page._id }, { $set: { "review.flags": flags } });
  }

  await Revision.create({
    pageId: page._id,
    authorId: user.id,
    authorName: user.name,
    editSummary: input.editSummary || (existing ? (resubmitted ? "Resubmitted for review" : "") : "Profile created and submitted for review"),
    snapshot: { ...content, image: page.image ?? null },
    size: input.body.length,
    delta: input.body.length - prevSize,
  });

  if (oldImage && oldImage.key !== input.image?.key) await deleteImage(oldImage);
  // Project images that were removed or replaced
  const kept = new Set(input.projects.map((x) => x.image?.key).filter(Boolean));
  for (const old of (existing ? prevProjects : []) as Project[]) if (old.image?.key && !kept.has(old.image.key)) await deleteImage(old.image);
  return toPage(page.toObject());
}

export interface OrgInput {
  title: string;
  type: "org" | "school";
  summary: string;
  tags: string[];
  infobox: OrgInfobox;
  body: string;
  sources: SourceRef[];
  fundingRounds: FundingRound[];
  products: Project[];
  offices: Office[];
  parent: LinkedName | null;
  acquisitions: Acquisition[];
  leadership: Leader[];
  formerNames: string[];
  milestones: Milestone[];
  press: PressItem[];
  /** undefined = keep (only the organization's admins and moderators may change job listings) */
  jobs?: Job[];
  ticker: Ticker | null;
  editSummary: string;
  image?: StoredImage | null;
  /** Moderators only */
  claimDomain?: string;
  /** Moderators only: 0 removes protection */
  protectDays?: number;
  protectReason?: string;
}

export function isProtected(page: Pick<PageDoc, "protectedUntil">): boolean {
  return Boolean(page.protectedUntil && new Date(page.protectedUntil).getTime() > Date.now());
}

export function canEditOrg(user: SessionUser | null, page: Pick<PageDoc, "status" | "type" | "orgAdmins" | "protectedUntil">): boolean {
  if (!user || page.type === "person") return false;
  if (user.role === "admin" || user.role === "moderator") return true;
  // Protected pages (after vandalism) can only be edited by moderators and the organization's admins
  if (isProtected(page)) return page.orgAdmins.includes(user.id);
  // Claimed pages are edited only by the organization's admins (verified with a work email);
  // unclaimed pages are maintained by the community.
  if (page.status === "claimed") return page.orgAdmins.includes(user.id);
  return true;
}

export function isOrgAdmin(user: SessionUser | null, page: Pick<PageDoc, "orgAdmins">): boolean {
  return Boolean(user && page.orgAdmins.includes(user.id));
}

export class PermissionError extends Error {}

/** Creates a new organisation/school page or updates an existing one. */
export async function saveOrgPage(user: SessionUser, slug: string | null, input: OrgInput): Promise<PageDoc> {
  await connectDB();
  const content = {
    summary: input.summary,
    tags: input.tags,
    infobox: input.infobox,
    body: input.body,
    sources: input.sources,
    fundingRounds: input.fundingRounds,
    products: input.products,
    offices: input.offices,
    parent: input.parent,
    acquisitions: input.acquisitions,
    leadership: input.leadership,
    formerNames: input.formerNames,
    milestones: input.milestones,
    press: input.press,
    ticker: input.ticker,
    ...(input.jobs !== undefined ? { jobs: input.jobs } : {}),
    outLinks: extractWikiLinks(input.body),
  };

  let page;
  if (slug) {
    page = await Page.findOne({ slug, type: { $in: ["org", "school"] } });
    if (!page) throw new PermissionError("Page not found");
  } else {
    const ref = await ensureOrgPage({ title: input.title, type: input.type }, user.id);
    page = await Page.findOne({ slug: ref.slug });
  }
  if (!canEditOrg(user, page)) throw new PermissionError("You don't have permission to edit this page");

  const prevSize = page.body?.length ?? 0;
  const prevProductImages = ((page.products ?? []) as Project[]).map((x) => x.image).filter((x): x is StoredImage => Boolean(x?.key));
  const isMod = user.role === "admin" || user.role === "moderator";
  const prevWebsite: string = page.infobox?.website ?? "";
  // The website decides which email domain may claim the page, so once set it is locked:
  // only moderators and the organization's own admins can change it.
  if (prevWebsite && input.infobox.website !== prevWebsite && !isMod && !page.orgAdmins?.map(String).includes(user.id)) {
    throw new PermissionError("The website can only be changed by the organization or a moderator. Use Report if it is wrong.");
  }
  if (input.infobox.website !== prevWebsite) page.websiteChangedAt = new Date();
  let oldImage: StoredImage | null = null;
  if (input.image !== undefined) {
    oldImage = page.image?.url ? { key: page.image.key, url: page.image.url } : null;
    page.image = input.image;
  }
  if (isMod && input.claimDomain !== undefined) page.claimDomain = input.claimDomain || null;
  if (isMod && input.protectDays !== undefined) {
    page.protectedUntil = input.protectDays > 0 ? new Date(Date.now() + input.protectDays * 86400_000) : null;
    page.protectedReason = input.protectDays > 0 ? (input.protectReason ?? "") : "";
  }
  page.set({ ...content, type: input.type, status: page.status === "claimed" ? "claimed" : input.body ? "published" : page.status });
  // Former names keep working as addresses (/org/old-name redirects here) when they are free
  for (const name of input.formerNames) {
    const old = slugify(name);
    if (!old || old === page.slug || isReservedSlug(old) || (page.oldSlugs ?? []).includes(old)) continue;
    if (!(await Page.exists({ $or: [{ slug: old }, { oldSlugs: old }] }))) page.oldSlugs = [...(page.oldSlugs ?? []), old].slice(-20);
  }
  page.revisionCount = (page.revisionCount ?? 0) + 1;
  await page.save();

  await Revision.create({
    pageId: page._id,
    authorId: user.id,
    authorName: user.name,
    editSummary: input.editSummary,
    snapshot: { title: page.title, ...content, image: page.image ?? null },
    size: input.body.length,
    delta: input.body.length - prevSize,
  });
  if (oldImage && oldImage.key !== input.image?.key) await deleteImage(oldImage);
  const keptProducts = new Set(input.products.map((x) => x.image?.key).filter(Boolean));
  for (const img of prevProductImages) if (!keptProducts.has(img.key)) await deleteImage(img);
  return toPage(page.toObject());
}

/* ───────────── Organization relations ───────────── */

export async function getOrgRelations(slug: string) {
  await connectDB();
  const [subsidiaries, acquirers] = await Promise.all([
    Page.find({ "parent.slug": slug, ...PUBLIC_FILTER }, { ...CARD_FIELDS, status: 1 }).sort({ title: 1 }).limit(100).lean(),
    Page.find({ "acquisitions.slug": slug, ...PUBLIC_FILTER }, { ...CARD_FIELDS, status: 1, acquisitions: 1 }).limit(10).lean(),
  ]);
  return {
    subsidiaries: subsidiaries.map((d) => toCard(d)),
    acquiredBy: acquirers.map((d) => {
      const a = (d.acquisitions as Acquisition[]).find((x) => x.slug === slug);
      return { ...toCard(d), detail: [a?.year, a?.amount].filter(Boolean).join(" · ") };
    }),
  };
}

/** Career spans at an organization (for the "people by year" chart). */
export async function getOrgSpans(slug: string) {
  await connectDB();
  const docs = await Page.find({ type: "person", "experiences.orgSlug": slug, ...PUBLIC_FILTER }, { experiences: 1 }).limit(2000).lean<{ experiences: Experience[] }[]>();
  return docs.flatMap((d) =>
    d.experiences.filter((e) => e.orgSlug === slug && e.verification !== "rejected").map((e) => ({ start: e.startYear ?? null, end: e.endYear ?? null, current: e.current })),
  );
}

/** Where a school's alumni work now (#47). */
export async function getAlumniEmployers(schoolSlug: string) {
  await connectDB();
  const rows = await Page.aggregate([
    { $match: { type: "person", "educations.schoolSlug": schoolSlug, ...PUBLIC_FILTER } },
    { $unwind: "$experiences" },
    { $match: { "experiences.current": true, "experiences.verification": { $ne: "rejected" } } },
    { $group: { _id: "$experiences.orgSlug", title: { $first: "$experiences.orgTitle" }, count: { $sum: 1 } } },
    { $sort: { count: -1, title: 1 } },
    { $limit: 12 },
  ]);
  return rows.map((r) => ({ slug: r._id as string, title: r.title as string, count: r.count as number }));
}

/** All open positions of organizations that manage their page (#44). */
export async function listJobs(limit = 200) {
  await connectDB();
  const rows = await Page.aggregate([
    { $match: { type: { $in: ["org", "school"] }, status: "claimed", "jobs.0": { $exists: true } } },
    { $unwind: "$jobs" },
    { $sort: { "jobs.postedAt": -1 } },
    { $limit: limit },
    { $project: { slug: 1, title: 1, image: 1, type: 1, job: "$jobs" } },
  ]);
  return rows.map((r) => ({ org: { slug: r.slug as string, title: r.title as string, image: r.image?.url ? (r.image as StoredImage) : null }, job: r.job as Job }));
}

/** GDPR / KVKK "right to be forgotten": user, profile, all revisions, follows and sessions are deleted. */
export async function deleteAccount(userId: string): Promise<void> {
  await connectDB();
  const oid = new Types.ObjectId(userId);
  const page = await Page.findOne({ type: "person", ownerId: oid });
  if (page) {
    const revs = await Revision.find({ pageId: page._id }, { "snapshot.image": 1 }).lean<{ snapshot?: { image?: StoredImage | null } }[]>();
    const keys = new Set<string>();
    if (page.image?.key) keys.add(page.image.key);
    for (const r of revs) if (r.snapshot?.image?.key) keys.add(r.snapshot.image.key);
    for (const key of keys) await deleteImage({ key, url: "" });
    await Revision.deleteMany({ pageId: page._id });
    await Follow.deleteMany({ pageId: page._id });
    await Suggestion.deleteMany({ pageId: page._id });
    await Testimonial.deleteMany({ pageId: page._id });
    await Thank.deleteMany({ pageId: page._id });
    for (const pr of (page.projects ?? []) as Project[]) if (pr.image) await deleteImage(pr.image);
    await Page.deleteOne({ _id: page._id });
  }
  // Leave organization pages this user managed; pages without admins go back to community editing
  await Page.updateMany({ orgAdmins: oid }, { $pull: { orgAdmins: oid } });
  await Page.updateMany({ type: { $in: ["org", "school"] }, status: "claimed", orgAdmins: { $size: 0 } }, { $set: { status: "published" } });
  // Undo this user's follows so counters stay correct
  const follows = await Follow.find({ userId: oid }, { pageId: 1 }).lean();
  for (const f of follows) await Page.updateOne({ _id: f.pageId, followerCount: { $gt: 0 } }, { $inc: { followerCount: -1 } });
  await Follow.deleteMany({ userId: oid });
  // Contributions to organisation pages stay, but are anonymised
  await Revision.updateMany({ authorId: oid }, { $set: { authorName: "Deleted user" } });
  // Recommendations and suggestions this person wrote for others
  await Testimonial.deleteMany({ authorId: oid });
  await Thank.deleteMany({ userId: oid });
  await Suggestion.deleteMany({ authorId: oid });
  await Session.deleteMany({ userId: oid });
  await Token.deleteMany({ userId: oid });
  await User.deleteOne({ _id: oid });
}
