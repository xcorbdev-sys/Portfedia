import "server-only";
import { connectDB } from "./db";
import { ImageTrash } from "./models";
import { deleteImage } from "./storage";
import type { StoredImage } from "./types";

const KEEP_DAYS = 90;

/** Instead of deleting a replaced image right away, keep it for 90 days (#42). */
export async function trashImage(img: StoredImage | null | undefined): Promise<void> {
  if (!img?.key) return;
  await connectDB();
  await ImageTrash.updateOne(
    { key: img.key },
    { $set: { url: img.url, deleteAfter: new Date(Date.now() + KEEP_DAYS * 86400_000) } },
    { upsert: true },
  );
}

/** Takes an image back out of the trash (used when an older revision is restored). */
export async function restoreFromTrash(key: string): Promise<boolean> {
  await connectDB();
  const res = await ImageTrash.deleteOne({ key });
  return res.deletedCount > 0;
}

export async function trashedKeys(keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  await connectDB();
  const rows = await ImageTrash.find({ key: { $in: keys } }, { key: 1 }).lean<{ key: string }[]>();
  return new Set(rows.map((r) => r.key));
}

export async function purgeImageTrash(limit = 500): Promise<number> {
  await connectDB();
  const due = await ImageTrash.find({ deleteAfter: { $lt: new Date() } }).limit(limit).lean<{ key: string; url: string }[]>();
  for (const d of due) {
    await deleteImage({ key: d.key, url: d.url });
    await ImageTrash.deleteOne({ key: d.key });
  }
  return due.length;
}
