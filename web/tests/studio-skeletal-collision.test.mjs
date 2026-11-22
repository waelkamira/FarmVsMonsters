import test from "node:test";
import assert from "node:assert/strict";
import {
  circleIntersectsConvexPolygon,
  convexPolygonsOverlap,
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
  const tangent = { x: 10 + 12 * Math.SQRT1_2, y: 10 + 12 * Math.SQRT1_2, radius: 2 };
  assert.equal(circleIntersectsOrientedRectangle(tangent, rectangle), true);
  assert.equal(circleIntersectsOrientedRectangle({ x: 10, y: 25, radius: 2 }, rectangle), false);
  assert.equal(circleIntersectsOrientedRectangle({ x: 10, y: 10, radius: 0 }, { ...rectangle, rotation: 0 }), true);
});

test("collision helpers reject invalid geometry instead of silently accepting it", () => {
  assert.throws(() => orientedRectanglesOverlap({ x: 0, y: 0, width: 0, height: 2 }, { x: 0, y: 0, width: 2, height: 2 }), /positive dimensions/);
  assert.throws(() => orientedRectanglesOverlap({ x: 0, y: 0, width: 2, height: 2, rotation: "invalid" }, { x: 0, y: 0, width: 2, height: 2 }), /finite rotation/);
  assert.throws(() => circleIntersectsOrientedRectangle({ x: 0, y: 0, radius: -1 }, { x: 0, y: 0, width: 2, height: 2 }), /non-negative radius/);
});

test("convex polygon SAT handles hitboxes skewed by non-uniform parent scaling", () => {
  const skewed = [{ x: 0, y: -10 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 0, y: 0 }];
  assert.equal(convexPolygonsOverlap(skewed, [{ x: 10, y: -5 }, { x: 25, y: -5 }, { x: 25, y: 5 }, { x: 10, y: 5 }]), true);
  assert.equal(convexPolygonsOverlap(skewed, [{ x: 30, y: -5 }, { x: 40, y: -5 }, { x: 40, y: 5 }, { x: 30, y: 5 }]), false);
});

test("projectile circles intersect transformed convex hitbox polygons", () => {
  const polygon = [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 0, y: 10 }];
  assert.equal(circleIntersectsConvexPolygon({ x: 10, y: 5, radius: 0 }, polygon), true);
  assert.equal(circleIntersectsConvexPolygon({ x: 22, y: 5, radius: 2 }, polygon), true);
  assert.equal(circleIntersectsConvexPolygon({ x: 24, y: 5, radius: 2 }, polygon), false);
});
