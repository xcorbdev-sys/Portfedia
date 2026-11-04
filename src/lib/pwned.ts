import "server-only";
import { createHash } from "node:crypto";

/**
 * Checks a password against known data breaches with Have I Been Pwned's free k-anonymity API:
 * only the first 5 characters of the SHA-1 hash leave the server, never the password.
 * Fails open (returns false) if the service can't be reached.
 */
export async function isPwnedPassword(password: string): Promise<boolean> {
  if (process.env.PWNED_CHECK === "off") return false;
  const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`, {
      headers: { "Add-Padding": "true", "User-Agent": "Portfedia" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return false;
    const suffix = sha1.slice(5);
    return (await res.text()).split("\n").some((line) => {
      const [h, count] = line.trim().split(":");
      return h === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}

export const PWNED_MESSAGE = "This password has appeared in a data breach. Please choose a different one.";
