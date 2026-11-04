import { test } from "node:test";
import assert from "node:assert/strict";
import { compressSnapshot, readSnapshot } from "../src/lib/snapshots.ts";

test("compressed snapshots round-trip and are smaller", () => {
  const snap = { title: "Ayşe Demir", body: "Robotics engineer. ".repeat(200), tags: ["Robotics"] };
  const z = compressSnapshot(snap);
  assert.ok(z.length < JSON.stringify(snap).length / 5);
  assert.deepEqual(readSnapshot({ snapshotZ: z }), snap);
  assert.deepEqual(readSnapshot({ snapshot: { a: 1 } }), { a: 1 });
  assert.deepEqual(readSnapshot({}), {});
});
