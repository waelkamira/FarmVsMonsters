import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStudioAnimationProfile } from "../game/studio/animationProfiles.mjs";

test("Studio animation profiles preserve explicit per-frame durations", () => {
  const profile = createStudioAnimationProfile({
    attack: { startFrame: 0, endFrame: 3, fps: 12, frameDurationsMs: [190, 190, 70, 70] }
  }, 4);
  assert.deepEqual(profile.attack.frameDurationsMs, [190, 190, 70, 70]);
});

test("Studio animation profiles reject mismatched or unsafe frame durations", () => {
  assert.throws(() => createStudioAnimationProfile({
    attack: { startFrame: 0, endFrame: 2, frameDurationsMs: [180, 180] }
  }, 3), /one duration for each frame/);
  assert.throws(() => createStudioAnimationProfile({
    attack: { startFrame: 0, endFrame: 1, frameDurationsMs: [180, 2501] }
  }, 2), /between 16 and 2000/);
});

test("BattleScene applies an 80ms white hitstop and forwards per-frame timing to Phaser", async () => {
  const source = await readFile(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  assert.match(source, /applyMonsterHitStop\(monster, 80\)/);
  assert.match(source, /target\.anims\.pause\(\)/);
  assert.match(source, /target\.setTintFill\(0xffffff\)/);
  assert.match(source, /clip\.frameDurationsMs\[index\]/);
});

test("plant bite reactions use a local 80ms white hitstop before the red bite pulse", async () => {
  const source = await readFile(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  assert.match(source, /applyPlantHitStop\(plant, 80\)/);
  assert.match(source, /plant\.view\.setAlpha\(0\.72\)/);
  assert.match(source, /this\.time\.delayedCall\(80, \(\) => \{/);
  assert.match(source, /target\.setTintFill\?\.\(0xffffff\)/);
});

test("dragon boss impact pauses only its sprite for 80ms and restores animation", async () => {
  const source = await readFile(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  assert.match(source, /sprite\.setTintFill\?\.\(0xffffff\)/);
  assert.match(source, /this\.time\.delayedCall\(80, \(\) => \{/);
  assert.match(source, /boss\.alive && sprite\.anims\?\.isPaused/);
});

test("monster hitstop begins after the impact animation is selected", async () => {
  const source = await readFile(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  const impactClip = source.indexOf('this.playHyenaAnimation(monster, monster.studioRig ? "hyena-hit"');
  const hitstop = source.indexOf("this.applyMonsterHitStop(monster, 80)", impactClip);
  assert.ok(impactClip >= 0);
  assert.ok(hitstop > impactClip);
});

test("monster hitstop suspends only the struck monster's simulation step", async () => {
  const source = await readFile(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  assert.match(source, /if \(monster\.hitStopTimer\) continue;/);
});

test("BattleScene applies bounded randomized pitch to repeated sound effects", async () => {
  const source = await readFile(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  assert.match(source, /rate: PhaserMath\.FloatBetween\(0\.9, 1\.1\)/);
});

test("combat impacts use squash and stretch and camera juice without changing combat rules", async () => {
  const source = await readFile(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  assert.match(source, /applySquashStretch\(sprite/);
  assert.match(source, /applySquashStretch\(squashTarget/);
  assert.match(source, /camera\.shake\(heavy \? 130 : 90/);
  assert.match(source, /zoomPunch/);
});

test("monster arrivals and energy pickups use elastic overshoot and settle", async () => {
  const source = await readFile(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  assert.match(source, /scaleX: finalScaleX \* 1\.12/);
  assert.match(source, /targets: token, scale: 1\.2/);
  assert.match(source, /duration: 95, ease: "Sine\.easeOut"/);
});

test("moving monsters create bounded footstep dust and skitter jumps squash on landing", async () => {
  const source = await readFile(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  assert.match(source, /monster\.dustTimer = monster\.kind === "dust-skitter" \? 210 : 360/);
  assert.match(source, /if \(jumpWillLand\)/);
  assert.match(source, /createFootstepDust\(monster\.x, monster\.y \+ 6/);
});

test("procedural VFX registry supports dust puffs and rotating dizzy stars", async () => {
  const registry = await readFile(new URL("../game/vfx/createDefaultVFXRegistry.mjs", import.meta.url), "utf8");
  const renderer = await readFile(new URL("../game/vfx/rendering/VFXRenderer.mjs", import.meta.url), "utf8");
  const manager = await readFile(new URL("../game/vfx/VFXManager.mjs", import.meta.url), "utf8");
  assert.match(registry, /register\("dust-puff"/);
  assert.match(registry, /register\("dizzy-stars"/);
  assert.match(renderer, /config\.shape === "star"/);
  assert.match(manager, /angle: Number\(config\.rotationDegrees\)/);
});
