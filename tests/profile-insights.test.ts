import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTimeline, profileCompleteness } from "../src/lib/profile-insights.ts";

const base = {
  image: null, summary: "", experiences: [], educations: [], body: "", tags: [], languageLevels: [], infobox: {},
  projects: [], publications: [], awards: [], sources: [], volunteering: [],
} as never;

test("completeness grows as the profile is filled in", () => {
  const empty = profileCompleteness(base);
  assert.equal(empty.percent, 0);
  assert.ok(empty.missing.includes("Add a photo"));
  const fuller = profileCompleteness({ ...(base as object), image: { key: "k", url: "u" }, summary: "x".repeat(50), tags: ["a"] } as never);
  assert.equal(fuller.percent, 30);
});

test("timeline positions bars between the first year and now", () => {
  const t = buildTimeline(
    {
      ...(base as object),
      experiences: [
        { orgTitle: "A", role: "Dev", startYear: 2010, endYear: 2015, current: false, verification: "unverified" },
        { orgTitle: "B", role: "CTO", startYear: 2015, endYear: null, current: true, verification: "unverified" },
      ],
    } as never,
    2020,
  )!;
  assert.equal(t.min, 2010);
  assert.equal(t.bars[0].left, 0);
  assert.ok(Math.abs(t.bars[1].left + t.bars[1].width - 100) < 0.01);
  assert.equal(buildTimeline(base, 2020), null);
});
