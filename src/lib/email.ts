import "server-only";
import { siteUrl } from "./site";

/**
 * Sends email through Resend (https://resend.com) when RESEND_API_KEY and EMAIL_FROM are set.
 * Otherwise the message is written to the server log, so development works without an account.
 */
export interface Email {
  to: string;
  subject: string;
  /** Plain paragraphs; links are rendered as buttons. */
  lines: string[];
  button?: { label: string; url: string };
  /** Shown under the footer for messages users can switch off. */
  preferencesNote?: boolean;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function footer(): { text: string; html: string } {
  // CAN-SPAM / good practice: identify the sender with a physical address
  const company = process.env.COMPANY_NAME || "Portfedia";
  const address = process.env.COMPANY_ADDRESS || "";
  const text = [company, address].filter(Boolean).join(" · ");
  return { text, html: esc(text) };
}

export function renderEmail(e: Email): { html: string; text: string } {
  const f = footer();
  const prefs = `${siteUrl()}/account#notifications`;
  const text = [
    ...e.lines,
    e.button ? `${e.button.label}: ${e.button.url}` : "",
    "",
    "—",
    f.text,
    e.preferencesNote ? `Manage email notifications: ${prefs}` : "You received this email because of an action on your Portfedia account.",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f6f8fc;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #e4e8f0;border-radius:12px" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 28px 8px;font-size:20px;font-weight:700"><span style="display:inline-block;width:26px;height:26px;border-radius:7px;background:#1f5af2;color:#fff;text-align:center;line-height:26px;font-size:15px;margin-right:8px">P</span>Portfedia</td></tr>
<tr><td style="padding:8px 28px 4px;font-size:15px;line-height:1.6">
${e.lines.map((l) => `<p style="margin:0 0 12px">${esc(l)}</p>`).join("")}
${e.button ? `<p style="margin:20px 0"><a href="${esc(e.button.url)}" style="display:inline-block;background:#1f5af2;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:9px">${esc(e.button.label)}</a></p><p style="margin:0 0 12px;font-size:12px;color:#6b7588;word-break:break-all">${esc(e.button.url)}</p>` : ""}
</td></tr></table>
<p style="font-size:12px;color:#6b7588;margin:16px 0 0">${f.html}<br>${
    e.preferencesNote
      ? `<a href="${esc(prefs)}" style="color:#6b7588">Manage email notifications</a>`
      : "You received this email because of an action on your Portfedia account."
  }</p>
</td></tr></table></body></html>`;
  return { html, text };
}

/** Queues an email; it is delivered in the background with retries (see outbox.ts). */
export async function sendEmail(e: Email): Promise<void> {
  const { enqueue } = await import("./outbox");
  await enqueue("email", e as unknown as Record<string, unknown>);
}

/** Actually delivers an email. Throws on failure so the outbox retries it. */
export async function deliverEmail(e: Email): Promise<void> {
  const { html, text } = renderEmail(e);
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.info(`[email:dev] To: ${e.to}\n[email:dev] Subject: ${e.subject}\n${text.replace(/^/gm, "[email:dev] ")}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [e.to], subject: e.subject, html, text, headers: e.preferencesNote ? listUnsubscribe() : undefined }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

function listUnsubscribe() {
  return { "List-Unsubscribe": `<${siteUrl()}/account#notifications>` };
}
