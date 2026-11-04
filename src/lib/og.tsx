import "server-only";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { readLocal } from "./storage";
import type { StoredImage } from "./types";

export const OG_SIZE = { width: 1200, height: 630 };

/** The card renderer only understands PNG/JPEG, so stored WebP images are converted on the fly. */
async function imageDataUrl(img: StoredImage | null): Promise<string | null> {
  if (!img) return null;
  try {
    let bytes: Uint8Array | null = null;
    if (img.url.startsWith("/media/")) bytes = (await readLocal(img.url.replace(/^\/media\//, "")))?.data ?? null;
    else {
      const res = await fetch(img.url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) bytes = new Uint8Array(await res.arrayBuffer());
    }
    if (!bytes) return null;
    const png = await sharp(bytes).resize(360, 360, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toLocaleUpperCase("tr-TR")).join("");

export async function profileCard(opts: { title: string; subtitle: string; summary: string; image: StoredImage | null; kind: "person" | "org"; verified: boolean }) {
  const photo = await imageDataUrl(opts.image);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 700, color: "#0f172a" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#1f5af2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>P</div>
          Portfedia
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 56, marginTop: 24 }}>
          <div
            style={{
              width: 300,
              height: 300,
              borderRadius: opts.kind === "person" ? 28 : 24,
              background: "#eef3ff",
              border: "2px solid #e4e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 110,
              fontWeight: 700,
              color: "#1f5af2",
              overflow: "hidden",
            }}
          >
            {photo ? <img src={photo} width={300} height={300} style={{ objectFit: opts.kind === "person" ? "cover" : "contain" }} alt="" /> : initials(opts.title)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 68, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
              {opts.title}
              {opts.verified && (
                <div style={{ width: 44, height: 44, borderRadius: 22, background: "#1f5af2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✓</div>
              )}
            </div>
            {opts.subtitle && <div style={{ fontSize: 34, color: "#3f4a5c", marginTop: 16 }}>{opts.subtitle}</div>}
            {opts.summary && (
              <div style={{ fontSize: 26, color: "#6b7588", marginTop: 22, lineHeight: 1.4 }}>
                {opts.summary.length > 150 ? `${opts.summary.slice(0, 147)}…` : opts.summary}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
