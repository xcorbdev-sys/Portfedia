import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOrganization, qidFrom, referencedIds, type WdEntity } from "../src/lib/wikidata-parse";

const item = (id: string): { mainsnak: { snaktype: string; datavalue: { value: { id: string } } } } => ({ mainsnak: { snaktype: "value", datavalue: { value: { id } } } });

const spotify: WdEntity = {
  id: "Q689141",
  labels: { en: { value: "Spotify" } },
  descriptions: { en: { value: "audio streaming service" } },
  claims: {
    P31: [item("Q4830453")],
    P571: [{ mainsnak: { snaktype: "value", datavalue: { value: { time: "+2006-04-23T00:00:00Z", precision: 11 } } } }],
    P856: [{ mainsnak: { snaktype: "value", datavalue: { value: "https://www.spotify.com/" } } }],
    P452: [item("Q1"), item("Q2"), item("Q3")],
    P159: [item("Q1754")],
    P17: [item("Q34")],
    P1128: [
      { mainsnak: { snaktype: "value", datavalue: { value: { amount: "+6617" } } }, qualifiers: { P585: [{ datavalue: { value: { time: "+2020-12-31T00:00:00Z" } } }] } },
      { mainsnak: { snaktype: "value", datavalue: { value: { amount: "+9123" } } }, qualifiers: { P585: [{ datavalue: { value: { time: "+2022-12-31T00:00:00Z" } } }] } },
    ],
  },
};
const labels = { Q1: "music streaming", Q2: "technology", Q1754: "Stockholm", Q34: "Sweden" };

test("organization facts are read from Wikidata", () => {
  const r = parseOrganization(spotify, labels);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.org.name, "Spotify");
  assert.equal(r.org.summary, "Audio streaming service");
  assert.equal(r.org.founded, 2006);
  assert.equal(r.org.website, "https://www.spotify.com/");
  assert.equal(r.org.sector, "Music streaming, Technology");
  assert.equal(r.org.headquarters, "Stockholm, Sweden");
  assert.equal(r.org.employees, "9,123 (2022)");
  assert.equal(r.org.type, "org");
  assert.equal(r.org.sourceUrl, "https://www.wikidata.org/wiki/Q689141");
});

test("only the first two industries, one headquarters and one country are looked up", () => {
  assert.deepEqual(referencedIds(spotify), ["Q1", "Q2", "Q1754", "Q34"]);
});

test("people are never imported", () => {
  const person: WdEntity = { id: "Q42", labels: { en: { value: "Douglas Adams" } }, claims: { P31: [item("Q5")] } };
  const r = parseOrganization(person, {});
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /person/);
});

test("universities become school pages", () => {
  const r = parseOrganization({ id: "Q49108", labels: { en: { value: "MIT" } }, claims: { P31: [item("Q3918")] } }, {});
  assert.ok(r.ok && r.org.type === "school");
});

test("vague or deprecated values are ignored", () => {
  const e: WdEntity = {
    id: "Q9",
    labels: { en: { value: "Old Guild" } },
    claims: {
      P571: [{ mainsnak: { snaktype: "value", datavalue: { value: { time: "+1500-00-00T00:00:00Z", precision: 7 } } } }],
      P856: [{ rank: "deprecated", mainsnak: { snaktype: "value", datavalue: { value: "http://old.example" } } }],
    },
  };
  const r = parseOrganization(e, {});
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.org.founded, null);
    assert.equal(r.org.website, "");
  }
});

test("missing items and items without an English name are refused", () => {
  assert.equal(parseOrganization({ id: "Q1", missing: "" }, {}).ok, false);
  assert.equal(parseOrganization(undefined, {}).ok, false);
  assert.equal(parseOrganization({ id: "Q2", labels: { de: { value: "Firma" } } }, {}).ok, false);
});

test("Q-ids are recognised in plain text and links", () => {
  assert.equal(qidFrom("q689141"), "Q689141");
  assert.equal(qidFrom("https://www.wikidata.org/wiki/Q689141"), "Q689141");
  assert.equal(qidFrom("https://www.wikidata.org/entity/Q5"), "Q5");
  assert.equal(qidFrom("Spotify"), null);
  assert.equal(qidFrom("Q12 Media"), null);
});
