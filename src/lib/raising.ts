import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Page, User } from "./models";
import { notify } from "./notifications";
import { PUBLIC_FILTER } from "./visibility";
import { toCard } from "./pages";
import { searchKey } from "./slug";
import type { PageDoc } from "./types";


/** Companies and SaaS projects that say they are raising now, newest first. */
export async function listRaising(opts: { q?: string; stage?: string; sector?: string; page?: number; perPage?: number }) {
  await connectDB();
  const perPage = opts.perPage ?? 20;
  const page = Math.max(1, opts.page ?? 1);
  const filter: Record<string, unknown> = { type: "org", "raising.active": true, ...PUBLIC_FILTER };
  if (opts.stage) filter["raising.stage"] = opts.stage;
  if (opts.sector) filter.sectors = opts.sector;
  const term = searchKey((opts.q ?? "").slice(0, 80));
  if (term) filter.titleKey = new RegExp(`(^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  const [rows, total, sectors] = await Promise.all([
    Page.find(filter, { slug: 1, title: 1, type: 1, summary: 1, image: 1, verified: 1, infobox: 1, experiences: 1, status: 1, raising: 1, category: 1 })
      .sort({ "raising.since": -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
    Page.countDocuments(filter),
    Page.distinct("sectors", { type: "org", "raising.active": true, ...PUBLIC_FILTER }),
  ]);
  return {
    items: rows.map((r) => ({ card: toCard(r), raising: r.raising, saas: r.category === "saas" })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / perPage)),
    sectors: (sectors as string[]).filter(Boolean).sort(),
  };
}

export async function notifyNewRaise(page: PageDoc, authorId: string) {
  await connectDB();
  const users = await User.find({ notifyRaises: true, bannedAt: null, _id: { $ne: new Types.ObjectId(authorId) } }, { _id: 1 }).limit(5000).lean<{ _id: unknown }[]>();
  await notify(users.map((u) => String(u._id)), {
    type: "raising",
    text: `${page.title} is raising${page.raising?.stage ? ` a ${page.raising.stage} round` : ""}.`,
    href: `/org/${page.slug}#raising`,
    pageId: page._id,
  });
}

export async function raiseNotifications(userId: string): Promise<boolean> {
  await connectDB();
  const u = await User.findById(userId, { notifyRaises: 1 }).lean<{ notifyRaises?: boolean }>();
  return Boolean(u?.notifyRaises);
}

export async function setRaiseNotifications(userId: string, on: boolean) {
  await connectDB();
  await User.updateOne({ _id: userId }, { $set: { notifyRaises: on } });
}
