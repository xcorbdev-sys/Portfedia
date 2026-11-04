/**
 * Free error tracking: every server error is written to the log as one JSON line,
 * so it can be searched in Coolify's log viewer (no third-party service).
 */
export async function register() {
  // Start the background worker (outbox + maintenance) in the Node.js server only
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { startWorker } = await import("./lib/worker");
    startWorker();
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  const e = err as Error & { digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      time: new Date().toISOString(),
      message: e?.message ?? String(err),
      digest: e?.digest,
      method: request.method,
      path: request.path.split("?")[0], // never log query strings (they can contain tokens)
      route: context.routePath,
      type: context.routeType,
      stack: e?.stack?.split("\n").slice(0, 6).join("\n"),
    }),
  );
}
