import { test } from "node:test";
import assert from "node:assert/strict";
import { renderArticle, extractWikiLinks } from "../src/lib/wikitext.ts";
import { slugify, searchKey } from "../src/lib/slug.ts";

test("slugify transliterates Turkish characters", () => {
  assert.equal(slugify("Ayşe Demir"), "ayse-demir");
  assert.equal(slugify("İSTANBUL Ünv. & Çağ"), "istanbul-unv-and-cag");
  assert.equal(slugify("  --Iğdır--  "), "igdir");
  assert.equal(searchKey("Şule Öztürk"), "sule ozturk");
});

test("wiki links are extracted and de-duplicated", () => {
  const links = extractWikiLinks("[[Acme Yazılım]] ve [[acme yazılım|Acme]] ile [[ODTÜ]]");
  assert.deepEqual(links, [
    { slug: "acme-yazilim", title: "Acme Yazılım" },
    { slug: "odtu", title: "ODTÜ" },
  ]);
});

test("existing pages get normal links, missing pages get red links", () => {
  const existing = new Map([["acme-yazilim", "org" as const], ["ali-veli", "person" as const]]);
  const { leadHtml } = renderArticle("[[Acme Yazılım|Acme]], [[Ali Veli]] ve [[Yok Şirket]].", existing);
  assert.match(leadHtml, /<a href="\/org\/acme-yazilim"[^>]*>Acme<\/a>/);
  assert.match(leadHtml, /<a href="\/ali-veli"[^>]*>Ali Veli<\/a>/);
  assert.match(leadHtml, /href="\/create\?title=Yok%20%C5%9Eirket" class="new"/);
});

test("[[...]] inside code is not linked", () => {
  const { leadHtml } = renderArticle("`[[Acme]]`", new Map());
  assert.match(leadHtml, /<code>\[\[Acme\]\]<\/code>/);
});

test("raw HTML and javascript: links are stripped", () => {
  const { leadHtml } = renderArticle(
    '<script>alert(1)</script><img src=x onerror=alert(1)>\n\n[tıkla](javascript:alert(1))',
    new Map(),
  );
  assert.doesNotMatch(leadHtml, /<script|onerror|javascript:/i);
});

test("lead and sections are split and a TOC is built", () => {
  const md = "Giriş metni.\n\n# Kariyer\n\nMetin\n\n## Kariyer\n\n### Alt";
  const r = renderArticle(md, new Map(), ["education"]);
  assert.match(r.leadHtml, /Giriş metni/);
  assert.doesNotMatch(r.leadHtml, /<h2/);
  assert.deepEqual(r.toc.map((t) => t.id), ["kariyer", "kariyer-2", "alt"]);
  assert.match(r.restHtml, /<h2 id="kariyer">/);
});

test("external links get nofollow", () => {
  const { leadHtml } = renderArticle("[site](https://ornek.com)", new Map());
  assert.match(leadHtml, /rel="nofollow ugc noopener"/);
});
