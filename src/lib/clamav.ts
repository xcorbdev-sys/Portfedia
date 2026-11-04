import { Socket } from "node:net";

/**
 * Optional virus scan of uploads with ClamAV (#19), using clamd's INSTREAM protocol over TCP.
 * Enabled when CLAMAV_HOST is set (e.g. the "clamav" service in docker-compose).
 * If the scanner can't be reached the upload is allowed and the problem is logged.
 */
export type ScanResult = { status: "clean" } | { status: "infected"; signature: string } | { status: "skipped"; reason: string };

export function scanBuffer(data: Uint8Array, opts: { host?: string; port?: number; timeoutMs?: number } = {}): Promise<ScanResult> {
  const host = opts.host ?? process.env.CLAMAV_HOST;
  const port = opts.port ?? Number(process.env.CLAMAV_PORT ?? 3310);
  if (!host) return Promise.resolve({ status: "skipped", reason: "not configured" });

  return new Promise((resolve) => {
    const socket = new Socket();
    let reply = "";
    const done = (r: ScanResult) => {
      socket.destroy();
      resolve(r);
    };
    socket.setTimeout(opts.timeoutMs ?? 10_000, () => done({ status: "skipped", reason: "timeout" }));
    socket.on("error", (err) => done({ status: "skipped", reason: err.message }));
    socket.on("data", (chunk) => {
      reply += chunk.toString("utf8");
    });
    socket.on("end", () => {
      const text = reply.replace(/\0/g, "").trim(); // e.g. "stream: OK" or "stream: Eicar-Signature FOUND"
      if (/OK$/.test(text)) return done({ status: "clean" });
      const m = text.match(/^stream: (.+) FOUND$/);
      if (m) return done({ status: "infected", signature: m[1] });
      done({ status: "skipped", reason: `unexpected reply: ${text.slice(0, 100)}` });
    });
    socket.connect(port, host, () => {
      socket.write("zINSTREAM\0");
      const CHUNK = 64 * 1024;
      for (let i = 0; i < data.length; i += CHUNK) {
        const part = data.subarray(i, i + CHUNK);
        const len = Buffer.alloc(4);
        len.writeUInt32BE(part.length);
        socket.write(len);
        socket.write(part);
      }
      socket.write(Buffer.alloc(4)); // zero-length chunk ends the stream
    });
  });
}
