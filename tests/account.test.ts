import { test } from "node:test";
import assert from "node:assert/strict";
import { isOldEnough } from "../src/lib/age.ts";
import { looksLikeBot } from "../src/lib/bot.ts";

const NOW = new Date("2026-11-04T12:00:00Z");

test("age screen requires 16+", () => {
  assert.equal(isOldEnough(2010, NOW), true); // turns 16 this year
  assert.equal(isOldEnough(2011, NOW), false);
  assert.equal(isOldEnough("1990", NOW), true);
  assert.equal(isOldEnough("", NOW), false);
  assert.equal(isOldEnough(2030, NOW), false);
  assert.equal(isOldEnough(1800, NOW), false);
});

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

test("bot check: honeypot and timing", () => {
  const now = 1_000_000_000;
  assert.equal(looksLikeBot(form({ form_started: String(now - 10_000), company_website: "" }), now), false);
  assert.equal(looksLikeBot(form({ form_started: String(now - 10_000), company_website: "spam.com" }), now), true);
  assert.equal(looksLikeBot(form({ form_started: String(now - 500) }), now), true); // too fast
  assert.equal(looksLikeBot(form({}), now), true); // missing field
});
