import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const assets = JSON.parse(readFileSync(resolve(here, "../game/data/phase-one-story-assets.json"), "utf8"));

test("Stage 1 completes after all five ordinary waves without a boss encounter", () => {
  assert.match(scene, /if \(this\.stageNumber === 1\) this\.tryFinishPhaseOne\(\)/);
  assert.match(scene, /this\.spawnedThisWave < this\.waveSize/);
  assert.match(scene, /this\.monsters\.some\(\(monster\) => monster\.alive\)/);
  assert.match(scene, /this\.createPrincessActor\(\);\s*this\.beginPrincessRescue\(\)/);
  assert.doesNotMatch(scene, /Boss|Fireball|Sling|begin[A-Z]*Encounter/);
});

test("the farmer rescue sequence remains playable after the final wave", () => {
  const rescue = scene.slice(scene.indexOf("  beginPrincessRescue() {"), scene.indexOf("  readAudioPreference(key, fallback) {"));
  assert.match(rescue, /this\.caveman\.add\(this\.princessActor\)/);
  assert.match(rescue, /"farmer-rescue"/);
  assert.match(rescue, /"phase-one-princess-rescued"/);
  assert.match(rescue, /"farmer-carry"/);
  assert.match(rescue, /this\.endGame\(true\)/);
});

test("story artwork contract contains only farmer, captive, and stage celebration assets", () => {
  assert.equal(assets.version, 1);
  assert.equal(assets.runtimeEnabled, false);
  const keys = assets.assets.map((asset) => asset.key);
  for (const key of ["farmer-rescue", "farmer-carry", "phase-one-princess-captive", "phase-one-princess-rescued", "phase-one-emblem"]) {
    assert.ok(keys.includes(key), "missing story asset contract: " + key);
  }
  assert.equal(keys.some((key) => key.toLowerCase().includes("boss")), false);
  const preload = scene.slice(scene.indexOf("  preload() {"), scene.indexOf("  create() {"));
  for (const asset of assets.assets) {
    assert.ok(asset.path.startsWith("/assets/"));
    assert.equal(asset.runtimeEnabled, false);
    assert.equal(asset.status, "awaiting-art");
    assert.equal(preload.includes(asset.path), false, asset.key + " must not be requested before the file exists");
  }
  assert.match(preload, /Phase 1 story artwork is not in the asset bundle yet/);
  assert.match(scene, /Optional sheets are validated independently/);
});

test("client victory remains a playtest result and never persists campaign rewards", () => {
  assert.doesNotMatch(scene, /unlockNextStage\(window\.localStorage/);
  assert.doesNotMatch(scene, /unlockPlantReward\(window\.localStorage/);
  assert.match(scene, /A local victory is a playtest result/);
  assert.match(scene, /LOCAL PLAYTEST · PROGRESS AND REWARDS NOT SAVED/);
  assert.doesNotMatch(scene, /syncProgressAfterVictory\(\)/);
});
