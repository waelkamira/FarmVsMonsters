import test from "node:test";
import assert from "node:assert/strict";
import { createStudioAnimationProfile, validateStudioAnimationProfile } from "../game/studio/animationProfiles.mjs";

test("creates a bounded default profile for a nine-frame sheet", () => {
  const profile = createStudioAnimationProfile({}, 9);
  assert.deepEqual(profile.idle, { startFrame: 0, endFrame: 0, fps: 6, loop: true });
  assert.deepEqual(profile.attack, { startFrame: 0, endFrame: 8, fps: 12, loop: false });
});
test("persists editable idle and attack frame ranges and speeds", () => {
  const profile = createStudioAnimationProfile({
    idleStartFrame: 0, idleEndFrame: 2, idleFps: 5, idleLoop: true,
    attackStartFrame: 3, attackEndFrame: 8, attackFps: 18
  }, 9);
  assert.equal(profile.idle.endFrame, 2);
  assert.equal(profile.attack.startFrame, 3);
  assert.equal(profile.attack.fps, 18);
});
test("rejects frame indexes outside the actual sheet", () => {
  assert.equal(validateStudioAnimationProfile({ attackEndFrame: 9 }, 9).valid, false);
  assert.equal(validateStudioAnimationProfile({ idleStartFrame: 4, idleEndFrame: 2 }, 9).valid, false);
});
test("rejects unsupported frame counts and FPS", () => {
  assert.equal(validateStudioAnimationProfile({}, 0).valid, false);
  assert.equal(validateStudioAnimationProfile({ attackFps: 31 }, 9).valid, false);
  assert.equal(validateStudioAnimationProfile({ idleFps: 0 }, 9).valid, false);
});
