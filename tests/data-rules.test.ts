import { test } from "node:test";
import assert from "node:assert/strict";
import { duplicatePositions, isLikelySameOrg, normalizeOrgName, reportPriority, yearProblems } from "../src/lib/data-rules.ts";

test("organization names are normalised", () => {
  assert.equal(normalizeOrgName("ACME Yazılım A.Ş."), "acme yazilim");
  assert.equal(normalizeOrgName("Acme Yazılım Ltd. Şti."), "acme yazilim");
  assert.equal(normalizeOrgName("Northwind Robotics Inc."), "northwind robotics");
  assert.equal(normalizeOrgName("Bank"), "bank");
});

test("likely duplicates", () => {
  assert.ok(isLikelySameOrg("Acme Yazılım A.Ş.", "acme yazilim"));
  assert.ok(isLikelySameOrg("Northwind Robotic", "Northwind Robotics Inc."));
  assert.ok(!isLikelySameOrg("Northwind Robotics", "Southwind Robotics Systems Group"));
  assert.ok(!isLikelySameOrg("Acme", "Acne"));
});

test("year problems", () => {
  assert.deepEqual(yearProblems("X", { startYear: 2015, endYear: 2010 }, 2026), ["X: the end year is before the start year."]);
  assert.equal(yearProblems("X", { startYear: 2030 }, 2026).length, 1);
  assert.deepEqual(yearProblems("X", { startYear: 2015, endYear: null, current: true }, 2026), []);
});

test("duplicate positions", () => {
  assert.deepEqual(
    duplicatePositions([
      { orgTitle: "Acme Inc.", role: "CTO", startYear: 2019 },
      { orgTitle: "ACME", role: "cto", startYear: 2019 },
      { orgTitle: "Acme", role: "CEO", startYear: 2021 },
    ]),
    ["ACME"],
  );
});

test("report priority", () => {
  assert.ok(reportPriority("impersonation") > reportPriority("spam"));
});
