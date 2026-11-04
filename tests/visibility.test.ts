import { test } from "node:test";
import assert from "node:assert/strict";
import { canView, isPublic, statusAfterOwnerSave } from "../src/lib/visibility.ts";

const owner = { id: "u1", role: "user" as const };
const stranger = { id: "u2", role: "user" as const };
const admin = { id: "u3", role: "admin" as const };

test("pending and rejected profiles are hidden from the public", () => {
  assert.equal(isPublic({ status: "pending" }), false);
  assert.equal(isPublic({ status: "rejected" }), false);
  assert.equal(isPublic({ status: "published" }), true);
  assert.equal(isPublic({ status: "draft" }), true); // draft organization pages stay visible
});

test("only the owner and moderators can view a profile under review", () => {
  const page = { status: "pending" as const, ownerId: "u1", type: "person" as const };
  assert.equal(canView(page, null), false);
  assert.equal(canView(page, stranger), false);
  assert.equal(canView(page, owner), true);
  assert.equal(canView(page, admin), true);
});

test("saving moves new and rejected profiles into review, keeps approved ones live", () => {
  assert.equal(statusAfterOwnerSave(null), "pending");
  assert.equal(statusAfterOwnerSave("rejected"), "pending");
  assert.equal(statusAfterOwnerSave("pending"), "pending");
  assert.equal(statusAfterOwnerSave("published"), "published");
});
