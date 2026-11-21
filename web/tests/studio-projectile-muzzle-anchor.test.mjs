import test from "node:test";
import assert from "node:assert/strict";
import { getProjectileTrajectoryOffset } from "../game/studio/projectileTrajectory.mjs";

test("custom trajectory always begins at the muzzle regardless of first control point coordinates", () => {
  assert.deepEqual(
    getProjectileTrajectoryOffset({ type: "custom", progress: 0, points: [
      { progress: 0, x: 36, y: -52 },
      { progress: 0.5, x: 80, y: 24 },
      { progress: 1, x: 0, y: 0 }
    ] }),
    { x: 0, y: 0 }
  );
});
