/* eslint-disable @typescript-eslint/no-explicit-any */
// Schemas are typed as <any>: mongoose's deep schema inference makes tsc run out of memory.
// Typed shapes live in ../types.ts and are applied when documents are read.
import mongoose, { Schema, type Model } from "mongoose";
import { slugify as slugifyTag } from "../slug";

const { models, model } = mongoose;

/* ───────────── User ───────────── */
const UserSchema = new Schema<any>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerifiedAt: { type: Date, default: null },
    // Empty for accounts that only sign in with Google/LinkedIn
    passwordHash: { type: String, default: "" },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, enum: ["user", "moderator", "admin"], default: "user" },
    // Only the confirmation is stored, never the birth year itself (data minimisation)
    ageConfirmedAt: { type: Date, default: null },
    googleId: { type: String, default: null },
    linkedinId: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    // Wants a notification when a company starts raising (the /raising page)
    notifyRaises: { type: Boolean, default: false },
    // Upgraded by an admin: may create more company pages and SaaS projects
    upgradedAt: { type: Date, default: null },
    // #96: plan for people (set by admins until payments exist)
    plan: { type: new Schema<any>({ name: { type: String, enum: ["free", "pro"], default: "free" }, until: { type: Date, default: null } }, { _id: false }), default: () => ({}) },
    banReason: { type: String, default: "" },
    // The owner chose to hide the "Profile views" card on their profile
    hideViewStats: { type: Boolean, default: false },
    emailPrefs: {
      type: new Schema<any>({ profileUpdates: { type: Boolean, default: true } }, { _id: false }),
      default: () => ({}),
    },
  },
  { timestamps: true },
);
UserSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: "string" } } });
UserSchema.index({ linkedinId: 1 }, { unique: true, partialFilterExpression: { linkedinId: { $type: "string" } } });

/* ───────────── One-time tokens (email verification, password reset, email change, OAuth signup) ───────────── */
const TokenSchema = new Schema<any>({
  tokenHash: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ["verify_email", "reset_password", "change_email", "oauth_signup", "oauth_state", "claim_org", "verify_work"],
    required: true,
  },
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  data: { type: Schema.Types.Mixed, default: {} },
  expiresAt: { type: Date, required: true },
});
TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
TokenSchema.index({ userId: 1, type: 1 });

/* ───────────── Oturum ───────────── */
const SessionSchema = new Schema<any>({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true },
  // Shown on the account page (#14); the IP is stored truncated (last block removed)
  userAgent: { type: String, default: "" },
  ipPrefix: { type: String, default: "" },
  createdAt: { type: Date, default: () => new Date() },
  lastSeenAt: { type: Date, default: () => new Date() },
});
// Süresi dolan oturumları MongoDB kendisi siler
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/* ───────────── Sayfa ───────────── */
const ExperienceSchema = new Schema<any>(
  {
    orgSlug: { type: String, required: true },
    orgTitle: { type: String, required: true },
    role: { type: String, default: "" },
    startYear: { type: Number, default: null },
    endYear: { type: Number, default: null },
    current: { type: Boolean, default: false },
    description: { type: String, default: "" },
    verification: { type: String, enum: ["unverified", "verified", "rejected"], default: "unverified" },
    // How it was verified: by an organization admin, or by the person with their work email
    verifiedVia: { type: String, enum: ["org", "work_email", null], default: null },
  },
  { _id: false },
);

const EducationSchema = new Schema<any>(
  {
    schoolSlug: { type: String, required: true },
    schoolTitle: { type: String, required: true },
    degree: { type: String, default: "" },
    field: { type: String, default: "" },
    startYear: { type: Number, default: null },
    endYear: { type: Number, default: null },
  },
  { _id: false },
);

const PageSchema = new Schema<any>(
  {
    type: { type: String, enum: ["person", "org", "school"], required: true },
    slug: { type: String, required: true, unique: true },
    // Previous addresses keep working (permanent redirect) after a profile URL change
    oldSlugs: { type: [String], default: [] },
    title: { type: String, required: true, maxlength: 160 },
    titleKey: { type: String, required: true, index: true },
    summary: { type: String, default: "", maxlength: 400 },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["draft", "published", "claimed", "pending", "rejected"], default: "published" },
    // Moderation of person profiles (applications)
    review: {
      type: new Schema<any>(
        {
          submittedAt: { type: Date, default: null },
          reviewedAt: { type: Date, default: null },
          reviewerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
          reviewerName: { type: String, default: "" },
          note: { type: String, default: "", maxlength: 1000 },
          // Automatic warnings for moderators (same name / same photo as another profile, …)
          flags: { type: [String], default: [] },
          // Saved by someone who hasn't confirmed their email yet: kept, but not in the review queue until they do
          awaitingEmail: { type: Boolean, default: false },
          // Saved automatically while the owner is still filling it in: not submitted for review yet
          draft: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    image: { type: new Schema<any>({ key: String, url: String, hash: String, thumbUrl: String }, { _id: false }), default: null },
    infobox: { type: Schema.Types.Mixed, default: {} },
    body: { type: String, default: "", maxlength: 100_000 },
    experiences: { type: [ExperienceSchema], default: [] },
    educations: { type: [EducationSchema], default: [] },
    outLinks: { type: [new Schema<any>({ slug: String, title: String }, { _id: false })], default: [] },
    tags: { type: [String], default: [] },
    // Up to three entries from the fixed sector list (src/lib/sectors.ts); infobox.sector shows them as text
    sectors: { type: [String], default: [] },
    tagKeys: { type: [String], default: [] }, // URL-friendly tags for /tag/<key>, kept in sync on save
    // Organization ownership (claimed with a work email)
    orgAdmins: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [] },
    claimDomain: { type: String, default: null }, // set by moderators; overrides the website domain
    websiteChangedAt: { type: Date, default: null },
    // Page protection against vandalism (set by moderators)
    protectedUntil: { type: Date, default: null },
    protectedReason: { type: String, default: "" },
    sources: { type: [new Schema<any>({ title: String, url: String }, { _id: false })], default: [] },
    // Person: achievements and extra sections
    projects: {
      type: [new Schema<any>({ id: String, title: String, url: String, year: Number, description: String, image: { type: new Schema<any>({ key: String, url: String, hash: String, thumbUrl: String }, { _id: false }), default: null }, pageSlug: { type: String, default: "" } }, { _id: false })],
      default: [],
    },
    publications: { type: [new Schema<any>({ title: String, publisher: String, year: Number, url: String }, { _id: false })], default: [] },
    awards: { type: [new Schema<any>({ title: String, issuer: String, year: Number, url: String, kind: String }, { _id: false })], default: [] },
    talks: { type: [new Schema<any>({ title: String, event: String, year: Number, url: String }, { _id: false })], default: [] },
    patents: { type: [new Schema<any>({ title: String, number: String, year: Number, url: String }, { _id: false })], default: [] },
    volunteering: { type: [new Schema<any>({ org: String, role: String, startYear: Number, endYear: Number, description: String }, { _id: false })], default: [] },
    languageLevels: { type: [new Schema<any>({ name: String, level: String }, { _id: false })], default: [] },
    openTo: { type: [String], default: [] },
    // #89: what kind of organization page this is, with category-specific facts
    category: { type: String, enum: ["company", "investor", "event", "nonprofit", "public", "saas"], default: "company" },
    saas: { type: new Schema<any>({ pricing: String, platforms: [String] }, { _id: false }), default: null },
    raising: {
      type: new Schema<any>(
        { active: Boolean, stage: String, amount: Number, currency: String, description: { type: String, maxlength: 600 }, url: String, email: String, since: Date },
        { _id: false },
      ),
      default: null,
    },
    // Who created the page with the create form (counts toward their page limit)
    createdById: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    investor: { type: new Schema<any>({ fundSize: String, stages: [String], focus: [String] }, { _id: false }), default: null },
    event: {
      type: new Schema<any>(
        {
          start: Date,
          end: Date,
          city: String,
          format: String,
          speakers: { type: [new Schema<any>({ name: String, slug: String }, { _id: false })], default: [] },
          sponsors: { type: [new Schema<any>({ title: String, slug: String }, { _id: false })], default: [] },
        },
        { _id: false },
      ),
      default: null,
    },
    // #97: plan for organizations (set by admins until payments exist)
    plan: { type: new Schema<any>({ name: { type: String, enum: ["free", "business"], default: "free" }, until: { type: Date, default: null } }, { _id: false }), default: () => ({}) },
    brandColor: { type: String, default: "" },
    // Organization: structure, history and more
    products: {
      type: [new Schema<any>({ id: String, title: String, url: String, year: Number, description: String, image: { type: new Schema<any>({ key: String, url: String, hash: String, thumbUrl: String }, { _id: false }), default: null } }, { _id: false })],
      default: [],
    },
    offices: { type: [new Schema<any>({ city: String, country: String, address: String, kind: String }, { _id: false })], default: [] },
    parent: { type: new Schema<any>({ title: String, slug: String }, { _id: false }), default: null },
    acquisitions: { type: [new Schema<any>({ title: String, slug: String, year: Number, amount: String }, { _id: false })], default: [] },
    leadership: { type: [new Schema<any>({ name: String, slug: String, role: String, kind: String }, { _id: false })], default: [] },
    formerNames: { type: [String], default: [] },
    milestones: { type: [new Schema<any>({ year: Number, text: String }, { _id: false })], default: [] },
    press: { type: [new Schema<any>({ title: String, outlet: String, year: Number, url: String }, { _id: false })], default: [] },
    jobs: {
      type: [
        new Schema<any>(
          {
            id: String, title: String, location: String, type: String, url: String, postedAt: Date, featured: Boolean,
            workplace: String, level: String, salaryMin: Number, salaryMax: Number, currency: String, salaryPeriod: String,
            description: { type: String, maxlength: 5000 }, applyEmail: String,
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    ticker: { type: new Schema<any>({ exchange: String, symbol: String }, { _id: false }), default: null },
    // Organizations: funding rounds; investors are linked to their pages by slug
    fundingRounds: {
      type: [
        new Schema<any>(
          {
            round: { type: String, default: "" },
            year: { type: Number, default: null },
            amount: { type: String, default: "" },
            investors: { type: [new Schema<any>({ title: String, slug: String }, { _id: false })], default: [] },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    verified: { type: Boolean, default: false }, // kimlik/kuruluş doğrulandı (yönetici işaretler)
    followerCount: { type: Number, default: 0 },
    thanksCount: { type: Number, default: 0 },
    noindex: { type: Boolean, default: false },
    // #75: "members" profiles are only visible to signed-in members (and never in lists or search engines)
    visibility: { type: String, enum: ["public", "members"], default: "public" },
    // #66: wide banner image
    cover: { type: new Schema<any>({ key: String, url: String, hash: String, thumbUrl: String }, { _id: false }), default: null },
    revisionCount: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false },
);
// Bir kullanıcının en fazla bir kişi sayfası olur
PageSchema.index(
  { ownerId: 1 },
  { unique: true, partialFilterExpression: { type: "person", ownerId: { $type: "objectId" } } },
);
PageSchema.index({ "experiences.orgSlug": 1 }); // "Burada çalışanlar"
PageSchema.index({ "educations.schoolSlug": 1 }); // "Mezunlar"
PageSchema.index({ oldSlugs: 1 });
PageSchema.index({ orgAdmins: 1 });
PageSchema.index({ "image.hash": 1 }, { sparse: true });
PageSchema.index({ "fundingRounds.investors.slug": 1 });
PageSchema.index({ "parent.slug": 1 }); // subsidiaries
PageSchema.index({ "acquisitions.slug": 1 }); // "acquired by"
PageSchema.index({ "jobs.postedAt": -1 }); // /jobs
PageSchema.index({ category: 1, "event.start": -1 }); // /events, /investors // "Investments" of an investor
PageSchema.index({ "outLinks.slug": 1 }); // "Bu sayfaya bağlantılar"
PageSchema.index({ type: 1, createdAt: -1 });
PageSchema.index({ tags: 1 });
PageSchema.index({ tagKeys: 1 });
PageSchema.pre("save", function syncTagKeys(this: any) {
  this.tagKeys = [...new Set(((this.tags ?? []) as string[]).map(slugifyTag).filter(Boolean))];
});
PageSchema.index({ type: 1, status: 1, "review.submittedAt": 1 }); // review queue
PageSchema.index({ "infobox.sector": 1 });
PageSchema.index({ sectors: 1 });

/* ───────────── Revizyon (yalnızca eklenir, değişmez) ───────────── */
const RevisionSchema = new Schema<any>(
  {
    pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    editSummary: { type: String, default: "", maxlength: 300 },
    // Full content at this revision. Older revisions are compressed into snapshotZ by the maintenance job.
    snapshot: { type: Schema.Types.Mixed, default: undefined },
    snapshotZ: { type: Buffer, default: undefined },
    size: { type: Number, default: 0 },
    delta: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
RevisionSchema.index({ pageId: 1, createdAt: -1 });

/* ───────────── Takip ───────────── */
const FollowSchema = new Schema<any>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
FollowSchema.index({ userId: 1, pageId: 1 }, { unique: true });
FollowSchema.index({ pageId: 1, createdAt: -1 }); // followers of a page, newest first
FollowSchema.index({ pageId: 1 });

// Reuse compiled models across Next.js hot reloads
/* ───────────── Reports (abuse, copyright, impersonation…) ───────────── */
const ReportSchema = new Schema<any>(
  {
    pageId: { type: Schema.Types.ObjectId, ref: "Page", default: null },
    pageSlug: { type: String, default: "" },
    pageTitle: { type: String, default: "" },
    reason: { type: String, enum: ["copyright", "impersonation", "false_info", "harassment", "spam", "privacy", "other", "appeal"], required: true },
    priority: { type: Number, default: 1 },
    details: { type: String, default: "", maxlength: 5000 },
    reporterId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reporterName: { type: String, default: "" },
    reporterEmail: { type: String, default: "" },
    status: { type: String, enum: ["open", "resolved", "dismissed"], default: "open" },
    resolution: { type: String, default: "" },
    resolvedBy: { type: String, default: "" },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ status: 1, priority: -1, createdAt: 1 });

/* ───────────── In-app notifications (bell) ───────────── */
const NotificationSchema = new Schema<any>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    text: { type: String, required: true, maxlength: 300 },
    href: { type: String, default: "/" },
    pageId: { type: Schema.Types.ObjectId, ref: "Page", default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 86400 }); // kept for 6 months

/* ───────────── Curated collections ───────────── */
const CollectionSchema = new Schema<any>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 600 },
    items: { type: [String], default: [] }, // page slugs, in order
    // #100: clearly labelled sponsorship
    sponsor: { type: new Schema<any>({ name: String, url: String }, { _id: false }), default: null },
    published: { type: Boolean, default: true },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true },
);

/* ───────────── Suggested edits & recommendations (for person profiles) ───────────── */
const SuggestionSchema = new Schema<any>(
  {
    pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    message: { type: String, required: true, maxlength: 2000 },
    proposedBody: { type: String, default: null, maxlength: 100_000 },
    baseBody: { type: String, default: "" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: true },
);
SuggestionSchema.index({ pageId: 1, status: 1, createdAt: -1 });

const TestimonialSchema = new Schema<any>(
  {
    pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    relationship: { type: String, default: "", maxlength: 120 },
    text: { type: String, required: true, maxlength: 1500 },
    status: { type: String, enum: ["pending", "published", "hidden"], default: "pending" },
  },
  { timestamps: true },
);
TestimonialSchema.index({ pageId: 1, status: 1, createdAt: -1 });
TestimonialSchema.index({ pageId: 1, authorId: 1 }, { unique: true });

/* ───────────── "Thanks" (a light, spam-free appreciation) ───────────── */
const ThankSchema = new Schema<any>(
  {
    pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
ThankSchema.index({ pageId: 1, userId: 1 }, { unique: true });

/* ───────────── Background work: outbox jobs, key/value meta & locks, image trash ───────────── */
const JobSchema = new Schema<any>(
  {
    type: { type: String, required: true }, // "email" | "notify_followers"
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["queued", "processing", "failed"], default: "queued" },
    attempts: { type: Number, default: 0 },
    runAt: { type: Date, default: () => new Date() },
    lockedUntil: { type: Date, default: null },
    lastError: { type: String, default: "" },
  },
  { timestamps: true },
);
JobSchema.index({ status: 1, runAt: 1 });

const MetaSchema = new Schema<any>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, default: null },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

/** Replaced images are kept for 90 days so older revisions can still be restored with them. */
const ImageTrashSchema = new Schema<any>({
  key: { type: String, required: true, unique: true },
  url: { type: String, default: "" },
  deleteAfter: { type: Date, required: true },
});
ImageTrashSchema.index({ deleteAfter: 1 });

/* ───────────── Rate limiting counters (shared by all containers, #13) ───────────── */
const RateCounterSchema = new Schema<any>({
  _id: { type: String },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
RateCounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/* ───────────── Sign-in log (Turkish Law No. 5651: traffic data kept for one year) ───────────── */
const LoginLogSchema = new Schema<any>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  ip: { type: String, default: "" },
  userAgent: { type: String, default: "", maxlength: 300 },
  method: { type: String, default: "password" },
  at: { type: Date, default: () => new Date() },
});
LoginLogSchema.index({ at: 1 }, { expireAfterSeconds: 365 * 86400 });

/* ───────────── Page views per day (#96/#97 statistics) ───────────── */
const PageViewSchema = new Schema<any>({
  pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true },
  day: { type: String, required: true }, // YYYY-MM-DD
  count: { type: Number, default: 0 },
});
PageViewSchema.index({ pageId: 1, day: 1 }, { unique: true });

function getModel(name: string, schema: Schema<any>): Model<any> {
  return ((models[name] as Model<any> | undefined) ?? model(name, schema)) as Model<any>;
}

export const User = getModel("User", UserSchema);
export const Session = getModel("Session", SessionSchema);
export const Page = getModel("Page", PageSchema);
export const Revision = getModel("Revision", RevisionSchema);
export const Follow = getModel("Follow", FollowSchema);
export const Token = getModel("Token", TokenSchema);
export const Report = getModel("Report", ReportSchema);
export const Notification = getModel("Notification", NotificationSchema);
export const Collection = getModel("Collection", CollectionSchema);
export const Suggestion = getModel("Suggestion", SuggestionSchema);
export const Testimonial = getModel("Testimonial", TestimonialSchema);
export const Thank = getModel("Thank", ThankSchema);
export const Job = getModel("Job", JobSchema);
export const Meta = getModel("Meta", MetaSchema);
export const ImageTrash = getModel("ImageTrash", ImageTrashSchema);
export const RateCounter = getModel("RateCounter", RateCounterSchema);
export const LoginLog = getModel("LoginLog", LoginLogSchema);

/* ───────────── Jobs: saved listings and alerts ───────────── */
const SavedJobSchema = new Schema<any>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true },
    jobId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
SavedJobSchema.index({ userId: 1, pageId: 1, jobId: 1 }, { unique: true });
export const SavedJob = getModel("SavedJob", SavedJobSchema);

/** "Email me new jobs like these": the filters of a jobs search, checked once a day */
const JobAlertSchema = new Schema<any>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    q: { type: String, default: "" },
    type: { type: String, default: "" },
    workplace: { type: String, default: "" },
    level: { type: String, default: "" },
    location: { type: String, default: "" },
    sector: { type: String, default: "" },
    lastSentAt: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
export const JobAlert = getModel("JobAlert", JobAlertSchema);
export const PageView = getModel("PageView", PageViewSchema);
