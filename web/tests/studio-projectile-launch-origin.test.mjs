import test from "node:test";
import assert from "node:assert/strict";
import { getProjectileLaunchPoint } from "../game/studio/projectileTrajectory.mjs";

test("Studio launch offsets use the same unscaled world pixels as battle runtime", () => {
  assert.deepEqual(
    getProjectileLaunchPoint({ laneX: 105, laneY: 262.5, offsetX: 14, offsetY: -30 }),
    { x: 119, y: 232.5 }
  );
  assert.deepEqual(
    getProjectileLaunchPoint({ laneX: 105, laneY: 262.5, offsetX: -42, offsetY: 18 }),
    { x: 63, y: 280.5 }
  );
});
