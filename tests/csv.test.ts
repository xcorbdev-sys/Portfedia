import { test } from "node:test";
import assert from "node:assert/strict";
import { csvRecords, parseCsv } from "../src/lib/csv.ts";

test("parses quotes, escaped quotes and newlines in fields", () => {
  const rows = parseCsv('name,summary\n"Acme, Inc.","He said ""hi""\nsecond line"\nBeta,plain\n');
  assert.deepEqual(rows, [["name", "summary"], ["Acme, Inc.", 'He said "hi"\nsecond line'], ["Beta", "plain"]]);
});

test("detects semicolon delimiter and BOM; records keyed by header", () => {
  const recs = csvRecords("﻿Name;Sector;Founded\r\nNorthwind;Robotics;2015\r\n\r\n");
  assert.deepEqual(recs, [{ name: "Northwind", sector: "Robotics", founded: "2015" }]);
});
