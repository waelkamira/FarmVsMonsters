import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const assets = JSON.parse(readFileSync(resolve(here, "../game/data/phase-one-story-assets.json"), "utf8"));

test("the Phase 1 dragon enters at the beginning of wave five and remains separate from ordinary monsters", () => {
  assert.match(scene, /if \(this\.wave === 5 && this\.spawnedThisWave === 2\) this\.beginDragonEncounter\(\)/);
  assert.match(scene, /this\.phaseOneStoryState = "dragon"/);
  assert.match(scene, /this\.dragonBoss = \{/);
  assert.doesNotMatch(scene, /this\.monsters\.push\(this\.dragonBoss\)/);
});

test("the farmer automatically fires sling stones and the dragon has its own health bar", () => {
  assert.match(scene, /boss\.shotCooldown -= delta/);
  assert.match(scene, /this\.playFarmerAction\("farmer-sling"\)/);
  assert.match(scene, /this\.damageDragonBoss\(25\)/);
  assert.match(scene, /drawDragonHealthBar\(\)/);
});

test("dragon fireballs attack living plants or the farmhouse", () => {
  assert.match(scene, /boss\.attackCooldown = 3900/);
  assert.match(scene, /const targetPlant = this\.plants\.filter\(\(plant\) => plant\.alive\)/);
  assert.match(scene, /this\.houseHealth = Math\.max\(0, this\.houseHealth - 12\)/);
});

test("Phase 1 cannot finish until all ordinary monsters and the separate dragon are defeated", () => {
  const finish = scene.slice(scene.indexOf("  tryFinishPhaseOne() {"), scene.indexOf("  beginPrincessRescue() {"));
  assert.match(finish, /this\.spawnedThisWave < this\.waveSize/);
  assert.match(finish, /this\.monsters\.some\(\(monster\) => monster\.alive\)/);
  assert.match(finish, /this\.dragonBoss\?\.alive/);
  assert.match(scene, /if \(this\.dragonBoss\) \{\s*this\.tryFinishPhaseOne\(\)/);
});

test("the rescue sequence picks up the princess, carries her home, then opens the victory screen", () => {
  const rescue = scene.slice(scene.indexOf("  beginPrincessRescue() {"), scene.indexOf("  readAudioPreference(key, fallback) {"));
  assert.match(rescue, /this\.caveman\.add\(this\.princessActor\)/);
  assert.match(rescue, /"farmer-rescue"/);
  assert.match(rescue, /"farmer-carry"/);
  assert.match(rescue, /x: 82/);
  assert.match(rescue, /this\.endGame\(true\)/);
  assert.match(scene, /"phase-one-emblem"/);
});

test("story artwork uses explicit user-owned asset paths and optional animation sheets", () => {
  assert.equal(assets.version, 1);
  const keys = assets.assets.map((asset) => asset.key);
  for (const key of ["farmer-sling", "farmer-rescue", "farmer-carry", "dragon-boss", "phase-one-princess", "phase-one-emblem"]) {
    assert.ok(keys.includes(key), "missing story asset contract: " + key);
  }
  for (const asset of assets.assets) assert.ok(asset.path.startsWith("/assets/"));
  assert.match(scene, /Optional sheets are validated independently/);
});
