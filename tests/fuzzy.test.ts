import { test } from "node:test";
import assert from "node:assert/strict";
import { editDistance, fuzzyScore } from "../src/lib/fuzzy";
import { searchKey } from "../src/lib/slug";

test("edit distance counts typos and swapped letters", () => {
  assert.equal(editDistance("northwind", "northwind"), 0);
  assert.equal(editDistance("nortwind", "northwind"), 1);
  assert.equal(editDistance("nrothwind", "northwind"), 1);
  assert.equal(editDistance("abc", "xyzxyz", 2), 3);
});

test("fuzzy search tolerates typos and Turkish letters", () => {
  const t = searchKey("Ayşe Demir");
  assert.equal(fuzzyScore(searchKey("ayse demir"), t), 0);
  assert.notEqual(fuzzyScore(searchKey("Aişe Demr"), t), null);
  assert.notEqual(fuzzyScore(searchKey("dem"), t), null);
  assert.equal(fuzzyScore(searchKey("Mehmet"), t), null);
  assert.equal(fuzzyScore(searchKey("Northwnd"), searchKey("Northwind Robotics")), 1);
  assert.equal(fuzzyScore(searchKey("xyz"), searchKey("Northwind Robotics")), null);
});
