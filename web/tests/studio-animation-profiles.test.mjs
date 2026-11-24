import test from "node:test";
import assert from "node:assert/strict";
import { createStudioAnimationProfile, validateStudioAnimationProfile } from "../game/studio/animationProfiles.mjs";

test("creates a safe default idle and attack animation for a sprite sheet", () => {
  const profile = createStudioAnimationProfile(null, 9);
  assert.equal(profile.speedMultiplier, 1);
  assert.deepEqual(profile.idle, { startFrame: 0, endFrame: 0, fps: 6, loop: true });
  assert.deepEqual(profile.move, { startFrame: 0, endFrame: 8, fps: 10, loop: true });
  assert.deepEqual(profile.attack, { startFrame: 0, endFrame: 8, fps: 12, loop: false });
});
test("retains custom frame ranges and frame rates", () => {
  const profile = createStudioAnimationProfile({
    idle: { startFrame: 1, endFrame: 2, fps: 8 },
    attack: { startFrame: 3, endFrame: 8, fps: 18 }
  }, 9);
  assert.equal(profile.idle.startFrame, 1);
  assert.equal(profile.idle.loop, true);
  assert.equal(profile.attack.fps, 18);
  assert.equal(profile.attack.loop, false);
});
test("supports a per-asset animation speed multiplier and rejects values outside its limits", () => {
  assert.equal(createStudioAnimationProfile({ speedMultiplier: 3 }, 9).speedMultiplier, 3);
  assert.equal(createStudioAnimationProfile({ speedMultiplier: 1.25 }, 9).speedMultiplier, 1.25);
  assert.equal(validateStudioAnimationProfile({ speedMultiplier: 0.09 }, 9).valid, false);
  assert.equal(validateStudioAnimationProfile({ speedMultiplier: 5.01 }, 9).valid, false);
});
test("rejects frame indices outside the actual sprite sheet", () => {
  assert.equal(validateStudioAnimationProfile({ attack: { startFrame: 0, endFrame: 9 } }, 9).valid, false);
  assert.equal(validateStudioAnimationProfile({ idle: { startFrame: -1, endFrame: 0 } }, 9).valid, false);
});
test("rejects reversed frame ranges and unsupported FPS", () => {
  assert.equal(validateStudioAnimationProfile({ attack: { startFrame: 6, endFrame: 3 } }, 9).valid, false);
  assert.equal(validateStudioAnimationProfile({ idle: { fps: 31 } }, 9).valid, false);
});
test("supports a single-frame sprite without creating an invalid range", () => {
  const profile = createStudioAnimationProfile(null, 1);
  assert.equal(profile.attack.startFrame, 0);
  assert.equal(profile.attack.endFrame, 0);
});
