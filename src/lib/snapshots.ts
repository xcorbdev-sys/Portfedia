import { brotliCompressSync, brotliDecompressSync, constants } from "node:zlib";

/** Revision snapshots older than 30 days are stored brotli-compressed (#41). */
export function compressSnapshot(snapshot: unknown): Buffer {
  return brotliCompressSync(Buffer.from(JSON.stringify(snapshot)), { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function readSnapshot(doc: { snapshot?: any; snapshotZ?: any }): Record<string, any> {
  if (doc.snapshot) return doc.snapshot;
  if (doc.snapshotZ) {
    const buf = Buffer.isBuffer(doc.snapshotZ) ? doc.snapshotZ : Buffer.from(doc.snapshotZ.buffer ?? doc.snapshotZ);
    return JSON.parse(brotliDecompressSync(buf).toString("utf8"));
  }
  return {};
}
