/* eslint-disable @typescript-eslint/no-explicit-any */
// Schemas are typed as <any>: mongoose's deep schema inference makes tsc run out of memory.
// Typed shapes live in ../types.ts and are applied when documents are read.
import mongoose, { Schema, type Model } from "mongoose";

const { models, model } = mongoose;

/* ───────────── Kullanıcı ───────────── */
const UserSchema = new Schema<any>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, enum: ["user", "moderator", "admin"], default: "user" },
  },
  { timestamps: true },
);

/* ───────────── Oturum ───────────── */
const SessionSchema = new Schema<any>({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  expiresAt: { type: Date, required: true },
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
        },
        { _id: false },
      ),
      default: () => ({}),
    },
    image: { type: new Schema<any>({ key: String, url: String }, { _id: false }), default: null },
    infobox: { type: Schema.Types.Mixed, default: {} },
    body: { type: String, default: "", maxlength: 100_000 },
    experiences: { type: [ExperienceSchema], default: [] },
    educations: { type: [EducationSchema], default: [] },
    outLinks: { type: [new Schema<any>({ slug: String, title: String }, { _id: false })], default: [] },
    tags: { type: [String], default: [] },
    sources: { type: [new Schema<any>({ title: String, url: String }, { _id: false })], default: [] },
    verified: { type: Boolean, default: false }, // kimlik/kuruluş doğrulandı (yönetici işaretler)
    followerCount: { type: Number, default: 0 },
    noindex: { type: Boolean, default: false },
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
PageSchema.index({ "outLinks.slug": 1 }); // "Bu sayfaya bağlantılar"
PageSchema.index({ type: 1, createdAt: -1 });
PageSchema.index({ tags: 1 });
PageSchema.index({ type: 1, status: 1, "review.submittedAt": 1 }); // review queue
PageSchema.index({ "infobox.sector": 1 });

/* ───────────── Revizyon (yalnızca eklenir, değişmez) ───────────── */
const RevisionSchema = new Schema<any>(
  {
    pageId: { type: Schema.Types.ObjectId, ref: "Page", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    editSummary: { type: String, default: "", maxlength: 300 },
    snapshot: { type: Schema.Types.Mixed, required: true },
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
FollowSchema.index({ pageId: 1 });

// Reuse compiled models across Next.js hot reloads
function getModel(name: string, schema: Schema<any>): Model<any> {
  return ((models[name] as Model<any> | undefined) ?? model(name, schema)) as Model<any>;
}

export const User = getModel("User", UserSchema);
export const Session = getModel("Session", SessionSchema);
export const Page = getModel("Page", PageSchema);
export const Revision = getModel("Revision", RevisionSchema);
export const Follow = getModel("Follow", FollowSchema);
