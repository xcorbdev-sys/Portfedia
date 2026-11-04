import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { scanBuffer } from "./clamav";
import type { StoredImage } from "./types";
import { sniffImage } from "./storage-sniff";

export { sniffImage };

/**
 * File storage: Cloudflare R2 (S3 compatible).
 * Without R2 env vars (local development) files are written to ./uploads
 * and served from /media/...
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 400;
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

export const thumbKeyOf = (key: string) => key.replace(/(\.[a-z]+)$/, "_t$1");

/**
 * Validates, resizes and re-encodes an upload: 400×400 WebP (photos are cropped to a square,
 * logos fit inside). Re-encoding also strips metadata such as GPS coordinates from phone photos.
 */
export async function saveImage(file: File, kind: "photo" | "logo" | "cover" = "photo"): Promise<StoredImage> {
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("Images must be 5 MB or smaller.");
  const input = new Uint8Array(await file.arrayBuffer());
  if (!sniffImage(input)) throw new UploadError("Only JPEG, PNG or WebP images are allowed.");
  const scan = await scanBuffer(input);
  if (scan.status === "infected") {
    console.warn(JSON.stringify({ level: "warn", message: "upload blocked by virus scanner", signature: scan.signature }));
    throw new UploadError("This file was flagged by our virus scanner and can't be uploaded.");
  }
  if (scan.status === "skipped" && process.env.CLAMAV_HOST) console.warn(JSON.stringify({ level: "warn", message: "virus scan skipped", reason: scan.reason }));
  let buf: Uint8Array;
  try {
    buf = await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate() // respect EXIF orientation before it is stripped
      .resize(
        kind === "cover" ? 1500 : OUTPUT_SIZE,
        kind === "cover" ? 500 : OUTPUT_SIZE,
        kind === "logo" ? { fit: "inside", withoutEnlargement: true } : { fit: "cover", position: "attention" },
      )
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new UploadError("This image could not be read. Please try another file.");
  }
  const kindInfo = { mime: "image/webp", ext: "webp" };
  const hash = createHash("sha256").update(buf).digest("hex");
  const key = `images/${new Date().getFullYear()}/${randomBytes(12).toString("hex")}.${kindInfo.ext}`;
  // Small variant for avatars and lists, so pages don't download the 400px original everywhere
  const thumb = await sharp(buf).resize(96, 96, kind === "logo" ? { fit: "inside" } : { fit: "cover" }).webp({ quality: 78 }).toBuffer();
  const thumbKey = thumbKeyOf(key);

  if (r2Configured()) {
    for (const [k, body] of [[key, buf], [thumbKey, thumb]] as const) {
      await r2().send(
        new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: k, Body: body, ContentType: kindInfo.mime, CacheControl: "public, max-age=31536000, immutable" }),
      );
    }
    const base = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
    return { key, url: `${base}/${key}`, hash, thumbUrl: `${base}/${thumbKey}` };
  }

  const target = path.join(LOCAL_DIR, key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buf);
  await writeFile(path.join(LOCAL_DIR, thumbKey), thumb);
  return { key, url: `/media/${key}`, hash, thumbUrl: `/media/${thumbKey}` };
}

export async function deleteImage(img: StoredImage | null | undefined): Promise<void> {
  if (!img?.key) return;
  for (const k of [img.key, thumbKeyOf(img.key)]) {
    try {
      if (r2Configured()) await r2().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: k }));
      else await unlink(localPath(k)!);
    } catch {
      // Failing to delete an old image (or a missing thumbnail) is not critical
    }
  }
}

/** Safe local path (prevents path traversal). */
export function localPath(key: string): string | null {
  if (!/^images\/\d{4}\/[a-f0-9]{24}(_t)?\.(jpg|png|webp)$/.test(key)) return null;
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
