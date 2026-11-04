import "server-only";

/**
 * In-process background worker (no extra service): delivers outbox jobs every 15 seconds and runs
 * maintenance every 6 hours (and shortly after start). Disable with WORKER=off.
 */
let started = false;

export function startWorker() {
  if (started || process.env.WORKER === "off") return;
  started = true;
  const tick = async () => {
    try {
      const { processOutbox } = await import("./outbox");
      await processOutbox();
    } catch (err) {
      console.error(JSON.stringify({ level: "error", message: "outbox tick failed", error: String(err) }));
    }
  };
  const maintain = async () => {
    try {
      const { runMaintenance } = await import("./maintenance");
      await runMaintenance();
    } catch (err) {
      console.error(JSON.stringify({ level: "error", message: "maintenance failed", error: String(err) }));
    }
  };
  setInterval(tick, 15_000).unref();
  setTimeout(maintain, 20_000).unref();
  setInterval(maintain, 6 * 3600_000).unref();
}
