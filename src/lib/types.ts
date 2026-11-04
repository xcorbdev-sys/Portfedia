export type PageType = "person" | "org" | "school";
/**
 * person: pending (application under review) → published | rejected
 * org/school: draft (auto-created) → published → claimed (managed by the organization)
 */
export type PageStatus = "draft" | "published" | "claimed" | "pending" | "rejected";

export interface ReviewInfo {
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewerName: string;
  note: string;
}
export type Verification = "unverified" | "verified" | "rejected";

export interface StoredImage {
  key: string;
  url: string;
}

export interface Experience {
  orgSlug: string;
  orgTitle: string;
  role: string;
  startYear?: number | null;
  endYear?: number | null; // null + current=true => "günümüz"
  current: boolean;
  description?: string;
  verification: Verification;
}

export interface Education {
  schoolSlug: string;
  schoolTitle: string;
  degree?: string;
  field?: string;
  startYear?: number | null;
  endYear?: number | null;
}

export interface SourceRef {
  title: string;
  url: string;
}

export interface PersonInfobox {
  occupation?: string;
  nationality?: string;
  sector?: string;
  birthYear?: number | null;
  birthPlace?: string;
  location?: string;
  languages?: string;
  skills?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  email?: string;
  emailPublic?: boolean;
  birthYearPublic?: boolean;
}

export interface OrgInfobox {
  kind?: string;
  founded?: number | null;
  founders?: string;
  headquarters?: string;
  sector?: string;
  employees?: string;
  website?: string;
}

export interface OutLink {
  slug: string;
  title: string;
}

export interface PageDoc {
  _id: string;
  type: PageType;
  slug: string;
  title: string;
  titleKey: string;
  summary: string;
  ownerId: string | null;
  status: PageStatus;
  image: StoredImage | null;
  infobox: PersonInfobox & OrgInfobox;
  body: string;
  experiences: Experience[];
  educations: Education[];
  outLinks: OutLink[];
  tags: string[];
  sources: SourceRef[];
  verified: boolean;
  review: ReviewInfo;
  followerCount: number;
  noindex: boolean;
  revisionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevisionDoc {
  _id: string;
  pageId: string;
  authorId: string;
  authorName: string;
  editSummary: string;
  size: number;
  delta: number;
  createdAt: Date;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "moderator" | "admin";
}
