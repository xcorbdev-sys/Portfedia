import { getPageBySlug } from "@/lib/pages";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Embeddable "Verified on Portfedia" badge for organizations that manage their page (#51). */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug.replace(/\.svg$/, "");
  const page = await getPageBySlug(slug, ["org", "school"]);
  const verified = Boolean(page && (page.status === "claimed" || page.verified));
  const label = verified ? "Verified on Portfedia" : "On Portfedia";
  const name = page ? (page.title.length > 28 ? `${page.title.slice(0, 27)}…` : page.title) : "Portfedia";
  const width = Math.max(190, 70 + Math.max(label.length, name.length) * 7.2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="44" viewBox="0 0 ${width} 44" role="img" aria-label="${esc(`${name} – ${label}`)}">
<rect x="0.5" y="0.5" width="${width - 1}" height="43" rx="10" fill="#fff" stroke="#e4e8f0"/>
<rect x="9" y="9" width="26" height="26" rx="7" fill="#1f5af2"/><text x="22" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="15" fill="#fff">P</text>
<text x="44" y="19" font-family="Arial,sans-serif" font-size="12.5" font-weight="700" fill="#0f172a">${esc(name)}</text>
<text x="44" y="34" font-family="Arial,sans-serif" font-size="11" fill="${verified ? "#0f8a5f" : "#6b7588"}">${verified ? "✓ " : ""}${esc(label)}</text>
</svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" },
  });
}
