import { connectDB } from "./db";
import { RateCounter } from "./models";

/**
 * Rate limiting backed by MongoDB (#13): counters survive restarts and are shared by every
 * container. Fixed windows keyed by `<key>:<window number>`, removed automatically by a TTL index.
 * If the database is unreachable the request is allowed (availability over strictness).
 */
export async function addToCounter(key: string, amount: number, windowMs: number): Promise<number> {
  try {
    await connectDB();
    const win = Math.floor(Date.now() / windowMs);
    const doc = await RateCounter.findOneAndUpdate(
      { _id: `${key}:${win}` },
      { $inc: { count: amount }, $setOnInsert: { expiresAt: new Date((win + 2) * windowMs) } },
      { upsert: true, returnDocument: "after" },
    ).lean<{ count: number }>();
    return doc?.count ?? amount;
  } catch {
    return 0;
  }
}

/** true = allowed. Counts this attempt. */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  return (await addToCounter(key, 1, windowMs)) <= max;
}
