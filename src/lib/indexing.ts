import "server-only";
import { randomBytes } from "node:crypto";
import { siteUrl } from "./site";

/**
 * Tells search engines about new or changed pages right away (IndexNow: Bing, Yandex, Seznam, Naver and
 * others share the pings). Google doesn't take IndexNow; it learns about pages from the sitemap and links,
 * and the owner can speed it up in Google Search Console. Free, no account needed.
 */
export async function indexNowKey(): Promise<string> {
  const fromEnv = (process.env.INDEXNOW_KEY ?? "").trim();
  if (/^[a-zA-Z0-9-]{8,128}$/.test(fromEnv)) return fromEnv;
  const { getMeta, setMeta } = await import("./maintenance");
  let key = await getMeta<string>("indexnow:key");
  if (!key) {
    key = randomBytes(16).toString("hex");
    await setMeta("indexnow:key", key);
  }
  return key;
}

/** Only real public sites can be pinged (not localhost or a plain IP / sslip.io test address). */
function pingable(base: string): boolean {
  try {
    const u = new URL(base);
    return u.protocol === "https:" && !/^(localhost|127\.|\d+\.\d+\.\d+\.\d+$)/.test(u.hostname) && !u.hostname.endsWith("sslip.io");
  } catch {
    return false;
  }
}

/** Queues a ping for these paths (e.g. "/hakan-yetis"); delivered by the background worker with retries. */
export async function announce(paths: string[]): Promise<void> {
  const base = siteUrl();
  if (!pingable(base) || process.env.INDEXNOW === "off" || !paths.length) return;
  const { enqueue } = await import("./outbox");
  await enqueue("indexnow", { urls: [...new Set(paths)].slice(0, 100).map((p) => `${base}${p}`) });
}

export async function deliverIndexNow(payload: { urls?: string[] }): Promise<void> {
  const urls = payload.urls ?? [];
  if (!urls.length) return;
  const base = siteUrl();
  const key = await indexNowKey();
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(base).host, key, keyLocation: `${base}/indexnow-key.txt`, urlList: urls }),
    signal: AbortSignal.timeout(10_000),
  });
  // 200/202 = accepted; 422 = URLs don't belong to the host (nothing to retry)
  if (!res.ok && res.status !== 202 && res.status !== 422) throw new Error(`IndexNow answered ${res.status}`);
}
