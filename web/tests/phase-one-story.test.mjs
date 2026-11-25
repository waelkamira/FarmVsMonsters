import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { PHASE_ONE_DRAGON } from "../game/rules/phaseOneCombatContract.mjs";
import { advanceCooldown, selectDragonFireballTarget } from "../game/rules/combatSimulation.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const assets = JSON.parse(readFileSync(resolve(here, "../game/data/phase-one-story-assets.json"), "utf8"));

test("the dragon and captive princess enter during wave five and remain separate from ordinary monsters", () => {
  assert.match(scene, /this\.wave === this\.totalWaves && this\.spawnedThisWave === this\.waveSize\) this\.beginDragonEncounter\(\)/);
  assert.match(scene, /this\.phaseOneStoryState = "dragon"/);
  assert.match(scene, /this\.facing = 1;\s*this\.caveman\.scaleX = 1;/);
  assert.match(scene, /this\.createPrincessActor\(\);\s*this\.dragonBoss = \{/);
  assert.doesNotMatch(scene, /this\.monsters\.push\(this\.dragonBoss\)/);
});

test("the farmer automatically fires sling stones and the dragon has its own health bar", () => {
  assert.match(scene, /boss\.shotCooldown = advanceCooldown\(boss\.shotCooldown, delta\)/);
  assert.match(scene, /this\.playFarmerAction\("farmer-sling"\)/);
  assert.match(scene, /this\.damageDragonBoss\(PHASE_ONE_DRAGON\.farmerSlingDamage\)/);
  assert.match(scene, /drawDragonHealthBar\(\)/);
  assert.match(scene, /this\.princessActor\.setPosition\(boss\.sprite\.x \+ 78, boss\.sprite\.y \+ 96\)/);
});

test("dragon fireballs attack living plants or the farmhouse", () => {
  assert.match(scene, /boss\.attackCooldown = PHASE_ONE_DRAGON\.attackIntervalMs/);
  assert.match(scene, /const targetPlant = selectDragonFireballTarget\(this\.plants\)/);
  assert.match(scene, /this\.houseHealth = Math\.max\(0, this\.houseHealth - PHASE_ONE_DRAGON\.fireballDamageToFarm\)/);
});

test("Phase 1 cannot finish until all ordinary monsters and the separate dragon are defeated", () => {
  const finish = scene.slice(scene.indexOf("  tryFinishPhaseOne() {"), scene.indexOf("  beginPrincessRescue() {"));
  assert.match(finish, /this\.spawnedThisWave < this\.waveSize/);
  assert.match(finish, /this\.monsters\.some\(\(monster\) => monster\.alive\)/);
  assert.match(finish, /this\.dragonBoss\?\.alive/);
  assert.match(scene, /if \(this\.dragonBoss\) \{[\s\S]*?this\.tryFinishPhaseOne\(\)/);
});

test("the rescue sequence picks up the princess, carries her home, then opens the victory screen", () => {
  const rescue = scene.slice(scene.indexOf("  beginPrincessRescue() {"), scene.indexOf("  readAudioPreference(key, fallback) {"));
  assert.match(rescue, /this\.caveman\.add\(this\.princessActor\)/);
  assert.match(rescue, /"farmer-rescue"/);
  assert.match(rescue, /"phase-one-princess-rescued"/);
  assert.match(rescue, /"farmer-carry"/);
  assert.match(rescue, /x: 82/);
  assert.match(rescue, /this\.endGame\(true\)/);
  assert.match(scene, /"phase-one-emblem"/);
});

test("story artwork remains a documented contract but missing files are not queued by Phaser", () => {
  assert.equal(assets.version, 1);
  assert.equal(assets.runtimeEnabled, false);
  const keys = assets.assets.map((asset) => asset.key);
  for (const key of ["farmer-sling", "farmer-rescue", "farmer-carry", "dragon-boss", "phase-one-princess-captive", "phase-one-princess-rescued", "phase-one-emblem"]) {
    assert.ok(keys.includes(key), "missing story asset contract: " + key);
  }
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
