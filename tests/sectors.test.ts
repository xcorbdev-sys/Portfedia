import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSectors, MAX_SECTORS, SAAS_CATEGORIES, SECTORS, sectorsFromText } from "../src/lib/sectors";

test("old free text becomes list entries (at most three)", () => {
  assert.deepEqual(sectorsFromText("AI Platforms, Banking, Marketing, Entrepreneurship", false), ["Artificial Intelligence", "Banking", "Marketing & Advertising"]);
  assert.deepEqual(sectorsFromText("Robotics & Automation", false), ["Robotics & Automation"]);
  assert.deepEqual(sectorsFromText("fintech", false), ["Fintech"]);
  assert.deepEqual(sectorsFromText("Something nobody knows", false), []);
});

test("SaaS projects use the SaaS categories", () => {
  assert.deepEqual(sectorsFromText("QR Menu Platform", true), ["Restaurant & Hospitality"]);
  assert.deepEqual(sectorsFromText("AI Platforms", true), ["AI Assistants"]);
  assert.deepEqual(sectorsFromText("crm", true), ["CRM"]);
});

test("only valid choices are kept, without duplicates", () => {
  assert.deepEqual(cleanSectors(["Banking", "banking", "Made Up", "Fintech", "Insurance", "Payments"], false), ["Banking", "Fintech", "Insurance"]);
  assert.equal(cleanSectors(["CRM"], false).length, 0); // a SaaS category is not an industry
  assert.deepEqual(cleanSectors(["CRM"], true), ["CRM"]);
});

test("the lists have no duplicates", () => {
  assert.equal(new Set(SECTORS).size, SECTORS.length);
  assert.equal(new Set(SAAS_CATEGORIES).size, SAAS_CATEGORIES.length);
  assert.equal(MAX_SECTORS, 3);
});
