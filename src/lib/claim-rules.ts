/** Pure rules for claiming organization pages with a work email (unit tested). */

const FREE_EXACT = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "proton.me", "protonmail.com", "pm.me", "tutanota.com", "tuta.io", "zoho.com", "zohomail.com", "gmx.com",
  "gmx.net", "gmx.de", "web.de", "mail.com", "ymail.com", "rocketmail.com", "yandex.com", "yandex.ru", "yandex.com.tr",
  "mail.ru", "inbox.ru", "list.ru", "bk.ru", "qq.com", "163.com", "126.com", "sina.com", "naver.com", "hey.com",
  "fastmail.com", "hushmail.com", "mynet.com", "superonline.com", "ttmail.com", "windowslive.com", "duck.com",
]);
/** yahoo.co.uk, hotmail.com.tr, outlook.de … */
const FREE_PREFIXES = ["yahoo.", "hotmail.", "outlook.", "live.", "yandex.", "gmx."];

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export function isFreeEmail(email: string): boolean {
  const d = emailDomain(email);
  return !d || FREE_EXACT.has(d) || FREE_PREFIXES.some((p) => d.startsWith(p));
}

/** "https://www.northwind.com/about" -> "northwind.com" */
export function domainFromWebsite(website: string | undefined | null): string {
  if (!website) return "";
  try {
    return new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** ayse@northwind.com or ayse@eu.northwind.com match "northwind.com". */
export function emailMatchesDomain(email: string, domain: string): boolean {
  const d = emailDomain(email);
  const want = domain.toLowerCase().replace(/^www\./, "");
  return Boolean(d && want) && (d === want || d.endsWith(`.${want}`));
}

export const CLAIM_COOLDOWN_MS = 72 * 3600_000;

export type ClaimCheck = { ok: true; domain: string } | { ok: false; reason: string };

/**
 * Which domain can be used to claim an organization page.
 * A moderator-set domain always wins. Otherwise the website domain is used, but only when the
 * website hasn't changed recently (so nobody can point the page to their own domain and claim it).
 */
export function claimDomainFor(
  org: { claimDomain?: string | null; website?: string | null; websiteChangedAt?: Date | null },
  now = Date.now(),
): ClaimCheck {
  if (org.claimDomain) return { ok: true, domain: org.claimDomain };
  const domain = domainFromWebsite(org.website);
  if (!domain) return { ok: false, reason: "This page has no website yet. Add the organization's official website first." };
  if (isFreeEmail(`x@${domain}`)) return { ok: false, reason: "This website can't be used to verify ownership. Please contact us." };
  if (org.websiteChangedAt && now - new Date(org.websiteChangedAt).getTime() < CLAIM_COOLDOWN_MS) {
    return { ok: false, reason: "The website on this page changed recently. For security, claiming opens 3 days after a change." };
  }
  return { ok: true, domain };
}

export function checkWorkEmail(email: string, domain: string): string | null {
  if (isFreeEmail(email)) return "Please use your work email address, not a personal one (Gmail, Outlook, …).";
  if (!emailMatchesDomain(email, domain)) return `The email address must end with @${domain}.`;
  return null;
}
