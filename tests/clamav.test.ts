import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { scanBuffer } from "../src/lib/clamav.ts";

/** A tiny fake clamd that answers FOUND when the stream contains "EICAR". */
function fakeClamd(): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve) => {
    const server = createServer((sock) => {
      let buf = Buffer.alloc(0);
      sock.on("data", (d: Buffer) => {
        buf = Buffer.concat([buf, d]);
        if (buf.subarray(-4).equals(Buffer.alloc(4))) {
          sock.end(buf.includes(Buffer.from("EICAR")) ? "stream: Eicar-Test-Signature FOUND\0" : "stream: OK\0");
        }
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      resolve({ port, close: () => server.close() });
    });
  });
}

test("clamd INSTREAM: clean and infected files", async () => {
  const srv = await fakeClamd();
  try {
    assert.deepEqual(await scanBuffer(new Uint8Array(200_000).fill(65), { host: "127.0.0.1", port: srv.port }), { status: "clean" });
    const bad = await scanBuffer(Buffer.from("X5O!P%@AP EICAR test"), { host: "127.0.0.1", port: srv.port });
    assert.deepEqual(bad, { status: "infected", signature: "Eicar-Test-Signature" });
  } finally {
    srv.close();
  }
});

test("scanner not configured or unreachable → skipped", async () => {
  assert.equal((await scanBuffer(new Uint8Array(10), { host: "" })).status, "skipped");
  assert.equal((await scanBuffer(new Uint8Array(10), { host: "127.0.0.1", port: 1, timeoutMs: 1000 })).status, "skipped");
});
