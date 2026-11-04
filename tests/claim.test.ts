import { test } from "node:test";
import assert from "node:assert/strict";
import { checkWorkEmail, claimDomainFor, domainFromWebsite, emailMatchesDomain, isFreeEmail } from "../src/lib/claim-rules.ts";

test("free email providers are rejected", () => {
  for (const e of ["a@gmail.com", "a@hotmail.com.tr", "a@yahoo.co.uk", "a@outlook.de", "a@yandex.com.tr", "a@icloud.com"]) {
    assert.equal(isFreeEmail(e), true, e);
  }
  assert.equal(isFreeEmail("ayse@northwind.com"), false);
});

test("website and email domains", () => {
  assert.equal(domainFromWebsite("https://www.Northwind.com/about"), "northwind.com");
  assert.equal(domainFromWebsite("northwind.com.tr"), "northwind.com.tr");
  assert.equal(emailMatchesDomain("ayse@northwind.com", "northwind.com"), true);
  assert.equal(emailMatchesDomain("ayse@eu.northwind.com", "northwind.com"), true);
  assert.equal(emailMatchesDomain("ayse@evilnorthwind.com", "northwind.com"), false);
  assert.equal(emailMatchesDomain("ayse@northwind.com.evil.io", "northwind.com"), false);
});

test("claim domain rules", () => {
  const now = Date.parse("2026-11-04T00:00:00Z");
  assert.deepEqual(claimDomainFor({ website: "https://northwind.com" }, now), { ok: true, domain: "northwind.com" });
  assert.equal(claimDomainFor({ website: "" }, now).ok, false);
  assert.equal(claimDomainFor({ website: "https://northwind.com", websiteChangedAt: new Date(now - 3600_000) }, now).ok, false);
  assert.equal(claimDomainFor({ website: "https://northwind.com", websiteChangedAt: new Date(now - 4 * 86400_000) }, now).ok, true);
  assert.deepEqual(claimDomainFor({ website: "https://x.io", websiteChangedAt: new Date(now), claimDomain: "northwind.com" }, now), { ok: true, domain: "northwind.com" });
  assert.equal(claimDomainFor({ website: "https://gmail.com" }, now).ok, false);
});

test("work email check", () => {
  assert.equal(checkWorkEmail("ayse@northwind.com", "northwind.com"), null);
  assert.match(checkWorkEmail("ayse@gmail.com", "northwind.com") ?? "", /work email/);
  assert.match(checkWorkEmail("ayse@other.com", "northwind.com") ?? "", /@northwind\.com/);
});
