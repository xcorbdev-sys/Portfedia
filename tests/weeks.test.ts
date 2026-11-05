import { test } from "node:test";
import assert from "node:assert/strict";
import { isoWeek, previousWeek, validWeek } from "../src/lib/weeks";

test("ISO weeks, including year boundaries", () => {
  assert.equal(isoWeek(new Date("2026-11-05T12:00:00Z")), "2026-W45");
  assert.equal(isoWeek(new Date("2026-01-01T12:00:00Z")), "2026-W01");
  assert.equal(isoWeek(new Date("2027-01-01T12:00:00Z")), "2026-W53");
  assert.equal(isoWeek(new Date("2024-12-30T12:00:00Z")), "2025-W01");
});

test("previous week", () => {
  assert.equal(previousWeek("2026-W45"), "2026-W44");
  assert.equal(previousWeek("2026-W01"), "2025-W52");
  assert.equal(previousWeek("2027-W01"), "2026-W53");
});

test("week format check", () => {
  assert.ok(validWeek("2026-W45"));
  assert.ok(!validWeek("2026-W60"));
  assert.ok(!validWeek("x"));
});
