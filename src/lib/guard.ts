import "server-only";
import { connectDB } from "./db";
import { User } from "./models";
import { findOffensive } from "./content-rules";
import { createReport } from "./moderation";
import type { PageDoc, SessionUser } from "./types";

const DAY = 86400_000;

/** Links added per user per day, stored in MongoDB so the limit holds across restarts and containers. */
async function addLinks(userId: string, n: number): Promise<number> {
  const { addToCounter } = await import("./rate-limit");
  return addToCounter(`links:${userId}`, n, DAY);
}

/**
 * Checks an edit before it is saved:
 *  - offensive language is refused (#11)
 *  - adding many new external links is refused and reported to moderators (#12);
 *    accounts younger than 7 days get a much lower limit
 */
export async function guardContent(
  user: SessionUser,
  opts: { texts: (string | undefined | null)[]; newLinks: string[]; page: PageDoc | null },
): Promise<string | null> {
  const bad = findOffensive(...opts.texts);
  if (bad.length) return `Please remove offensive language before saving (${bad.slice(0, 3).map((w) => `"${w}"`).join(", ")}).`;

  if (opts.newLinks.length === 0 || user.role !== "user") return null;
  await connectDB();
  const doc = await User.findById(user.id, { createdAt: 1 }).lean<{ createdAt: Date }>();
  const isNew = !doc || Date.now() - new Date(doc.createdAt).getTime() < 7 * DAY;
  const limit = isNew ? 8 : 25;
  const total = await addLinks(user.id, opts.newLinks.length);
  if (total > limit) {
    await createReport({
      page: opts.page,
      reason: "spam",
      details: `Automatic flag: ${user.name} (${user.email}) tried to add ${total} external links within 24 hours${isNew ? " with a new account" : ""}.\n\n${opts.newLinks.slice(0, 20).join("\n")}`,
      reporter: null,
      reporterName: "Portfedia (automatic)",
      reporterEmail: "",
    });
    return isNew
      ? "New accounts can only add a few links per day. Please try again tomorrow, or remove some links."
      : "You've added a lot of links today. Please try again tomorrow, or remove some links.";
  }
  return null;
}
