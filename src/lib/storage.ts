import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { StoredImage } from "./types";
import { sniffImage } from "./storage-sniff";

export { sniffImage };

/**
 * File storage: Cloudflare R2 (S3 compatible).
 * Without R2 env vars (local development) files are written to ./uploads
 * and served from /media/...
 */

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const LOCAL_DIR = path.join(process.cwd(), "uploads");

const r2Configured = () =>
  Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_URL,
  );

let client: S3Client | null = null;
function r2(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

export class UploadError extends Error {}

export async function saveImage(file: File): Promise<StoredImage> {
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("Images must be 2 MB or smaller.");
  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind) throw new UploadError("Only JPEG, PNG or WebP images are allowed.");
  const key = `images/${new Date().getFullYear()}/${randomBytes(12).toString("hex")}.${kind.ext}`;

  if (r2Configured()) {
    await r2().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: buf,
        ContentType: kind.mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { key, url: `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}` };
  }

  const target = path.join(LOCAL_DIR, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buf);
  return { key, url: `/media/${key}` };
}

export async function deleteImage(img: StoredImage | null | undefined): Promise<void> {
  if (!img?.key) return;
  try {
    if (r2Configured()) {
      await r2().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: img.key }));
    } else {
      await unlink(localPath(img.key)!);
    }
  } catch {
    // Failing to delete an old image is not critical
  }
}

/** Safe local path (prevents path traversal). */
export function localPath(key: string): string | null {
  if (!/^images\/\d{4}\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(key)) return null;
  return path.join(LOCAL_DIR, key);
}

export async function readLocal(key: string): Promise<{ data: Buffer; mime: string } | null> {
  const p = localPath(key);
  if (!p) return null;
  try {
    const data = await readFile(p);
    const kind = sniffImage(data);
    return kind ? { data, mime: kind.mime } : null;
  } catch {
    return null;
  }
}
