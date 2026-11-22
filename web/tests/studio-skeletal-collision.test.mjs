import test from "node:test";
import assert from "node:assert/strict";
import {
  circleIntersectsOrientedRectangle,
  orientedRectanglesOverlap
} from "../game/studio/skeletalCollision.mjs";

test("oriented rectangles detect overlap and separation on the separating axes", () => {
  const first = { x: 0, y: 0, width: 20, height: 10, rotation: 0 };
  assert.equal(orientedRectanglesOverlap(first, { x: 12, y: 0, width: 10, height: 10, rotation: 0 }), true);
  assert.equal(orientedRectanglesOverlap(first, { x: 16, y: 0, width: 10, height: 10, rotation: 0 }), false);
});

test("oriented rectangles account for rotation rather than axis-aligned bounds", () => {
  const longThin = { x: 0, y: 0, width: 40, height: 4, rotation: 45 };
  assert.equal(orientedRectanglesOverlap(longThin, { x: 0, y: 0, width: 4, height: 40, rotation: 45 }), true);
  assert.equal(orientedRectanglesOverlap(longThin, { x: 0, y: 24, width: 4, height: 4, rotation: 45 }), false);
});

test("circle collision handles rotated rectangles and edge tangency", () => {
  const rectangle = { x: 10, y: 10, width: 20, height: 8, rotation: 45 };
  assert.equal(circleIntersectsOrientedRectangle({ x: 10, y: 10, radius: 0 }, rectangle), true);
  assert.equal(circleIntersectsOrientedRectangle({ x: 10, y: 25, radius: 2 }, rectangle), false);
  assert.equal(circleIntersectsOrientedRectangle({ x: 10, y: 10, radius: 0 }, { ...rectangle, rotation: 0 }), true);
});

test("collision helpers reject invalid geometry instead of silently accepting it", () => {
  assert.throws(() => orientedRectanglesOverlap({ x: 0, y: 0, width: 0, height: 2 }, { x: 0, y: 0, width: 2, height: 2 }), /positive dimensions/);
  assert.throws(() => circleIntersectsOrientedRectangle({ x: 0, y: 0, radius: -1 }, { x: 0, y: 0, width: 2, height: 2 }), /non-negative radius/);
});
