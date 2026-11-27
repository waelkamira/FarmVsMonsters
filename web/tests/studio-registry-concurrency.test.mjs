import test from "node:test";
import assert from "node:assert/strict";
import { assertExpectedContentSha } from "../game/studio/registryConcurrency.mjs";

test("Studio content writes accept an unchanged existing GitHub blob", () => {
  assert.equal(assertExpectedContentSha("abc123", "abc123"), true);
});

test("Studio content writes accept a file that was absent at read time and remains absent", () => {
  assert.equal(assertExpectedContentSha(null, null), true);
});

test("Studio content writes reject a file created after the original read", () => {
  assert.throws(
    () => assertExpectedContentSha(null, "new-blob"),
    { code: "STUDIO_WRITE_CONFLICT" }
  );
});

test("Studio content writes reject a stale blob SHA instead of overwriting newer data", () => {
  assert.throws(
    () => assertExpectedContentSha("old-blob", "new-blob"),
    { code: "STUDIO_WRITE_CONFLICT" }
  );
});

test("unconditional asset-file writes retain their existing behavior when no expected SHA is supplied", () => {
  assert.equal(assertExpectedContentSha(undefined, "any-current-blob"), true);
});
