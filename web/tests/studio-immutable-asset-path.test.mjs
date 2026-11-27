import test from "node:test";
import assert from "node:assert/strict";
import { createImmutableAssetPath } from "../game/studio/immutableAssetPath.mjs";

test("the same asset bytes produce the same immutable path", () => {
  const bytes = Buffer.from("bamboo sprite v1");
  assert.equal(
    createImmutableAssetPath("plants", "bamboo-level-1", ".png", bytes),
    createImmutableAssetPath("plants", "bamboo-level-1", ".png", bytes)
  );
});

test("replacing asset bytes produces a different path instead of overwriting the old file", () => {
  const first = createImmutableAssetPath("plants", "bamboo-level-1", ".png", Buffer.from("sprite v1"));
  const second = createImmutableAssetPath("plants", "bamboo-level-1", ".png", Buffer.from("sprite v2"));
  assert.notEqual(first, second);
  assert.match(first, /^plants\/bamboo-level-1-[a-f0-9]{64}\.png$/);
  assert.match(second, /^plants\/bamboo-level-1-[a-f0-9]{64}\.png$/);
});

test("projectile assets receive independent immutable paths", () => {
  const path = createImmutableAssetPath(
    "projectiles/plants",
    "bamboo-level-1-projectile",
    ".webp",
    Buffer.from("projectile")
  );
  assert.match(path, /^projectiles\/plants\/bamboo-level-1-projectile-[a-f0-9]{64}\.webp$/);
});

test("invalid path segments and empty content are rejected", () => {
  assert.throws(() => createImmutableAssetPath("../plants", "plant", ".png", Buffer.from("x")));
  assert.throws(() => createImmutableAssetPath("plants", "../plant", ".png", Buffer.from("x")));
  assert.throws(() => createImmutableAssetPath("plants", "plant", ".png", Buffer.alloc(0)));
});
