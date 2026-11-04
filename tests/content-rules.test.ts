import { test } from "node:test";
import assert from "node:assert/strict";
import { externalLinks, findOffensive, passwordStrength } from "../src/lib/content-rules.ts";

test("password strength", () => {
  assert.equal(passwordStrength("abc").score, 0);
  assert.equal(passwordStrength("password1").score, 0);
  assert.equal(passwordStrength("abcdefgh").score, 1);
  assert.ok(passwordStrength("Correct-Horse-9").score >= 3);
  assert.equal(passwordStrength("a long sentence that is easy to remember!").score, 4);
});

test("offensive words are found as whole words only, Turkish normalised", () => {
  assert.deepEqual(findOffensive("You are an ASSHOLE."), ["asshole"]);
  assert.deepEqual(findOffensive("Şerefsiz herif"), ["serefsiz"]);
  assert.deepEqual(findOffensive("Malatya'da mali müşavir, Scunthorpe, picture, assessment"), []);
  assert.deepEqual(findOffensive("Robotics engineer", null, undefined), []);
});

test("external links are collected and de-duplicated", () => {
  assert.deepEqual(externalLinks("See https://a.com/x. And [b](https://B.com) https://a.com/x"), ["https://a.com/x", "https://b.com"]);
});
