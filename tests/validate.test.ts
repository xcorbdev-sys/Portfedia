import { test } from "node:test";
import assert from "node:assert/strict";
import { email, handle, httpUrl, str, year } from "../src/lib/validate.ts";
import { isReservedSlug } from "../src/lib/slug.ts";
import { sniffImage } from "../src/lib/storage-sniff.ts";

test("httpUrl only allows http(s) and adds https://", () => {
  assert.equal(httpUrl("example.com"), "https://example.com/");
  assert.equal(httpUrl("javascript:alert(1)"), "");
  assert.equal(httpUrl("http://a.b/c"), "http://a.b/c");
});

test("handle strips @ and profile URLs", () => {
  assert.equal(handle("@ayse"), "ayse");
  assert.equal(handle("https://github.com/ayse/"), "ayse");
  assert.equal(handle("bad handle!"), "");
});

test("year, email and str are bounded", () => {
  assert.equal(year("1992"), 1992);
  assert.equal(year("12"), null);
  assert.equal(email("A@B.co "), "a@b.co");
  assert.equal(email("nope"), "");
  assert.equal(str("  x\u0000y  ", 10), "xy");
  assert.equal(str("abcdef", 3), "abc");
});

test("reserved slugs cannot be used for profiles", () => {
  assert.ok(isReservedSlug("search"));
  assert.ok(isReservedSlug("org"));
  assert.ok(!isReservedSlug("ayse-demir"));
});

test("image type is detected from magic bytes", () => {
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext, "jpg");
  assert.equal(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext, "png");
  assert.equal(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>")), null);
});
