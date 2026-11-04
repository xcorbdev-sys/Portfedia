"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "../auth";
import { canView, isPublic } from "../visibility";
import { guardContent } from "../guard";
import { externalLinks } from "../content-rules";
import { getPersonPageOf } from "../pages";
import { notify, notifyFollowers } from "../notifications";
import { getPageBySlug, PermissionError, savePersonPage, saveOrgPage, toggleFollow, type PersonInput } from "../pages";
import { saveImage, UploadError } from "../storage";
import { bool, email, handle, httpUrl, str, year } from "../validate";
import { slugify } from "../slug";
import { pageHref } from "../wikitext";
import type { FormState } from "./auth";
import type { FundingRound, SourceRef, StoredImage } from "../types";

const MAX_BODY = 100_000;
const VERIFY_FIRST = "Please confirm your email address first. We sent you a link when you signed up; you can request a new one from the banner at the top of the page.";

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

function parseSources(v: FormDataEntryValue | null): SourceRef[] {
  return parseJsonArray(v, 30)
    .map((s) => ({ title: str(s.title, 200), url: httpUrl(s.url) }))
    .filter((s) => s.url)
    .map((s) => ({ ...s, title: s.title || s.url }));
}

export async function savePersonAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/edit");
  if (!user.emailVerified) return { error: VERIFY_FIRST };

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
  try {
    image = await imageFrom(fd, "photo");
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message };
    throw err;
  }

  const page = await savePersonPage(user, {
    title,
    summary,
    tags,
    infobox: {
      occupation,
      sector: str(fd.get("sector"), 80),
      nationality: str(fd.get("nationality"), 80),
      birthYear: year(fd.get("birthYear")),
      birthYearPublic: bool(fd.get("birthYearPublic")),
      birthPlace: str(fd.get("birthPlace"), 120),
      location: str(fd.get("location"), 120),
      languages: str(fd.get("languages"), 200),
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
    noindex: bool(fd.get("noindex")),
    editSummary: str(fd.get("editSummary"), 300),
    image,
  });

  if (isPublic(page)) {
    await notifyFollowers(page._id, user.id, { type: "page_update", text: `${page.title} updated their profile.`, href: `/${page.slug}` });
  }
  revalidatePath(`/${page.slug}`);
  for (const e of page.experiences) revalidatePath(`/org/${e.orgSlug}`);
  for (const e of page.educations) revalidatePath(`/org/${e.schoolSlug}`);
  redirect(`/${page.slug}`);
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

  let image: StoredImage | null | undefined;
  try {
    image = await imageFrom(fd, "logo");
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
      infobox: {
        kind: str(fd.get("kind"), 60),
        founded: year(fd.get("founded")),
        founders: str(fd.get("founders"), 300),
        headquarters: str(fd.get("headquarters"), 120),
        sector: str(fd.get("sector"), 80),
        employees: str(fd.get("employees"), 40),
        website: httpUrl(fd.get("website")),
      },
      body: orgBody,
      sources: orgSources,
      fundingRounds: parseFunding(fd.get("fundingRounds")),
      editSummary: str(fd.get("editSummary"), 300),
      image,
      protectDays: fd.has("protectDays") ? Math.max(0, Math.min(365, Number(fd.get("protectDays")) || 0)) : undefined,
      protectReason: str(fd.get("protectReason"), 200),
      claimDomain: fd.has("claimDomain") ? str(fd.get("claimDomain"), 120).toLowerCase().replace(/^@/, "").replace(/^www\./, "") : undefined,
    });
    pageSlug = page.slug;
    await notifyFollowers(page._id, user.id, { type: "page_update", text: `The ${page.title} page was updated.`, href: `/org/${page.slug}` });
  } catch (err) {
    if (err instanceof PermissionError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/org/${pageSlug}`);
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
