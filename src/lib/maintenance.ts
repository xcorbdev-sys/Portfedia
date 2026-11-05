import "server-only";
import { connectDB } from "./db";
import { Meta, Page, Report, Revision, User } from "./models";
import { deleteAccount } from "./pages";
import { compressSnapshot } from "./snapshots";
import { purgeImageTrash } from "./image-trash";
import { slugify } from "./slug";

const DAY = 86400_000;

/** Runs fn only if no other process holds the lock (several containers can run the worker safely). */
export async function withLock<T>(name: string, ttlMs: number, fn: () => Promise<T>): Promise<T | null> {
  await connectDB();
  const now = new Date();
  try {
    const got = await Meta.findOneAndUpdate(
      { key: `lock:${name}`, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
      { $set: { lockedUntil: new Date(now.getTime() + ttlMs) } },
      { upsert: true, returnDocument: "after" },
    );
    if (!got) return null;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return null; // someone else holds it
    throw err;
  }
  try {
    return await fn();
  } finally {
    await Meta.updateOne({ key: `lock:${name}` }, { $set: { lockedUntil: null } });
  }
}

export async function getMeta<T>(key: string): Promise<T | null> {
  await connectDB();
  const m = await Meta.findOne({ key }).lean<{ value: T }>();
  return m?.value ?? null;
}

export async function setMeta(key: string, value: unknown) {
  await connectDB();
  await Meta.updateOne({ key }, { $set: { value } }, { upsert: true });
}

/* ───────────── Migrations (#45) ───────────── */

interface Migration {
  id: string;
  run: () => Promise<void>;
}

const MIGRATIONS: Migration[] = [
  {
    id: "2026-11-backfill-tag-keys",
    run: async () => {
      const pages = await Page.find({ tags: { $exists: true, $ne: [] }, tagKeys: { $size: 0 } }, { tags: 1 }).lean<{ _id: unknown; tags: string[] }[]>();
      for (const p of pages) await Page.updateOne({ _id: p._id }, { $set: { tagKeys: [...new Set(p.tags.map(slugify).filter(Boolean))] } });
    },
  },
  {
    id: "2026-11-review-defaults",
    run: async () => {
      await Page.updateMany({ review: { $exists: false } }, { $set: { review: { flags: [] } } });
    },
  },
  {
    // Free-text sectors ("AI Platforms, Banking, Marketing") become entries of the fixed list
    id: "2026-11-sectors-from-text",
    run: async () => {
      const { sectorsFromText } = await import("./sectors");
      const pages = await Page.find({ "infobox.sector": { $nin: [null, ""] }, $or: [{ sectors: { $exists: false } }, { sectors: { $size: 0 } }] }, { "infobox.sector": 1, category: 1 }).lean<
        { _id: unknown; infobox?: { sector?: string }; category?: string }[]
      >();
      for (const p of pages) {
        const found = sectorsFromText(p.infobox?.sector ?? "", p.category === "saas");
        // Parts that don't match the list are dropped, so filters only show list entries; the owner can pick again
        await Page.updateOne({ _id: p._id }, { $set: { sectors: found, "infobox.sector": found.join(", ") } });
      }
    },
  },
];

export async function runMigrations(): Promise<string[]> {
  const applied = new Set((await getMeta<string[]>("migrations")) ?? []);
  const ran: string[] = [];
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    await m.run();
    applied.add(m.id);
    ran.push(m.id);
    await setMeta("migrations", [...applied]);
  }
  return ran;
}

/* ───────────── Retention & clean-up (#9, #10, #41, #42) ───────────── */

/** Reports are kept for 3 years (as stated in the privacy policy). */
async function deleteOldReports() {
  const res = await Report.deleteMany({ createdAt: { $lt: new Date(Date.now() - 3 * 365 * DAY) } });
  return res.deletedCount;
}

/** Accounts that never confirmed their email and have no profile are removed after 30 days. */
async function deleteStaleUnverifiedAccounts() {
  const stale = await User.find({ emailVerifiedAt: null, bannedAt: null, createdAt: { $lt: new Date(Date.now() - 30 * DAY) } }, { _id: 1 })
    .limit(200)
    .lean<{ _id: unknown }[]>();
  let n = 0;
  for (const u of stale) {
    if (await Page.exists({ type: "person", ownerId: u._id })) continue;
    await deleteAccount(String(u._id));
    n++;
  }
  return n;
}

/** Revisions older than 30 days are compressed (they are rarely read). */
async function compressOldRevisions(limit = 500) {
  const old = await Revision.find({ snapshot: { $exists: true }, createdAt: { $lt: new Date(Date.now() - 30 * DAY) } }, { snapshot: 1 })
    .limit(limit)
    .lean<{ _id: unknown; snapshot: unknown }[]>();
  for (const r of old) await Revision.updateOne({ _id: r._id }, { $set: { snapshotZ: compressSnapshot(r.snapshot) }, $unset: { snapshot: 1 } });
  return old.length;
}

export async function runMaintenance() {
  return withLock("maintenance", 15 * 60_000, async () => {
    const started = Date.now();
    const summary = {
      migrations: await runMigrations(),
      oldReports: await deleteOldReports(),
      unverifiedAccounts: await deleteStaleUnverifiedAccounts(),
      compressedRevisions: await compressOldRevisions(),
      purgedImages: await purgeImageTrash(),
      jobAlertEmails: (await (await import("./features")).featureOn("jobs")) ? await (await import("./job-tools")).sendJobAlerts() : 0,
      ms: 0,
      at: new Date().toISOString(),
    };
    summary.ms = Date.now() - started;
    await setMeta("maintenance:last", summary);
    console.info(JSON.stringify({ level: "info", message: "maintenance", ...summary }));
    return summary;
  });
}
