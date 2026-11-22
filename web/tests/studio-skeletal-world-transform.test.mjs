import test from "node:test";
import assert from "node:assert/strict";
import { transformRigPointToWorld } from "../game/studio/skeletalWorldTransform.mjs";

test("transforms a rig attachment through parent position, non-uniform scale, and rotation", () => {
  const point = { x: 10, y: 5, rotation: 15, scaleX: 1, scaleY: 1 };
  const parent = { x: 100, y: 200, scaleX: 2, scaleY: 3, rotation: Math.PI / 2 };
  const world = transformRigPointToWorld(point, parent);
  assert.ok(Math.abs(world.x - 85) < 0.0001);
  assert.ok(Math.abs(world.y - 220) < 0.0001);
  assert.ok(Math.abs(world.rotation - 105) < 0.0001);
  assert.equal(world.scaleX, 2);
  assert.equal(world.scaleY, 3);
});

test("transforms default unit scale and zero rotation without changing local coordinates", () => {
  const world = transformRigPointToWorld({ x: -12, y: 9 }, { x: 30, y: 40 });
  assert.equal(world.x, 18);
  assert.equal(world.y, 49);
  assert.equal(world.rotation, 0);
  assert.equal(world.scaleX, 1);
  assert.equal(world.scaleY, 1);
});

test("rejects non-finite attachment or parent transform values", () => {
  assert.throws(() => transformRigPointToWorld({ x: 1, y: 2 }, { x: 0, y: 0, rotation: NaN }), /finite numbers/);
});
