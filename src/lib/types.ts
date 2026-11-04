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
  flags: string[];
  /** Saved before the owner confirmed their email; goes to review once they do */
  awaitingEmail: boolean;
  /** Saved automatically, not submitted yet */
  draft: boolean;
}
export type Verification = "unverified" | "verified" | "rejected";

export interface StoredImage {
  key: string;
  url: string;
  /** SHA-256 of the processed image, used to spot the same photo on several profiles */
  hash?: string;
  /** 96×96 variant for avatars, cards and lists (#48) */
  thumbUrl?: string;
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
  verifiedVia?: "org" | "work_email" | null;
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

export interface FundingRound {
  round: string;
  year: number | null;
  amount: string;
  investors: { title: string; slug: string }[];
}

export interface Project {
  id: string;
  title: string;
  url: string;
  year: number | null;
  description: string;
  image: StoredImage | null;
}
export interface Publication { title: string; publisher: string; year: number | null; url: string }
export interface Award { title: string; issuer: string; year: number | null; url: string; kind: "award" | "certification" }
export interface Talk { title: string; event: string; year: number | null; url: string }
export interface Patent { title: string; number: string; year: number | null; url: string }
export interface Volunteering { org: string; role: string; startYear: number | null; endYear: number | null; description: string }
export interface LanguageLevel { name: string; level: string }

export const OPEN_TO = {
  work: "New roles",
  freelance: "Freelance work",
  investment: "Investment",
  advising: "Advising",
  speaking: "Speaking",
  mentoring: "Mentoring",
} as const;
export type OpenTo = keyof typeof OPEN_TO;

export interface Office { city: string; country: string; address: string; kind: string }
export interface LinkedName { title: string; slug: string }
export interface Acquisition { title: string; slug: string; year: number | null; amount: string }
export interface Leader { name: string; slug: string; role: string; kind: "board" | "executive" }
export interface Milestone { year: number | null; text: string }
export interface PressItem { title: string; outlet: string; year: number | null; url: string }
export interface Job { id: string; title: string; location: string; type: string; url: string; postedAt: Date | null; featured?: boolean }
export interface Ticker { exchange: string; symbol: string }

export const ORG_CATEGORIES = {
  company: "Company",
  investor: "Investor / fund",
  event: "Event",
  nonprofit: "Non-profit",
  public: "Public institution",
  saas: "SaaS product",
} as const;
export type OrgCategory = keyof typeof ORG_CATEGORIES;
export interface InvestorInfo { fundSize: string; stages: string[]; focus: string[] }
export const SAAS_PRICING = { free: "Free", freemium: "Freemium", paid: "Paid", "open-source": "Open source" } as const;
export interface SaasInfo { pricing: keyof typeof SAAS_PRICING | ""; platforms: string[] }
export interface EventInfo {
  start: Date | null;
  end: Date | null;
  city: string;
  format: string;
  speakers: { name: string; slug: string }[];
  sponsors: { title: string; slug: string }[];
}
export interface Plan { name: "free" | "pro" | "business"; until: Date | null }

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
  orgAdmins: string[];
  claimDomain: string | null;
  websiteChangedAt: Date | null;
  protectedUntil: Date | null;
  protectedReason: string;
  sources: SourceRef[];
  fundingRounds: FundingRound[];
  projects: Project[];
  publications: Publication[];
  awards: Award[];
  talks: Talk[];
  patents: Patent[];
  volunteering: Volunteering[];
  languageLevels: LanguageLevel[];
  openTo: OpenTo[];
  products: Project[];
  offices: Office[];
  parent: LinkedName | null;
  acquisitions: Acquisition[];
  leadership: Leader[];
  formerNames: string[];
  milestones: Milestone[];
  press: PressItem[];
  jobs: Job[];
  ticker: Ticker | null;
  category: OrgCategory;
  investor: InvestorInfo | null;
  event: EventInfo | null;
  saas: SaasInfo | null;
  /** Who created the page with the create form (pages made automatically have none) */
  createdById: string | null;
  plan: Plan;
  brandColor: string;
  verified: boolean;
  review: ReviewInfo;
  followerCount: number;
  thanksCount: number;
  noindex: boolean;
  visibility: "public" | "members";
  cover: StoredImage | null;
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
  emailVerified: boolean;
  hasPassword: boolean;
  emailPrefs: { profileUpdates: boolean };
}
