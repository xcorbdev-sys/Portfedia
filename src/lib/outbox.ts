import "server-only";
import { connectDB } from "./db";
import { Job } from "./models";

/**
 * Outbox (#43): emails and follower notifications are stored as jobs and delivered in the background
 * with retries (1, 2, 4, 8, 16 minutes…). A failed delivery never breaks the user's action.
 */
type Handler = (payload: Record<string, unknown>) => Promise<void>;
const handlers = new Map<string, Handler>();
export function registerJobHandler(type: string, h: Handler) {
  handlers.set(type, h);
}

const MAX_ATTEMPTS = 6;

async function ensureHandlers() {
  if (handlers.size) return;
  const [{ deliverEmail }, { fanOutToFollowers }] = await Promise.all([import("./email"), import("./notifications")]);
  registerJobHandler("email", (p) => deliverEmail(p as never));
  registerJobHandler("notify_followers", (p) => fanOutToFollowers(String(p.pageId), String(p.authorId), p as never));
  registerJobHandler("indexnow", async (p) => (await import("./indexing")).deliverIndexNow(p as never));
}

export async function enqueue(type: string, payload: Record<string, unknown>): Promise<void> {
  await connectDB();
  await Job.create({ type, payload });
  // Deliver right away when possible; the worker retries whatever fails
  void processOutbox(5).catch(() => {});
}

let running = false;

export async function processOutbox(batch = 20): Promise<number> {
  if (running) return 0;
  running = true;
  let done = 0;
  try {
    await ensureHandlers();
    await connectDB();
    for (let i = 0; i < batch; i++) {
      const now = new Date();
      // Claim one job atomically (safe with several containers)
      const job = await Job.findOneAndUpdate(
        { status: { $in: ["queued", "processing"] }, runAt: { $lte: now }, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
        { $set: { status: "processing", lockedUntil: new Date(now.getTime() + 60_000) }, $inc: { attempts: 1 } },
        { sort: { runAt: 1 }, returnDocument: "after" },
      ).lean<{ _id: unknown; type: string; payload: Record<string, unknown>; attempts: number }>();
      if (!job) break;
      const handler = handlers.get(job.type);
      try {
        if (!handler) throw new Error(`No handler for job type ${job.type}`);
        await handler(job.payload);
        await Job.deleteOne({ _id: job._id });
        done++;
      } catch (err) {
        const failed = job.attempts >= MAX_ATTEMPTS;
        await Job.updateOne(
          { _id: job._id },
          {
            $set: {
              status: failed ? "failed" : "queued",
              lockedUntil: null,
              lastError: String((err as Error)?.message ?? err).slice(0, 500),
              runAt: new Date(Date.now() + 2 ** (job.attempts - 1) * 60_000),
            },
          },
        );
        console.error(JSON.stringify({ level: failed ? "error" : "warn", message: `job ${job.type} failed`, attempts: job.attempts, error: String((err as Error)?.message ?? err) }));
      }
    }
  } finally {
    running = false;
  }
  return done;
}

export async function outboxStats() {
  await connectDB();
  const [queued, failed] = await Promise.all([Job.countDocuments({ status: { $in: ["queued", "processing"] } }), Job.countDocuments({ status: "failed" })]);
  return { queued, failed };
}
