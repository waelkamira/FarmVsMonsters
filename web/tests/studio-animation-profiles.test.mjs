import test from "node:test";
import assert from "node:assert/strict";
import { createStudioAnimationProfile, validateStudioAnimationProfile } from "../game/studio/animationProfiles.mjs";

test("creates a safe default idle and attack animation for a sprite sheet", () => {
  const profile = createStudioAnimationProfile(null, 9);
  assert.deepEqual(profile.idle, { startFrame: 0, endFrame: 0, fps: 6, loop: true });
  assert.deepEqual(profile.move, { startFrame: 0, endFrame: 8, fps: 10, loop: true });
  assert.deepEqual(profile.attack, { startFrame: 0, endFrame: 8, fps: 12, loop: false, frameDurationsMs: [180, 180, 70, 70, 70, 70, 70, 70, 70] });
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
  assert.deepEqual(profile.attack.frameDurationsMs, [180, 180, 70, 70, 70, 70]);
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

test("supports per-frame durations for expressive impact and recovery timing", () => {
  const profile = createStudioAnimationProfile({
    attack: { startFrame: 0, endFrame: 3, fps: 12, frameDurationsMs: [190, 190, 70, 70] }
  }, 4);
  assert.deepEqual(profile.attack.frameDurationsMs, [190, 190, 70, 70]);
});
test("rejects variable frame timing with the wrong number of entries or unsafe durations", () => {
  assert.equal(validateStudioAnimationProfile({
    attack: { startFrame: 0, endFrame: 2, frameDurationsMs: [180, 180] }
  }, 3).valid, false);
  assert.equal(validateStudioAnimationProfile({
    attack: { startFrame: 0, endFrame: 1, frameDurationsMs: [180, 2501] }
  }, 2).valid, false);
});
