import "server-only";
import { Types } from "mongoose";
import { connectDB } from "./db";
import { Conversation, Follow, Message, Page, Report, User } from "./models";
import { notify } from "./notifications";
import { guardContent } from "./guard";
import { externalLinks } from "./content-rules";
import { rateLimit } from "./rate-limit";
import { createReport } from "./moderation";
import { getPersonPageOf } from "./pages";
import { isPublic } from "./visibility";
import type { PageDoc, SessionUser } from "./types";

/**
 * Private messages (#61), built to keep unwanted messages out:
 * - only members with a confirmed email and a published profile can message, and each member chooses who may
 *   start a conversation with them (everyone, people they follow, nobody);
 * - a new conversation is a request: the starter can send one message until the other side replies;
 * - new accounts may start 3 conversations a day (others 20), everyone may send 60 messages an hour;
 * - offensive words and link spam are refused; members can block and report; someone blocked by several
 *   people is reported to moderators automatically and can't start new conversations.
 */
export const MESSAGES_FROM = { everyone: "Any member with a published profile", following: "Only people I follow", nobody: "Nobody" } as const;
export type MessagesFrom = keyof typeof MESSAGES_FROM;

const DAY = 86400_000;
const oid = (id: string) => new Types.ObjectId(id);
const pair = (a: string, b: string) => [a, b].sort().map(oid);

export interface ConversationRow {
  id: string;
  other: { id: string; name: string; slug: string; image: string };
  lastText: string;
  lastMessageAt: Date;
  unread: boolean;
  request: boolean; // waiting for my answer
  pending: boolean; // I started it and wait for theirs
  blocked: boolean;
}

/** Why `sender` can't message the owner of `target` (or null when they can). */
export async function canMessage(sender: SessionUser, target: PageDoc): Promise<string | null> {
  if (!target.ownerId || target.type !== "person") return "This profile can't receive messages.";
  if (target.ownerId === sender.id) return "This is your own profile.";
  if (!sender.emailVerified) return "Please confirm your email address first.";
  const mine = await getPersonPageOf(sender.id);
  if (!mine || !isPublic(mine) || mine.status === "draft") return "You need a published profile to send messages.";
  await connectDB();
  const [recipient, me] = await Promise.all([
    User.findById(target.ownerId, { messagesFrom: 1, blockedUsers: 1, bannedAt: 1 }).lean<{ messagesFrom?: MessagesFrom; blockedUsers?: unknown[]; bannedAt?: Date | null }>(),
    User.findById(sender.id, { blockedUsers: 1 }).lean<{ blockedUsers?: unknown[] }>(),
  ]);
  if (!recipient || recipient.bannedAt) return "This profile can't receive messages.";
  if ((recipient.blockedUsers ?? []).some((b) => String(b) === sender.id)) return "You can't message this person.";
  if ((me?.blockedUsers ?? []).some((b) => String(b) === target.ownerId)) return "You blocked this person. Unblock them in your messages first.";
  // An ongoing conversation can always continue
  if (await Conversation.exists({ members: { $all: pair(sender.id, target.ownerId) }, accepted: true, blockedBy: null })) return null;
  const from = recipient.messagesFrom ?? "everyone";
  if (from === "nobody") return `${target.title} doesn't receive messages.`;
  if (from === "following" && !(await Follow.exists({ userId: oid(target.ownerId), pageId: oid(mine._id) }))) return `${target.title} only receives messages from people they follow.`;
  return null;
}

async function restricted(sender: SessionUser): Promise<string | null> {
  // Blocked by 3 or more members within 30 days: no new conversations (moderators are told once)
  const since = new Date(Date.now() - 30 * DAY);
  const blocks = await Conversation.countDocuments({ starterId: oid(sender.id), blockedBy: { $ne: null }, updatedAt: { $gt: since } });
  if (blocks < 3) return null;
  const page = await getPersonPageOf(sender.id);
  if (!(await Report.exists({ reporterName: "Portfedia (automatic)", details: { $regex: `^Messages: ${sender.id}` }, createdAt: { $gt: since } }))) {
    await createReport({
      page,
      reason: "harassment",
      details: `Messages: ${sender.id}\n${sender.name} (${sender.email}) was blocked by ${blocks} members they messaged in the last 30 days. They can't start new conversations until this is reviewed.`,
      reporter: null,
      reporterName: "Portfedia (automatic)",
      reporterEmail: "",
    });
  }
  return "Several people blocked your messages recently, so you can't start new conversations for now.";
}

/** Starts a conversation with the owner of a profile, or adds to the existing one. Returns its id or an error. */
export async function sendToProfile(sender: SessionUser, target: PageDoc, text: string, opts: { introId?: string; viaIntro?: boolean } = {}): Promise<{ id?: string; error?: string }> {
  const clean = text.trim().slice(0, 2000);
  if (clean.length < 2) return { error: "Write a message first." };
  if (!opts.viaIntro) {
    const why = await canMessage(sender, target);
    if (why) return { error: why };
  }
  await connectDB();
  const members = pair(sender.id, target.ownerId!);
  let conv = await Conversation.findOne({ members: { $all: members } });
  if (conv?.blockedBy) return { error: "You can't message this person." };
  if (!conv || !conv.accepted) {
    if (conv && String(conv.starterId) === sender.id && (await Message.exists({ conversationId: conv._id, senderId: oid(sender.id) })))
      return { error: `Your message is waiting for ${target.title} to answer. You can write again once they reply.` };
    if (!conv) {
      const r = await restricted(sender);
      if (r) return { error: r };
      const age = Date.now() - new Date((await User.findById(sender.id, { createdAt: 1 }).lean<{ createdAt: Date }>())?.createdAt ?? Date.now()).getTime();
      if (!(await rateLimit(`newconv:${sender.id}`, age < 7 * DAY ? 3 : 20, DAY))) return { error: "You've started many conversations today. Please try again tomorrow." };
    }
  }
  const err = await post(sender, clean, conv ? String(conv._id) : null);
  if (err) return { error: err };
  if (!conv) conv = await Conversation.create({ members, starterId: oid(sender.id), introId: opts.introId ? oid(opts.introId) : null });
  await addMessage(sender, String(conv._id), clean, target.ownerId!);
  return { id: String(conv._id) };
}

async function post(sender: SessionUser, text: string, _conv: string | null): Promise<string | null> {
  if (!(await rateLimit(`msg:${sender.id}`, 60, 3600_000))) return "You're sending messages too quickly. Please wait a little.";
  return guardContent(sender, { texts: [text], newLinks: externalLinks(text, ""), page: null });
}

async function addMessage(sender: SessionUser, convId: string, text: string, recipientId: string) {
  await Message.create({ conversationId: oid(convId), senderId: oid(sender.id), text });
  await Conversation.updateOne(
    { _id: convId },
    { $set: { lastMessageAt: new Date(), lastText: text.slice(0, 140), unreadFor: [oid(recipientId)], hiddenFor: [] } },
  );
  await notify([recipientId], { type: "message", text: `New message from ${sender.name}`, href: `/messages/${convId}` });
}

/** Reply inside a conversation. Replying to a request accepts it. */
export async function reply(sender: SessionUser, convId: string, text: string): Promise<string | null> {
  if (!Types.ObjectId.isValid(convId)) return "Conversation not found.";
  const clean = text.trim().slice(0, 2000);
  if (clean.length < 2) return "Write a message first.";
  await connectDB();
  const conv = await Conversation.findOne({ _id: convId, members: oid(sender.id) }).lean<{ _id: unknown; members: unknown[]; starterId: unknown; accepted: boolean; blockedBy: unknown }>();
  if (!conv) return "Conversation not found.";
  if (conv.blockedBy) return "This conversation is blocked.";
  const other = conv.members.map(String).find((m) => m !== sender.id)!;
  const blocked = await User.exists({ _id: other, blockedUsers: oid(sender.id) });
  if (blocked) return "You can't message this person.";
  if (!conv.accepted && String(conv.starterId) === sender.id) return "Your message is waiting for an answer. You can write again once they reply.";
  if (!sender.emailVerified) return "Please confirm your email address first.";
  const err = await post(sender, clean, convId);
  if (err) return err;
  if (!conv.accepted) await Conversation.updateOne({ _id: convId }, { $set: { accepted: true } });
  await addMessage(sender, convId, clean, other);
  return null;
}

export async function listConversations(userId: string): Promise<ConversationRow[]> {
  await connectDB();
  const me = oid(userId);
  const rows = await Conversation.find({ members: me, hiddenFor: { $ne: me } }).sort({ lastMessageAt: -1 }).limit(200).lean<
    { _id: unknown; members: unknown[]; starterId: unknown; accepted: boolean; lastText: string; lastMessageAt: Date; unreadFor: unknown[]; blockedBy: unknown }[]
  >();
  const others = rows.map((r) => r.members.map(String).find((m) => m !== userId)!);
  const [users, pages] = await Promise.all([
    User.find({ _id: { $in: others } }, { name: 1 }).lean<{ _id: unknown; name: string }[]>(),
    Page.find({ type: "person", ownerId: { $in: others } }, { slug: 1, ownerId: 1, title: 1, image: 1 }).lean<{ slug: string; ownerId: unknown; title: string; image?: { url?: string; thumbUrl?: string } }[]>(),
  ]);
  const name = new Map(users.map((u) => [String(u._id), u.name]));
  const page = new Map(pages.map((p) => [String(p.ownerId), p]));
  return rows.map((r, i) => {
    const o = others[i]!;
    const p = page.get(o);
    const mineStarted = String(r.starterId) === userId;
    return {
      id: String(r._id),
      other: { id: o, name: p?.title ?? name.get(o) ?? "Member", slug: p?.slug ?? "", image: p?.image?.thumbUrl || p?.image?.url || "" },
      lastText: r.lastText,
      lastMessageAt: r.lastMessageAt,
      unread: r.unreadFor.map(String).includes(userId),
      request: !r.accepted && !mineStarted,
      pending: !r.accepted && mineStarted,
      blocked: Boolean(r.blockedBy),
    };
  });
}

export async function getConversation(userId: string, convId: string) {
  if (!Types.ObjectId.isValid(convId)) return null;
  const rows = await listConversations(userId);
  await connectDB();
  let row = rows.find((r) => r.id === convId);
  if (!row) {
    // Hidden conversations can still be opened from a link
    const c = await Conversation.findOne({ _id: convId, members: oid(userId) }).lean();
    if (!c) return null;
    await Conversation.updateOne({ _id: convId }, { $pull: { hiddenFor: oid(userId) } });
    row = (await listConversations(userId)).find((r) => r.id === convId);
    if (!row) return null;
  }
  const messages = await Message.find({ conversationId: oid(convId) }).sort({ createdAt: 1 }).limit(500).lean<{ _id: unknown; senderId: unknown; text: string; createdAt: Date }[]>();
  await Conversation.updateOne({ _id: convId }, { $pull: { unreadFor: oid(userId) } });
  const conv = await Conversation.findById(convId, { blockedBy: 1 }).lean<{ blockedBy: unknown }>();
  return {
    ...row,
    blockedByMe: String(conv?.blockedBy ?? "") === userId,
    messages: messages.map((m) => ({ id: String(m._id), mine: String(m.senderId) === userId, text: m.text, at: m.createdAt })),
  };
}

export async function unreadConversations(userId: string): Promise<number> {
  await connectDB();
  return Conversation.countDocuments({ unreadFor: oid(userId), hiddenFor: { $ne: oid(userId) }, blockedBy: null });
}

/** Block the other member: no more messages either way, their conversation is closed. */
export async function blockInConversation(userId: string, convId: string): Promise<void> {
  if (!Types.ObjectId.isValid(convId)) return;
  await connectDB();
  const conv = await Conversation.findOne({ _id: convId, members: oid(userId) }).lean<{ members: unknown[] }>();
  if (!conv) return;
  const other = conv.members.map(String).find((m) => m !== userId)!;
  await User.updateOne({ _id: userId }, { $addToSet: { blockedUsers: oid(other) } });
  await Conversation.updateOne({ _id: convId }, { $set: { blockedBy: oid(userId), unreadFor: [] } });
}

export async function unblockInConversation(userId: string, convId: string): Promise<void> {
  if (!Types.ObjectId.isValid(convId)) return;
  await connectDB();
  const conv = await Conversation.findOne({ _id: convId, members: oid(userId), blockedBy: oid(userId) }).lean<{ members: unknown[] }>();
  if (!conv) return;
  const other = conv.members.map(String).find((m) => m !== userId)!;
  await User.updateOne({ _id: userId }, { $pull: { blockedUsers: oid(other) } });
  await Conversation.updateOne({ _id: convId }, { $set: { blockedBy: null } });
}

/** Hide a conversation from the list (it comes back with a new message). */
export async function hideConversation(userId: string, convId: string): Promise<void> {
  if (!Types.ObjectId.isValid(convId)) return;
  await connectDB();
  await Conversation.updateOne({ _id: convId, members: oid(userId) }, { $addToSet: { hiddenFor: oid(userId) }, $pull: { unreadFor: oid(userId) } });
}

/** Report the other member to moderators, with their recent messages attached. */
export async function reportConversation(user: SessionUser, convId: string, details: string): Promise<void> {
  if (!Types.ObjectId.isValid(convId)) return;
  await connectDB();
  const conv = await Conversation.findOne({ _id: convId, members: oid(user.id) }).lean<{ members: unknown[] }>();
  if (!conv) return;
  const other = conv.members.map(String).find((m) => m !== user.id)!;
  const msgs = await Message.find({ conversationId: oid(convId), senderId: oid(other) }).sort({ createdAt: -1 }).limit(10).lean<{ text: string; createdAt: Date }[]>();
  const page = await getPersonPageOf(other);
  await createReport({
    page,
    reason: "harassment",
    details: `Reported private messages${details ? `: ${details.slice(0, 1000)}` : ""}\n\nTheir latest messages:\n${msgs.map((m) => `[${m.createdAt.toISOString().slice(0, 16)}] ${m.text}`).join("\n")}`,
    reporter: user,
    reporterName: "",
    reporterEmail: "",
  });
}

export async function setMessagesFrom(userId: string, v: string) {
  if (!(v in MESSAGES_FROM)) return;
  await connectDB();
  await User.updateOne({ _id: userId }, { $set: { messagesFrom: v } });
}
