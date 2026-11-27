import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const assets = JSON.parse(readFileSync(resolve(here, "../game/data/phase-one-story-assets.json"), "utf8"));
const manifest = JSON.parse(readFileSync(resolve(here, "../public/assets/asset-manifest.json"), "utf8"));

test("Stage 1 ends after all five ordinary Monster 01 waves without a boss encounter", () => {
  assert.match(scene, /if \(isPhaseOneVictory\(this\.wave, this\.totalWaves, this\.spawnedThisWave, this\.waveSize, this\.monsters\.length\)\) \{\s*this\.endGame\(true\)/);
  assert.doesNotMatch(scene, /dragon|princessActor|beginPrincessRescue|PHASE_ONE_DRAGON/i);
});

test("retired dragon and rescue art are absent from the story asset contract", () => {
  assert.equal(assets.version, 1);
  assert.equal(assets.runtimeEnabled, false);
  assert.equal(assets.assets.some((asset) => /dragon|princess|sling|rescue|carry/i.test(asset.key + " " + asset.path + " " + asset.purpose)), false);
  assert.equal(manifest.assets.some((asset) => /dragon|hyena/i.test(asset.key + " " + asset.url)), false);
});

test("client victory remains a playtest result and never persists campaign rewards", () => {
  assert.doesNotMatch(scene, /unlockNextStage\(window\.localStorage/);
  assert.doesNotMatch(scene, /unlockPlantReward\(window\.localStorage/);
  assert.match(scene, /A local victory is a playtest result/);
  assert.match(scene, /LOCAL PLAYTEST · PROGRESS AND REWARDS NOT SAVED/);
  assert.doesNotMatch(scene, /syncProgressAfterVictory\(\)/);
});
