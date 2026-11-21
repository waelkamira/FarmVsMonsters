import test from "node:test";
import assert from "node:assert/strict";
import { getSpriteFrameRectangles, inferSpriteGrid } from "../game/studio/spriteSheetGrid.mjs";

test("infers a square 3×3 grid for a square nine-frame sheet", () => {
  assert.deepEqual(inferSpriteGrid(900, 900, 9), { rows: 3, columns: 3 });
});

test("infers a horizontal strip when its image dimensions support that layout", () => {
  assert.deepEqual(inferSpriteGrid(2400, 100, 24), { rows: 1, columns: 24 });
});

test("supports a single-frame image", () => {
  assert.deepEqual(inferSpriteGrid(512, 256, 1), { rows: 1, columns: 1 });
});

test("rejects invalid frame counts and image dimensions", () => {
  assert.throws(() => inferSpriteGrid(100, 100, 0), /between 1 and 24/);
  assert.throws(() => inferSpriteGrid(0, 100, 1), /positive/);
  assert.throws(() => inferSpriteGrid(100, 100, 25), /between 1 and 24/);
});

test("crops non-divisible image dimensions into a complete, gap-free grid", () => {
  const frames = getSpriteFrameRectangles(1001, 701, 3, 3);
  assert.equal(frames.length, 9);
  assert.deepEqual(frames[0], { index: 0, x: 0, y: 0, width: 333, height: 233 });
  assert.deepEqual(frames[8], { index: 8, x: 667, y: 467, width: 334, height: 234 });
  assert.equal(frames.reduce((area, frame) => area + frame.width * frame.height, 0), 1001 * 701);
});

test("creates a distinct rectangle for every frame in a 24-frame sheet", () => {
  const frames = getSpriteFrameRectangles(1201, 801, 4, 6);
  assert.equal(frames.length, 24);
  assert.equal(new Set(frames.map(frame => frame.index)).size, 24);
  assert.equal(frames.reduce((area, frame) => area + frame.width * frame.height, 0), 1201 * 801);
});
