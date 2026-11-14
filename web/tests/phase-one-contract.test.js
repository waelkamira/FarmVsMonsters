import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const guide = readFileSync(resolve(here, "../app/how-to-play/page.js"), "utf8");
const gamePage = readFileSync(resolve(here, "../app/game/page.js"), "utf8");
const roadmap = readFileSync(resolve(here, "../../Documentation/GAME_DEVELOPMENT_ROADMAP.md"), "utf8");

test("five Phase 1 waves are strictly increasing and total 100", () => {
  const match = scene.match(/const PHASE_ONE_WAVE_SIZES = \[([^\]]+)\]/);
  assert.ok(match, "wave schedule must exist");
  const waves = match[1].split(",").map((value) => Number(value.trim()));
  assert.deepEqual(waves, [10, 15, 20, 25, 30]);
  assert.equal(waves.reduce((sum, count) => sum + count, 0), 100);
  assert.ok(waves.every((count, index) => index === 0 || count > waves[index - 1]));
});

test("resource economy constants and collection cap stay aligned", () => {
  assert.match(scene, /this\.energy = 150/);
  assert.match(scene, /label: "Radish", cost: 35, hp: 160/);
  assert.match(scene, /label: "Energy Mushroom", cost: 50, hp: 85, energy: 15, productionInterval: 12000/);
  assert.match(scene, /this\.time\.delayedCall\(12000/);
  assert.match(scene, /Math\.min\(amount, Math\.max\(0, 300 - this\.energy\)\)/);
  assert.match(scene, /this\.energy = Math\.min\(300, this\.energy \+ 8\)/);
  assert.match(guide, /15-energy collectible every 12 seconds/);
  assert.match(gamePage, /Collect glowing Mushroom energy/);
});

test("Mushrooms do not count as defenders; only Radishes enable emergency combat", () => {
  assert.match(scene, /livingPlantCount\(\) \{ return this\.plants\.filter\(\(p\) => p\.alive && p\.type === "radish"\)\.length; \}/);
  assert.match(scene, /if \(type === "radish"\) this\.hasPlantedDefender = true/);
  assert.match(scene, /this\.hasPlantedDefender && this\.livingPlantCount\(\) === 0/);
});

test("all monster archetypes and Stonehide armor behavior remain present", () => {
  for (const kind of ["cave-brute", "dust-skitter", "stonehide"]) {
    assert.ok(scene.includes(`"${kind}": {`), `missing ${kind} profile`);
  }
  assert.match(scene, /return "stonehide"/);
  assert.match(scene, /return "dust-skitter"/);
  assert.match(scene, /return monster\.braced \? armorMultiplier \* 0\.55 : armorMultiplier/);
});

test("planting revalidates cell occupancy and energy before charging", () => {
  assert.match(scene, /if \(this\.energy < config\.cost \|\| this\.plants\.some\(\(p\) => p\.alive && p\.col === col && p\.row === row\)\)/);
  assert.match(scene, /this\.energy -= config\.cost/);
  assert.match(scene, /this\.plants\.push\(plant\)/);
  assert.match(scene, /this\.totalPlantsPlanted \+= 1/);
});

test("monster death is idempotent, rewards energy and updates defeat counters", () => {
  assert.match(scene, /if \(monster\.hp > 0 \|\| !monster\.alive\) return/);
  assert.match(scene, /monster\.alive = false/);
  assert.match(scene, /this\.totalDefeatedMonsters \+= 1/);
  assert.match(scene, /this\.monsters = this\.monsters\.filter\(\(m\) => m\.alive\)/);
});

test("victory waits for all scheduled spawns and all living monsters to clear", () => {
  assert.match(scene, /this\.spawnedThisWave < this\.waveSize \|\| this\.monsters\.length > 0/);
  assert.match(scene, /this\.wave <= this\.totalWaves/);
  assert.match(scene, /this\.endGame\(true\)/);
});

test("pause, terminal-state and retry guards are present", () => {
  assert.match(scene, /if \(this\.gameOver \|\| this\.isPaused\) return/);
  assert.match(scene, /if \(this\.gameOver \|\| this\.isPaused \|\| !this\.scene\.isActive\(\)\) return/);
  assert.match(scene, /this\.scene\.restart\(\)/);
  assert.match(scene, /this\.stopBackgroundMusic\(\)/);
});

test("roadmap matches live Phase 1 schedule, economy and monster roster", () => {
  assert.match(roadmap, /10 \/ 15 \/ 20 \/ 25 \/ 30/);
  assert.match(roadmap, /15 collectible energy per Mushroom every 12 seconds/);
  assert.match(roadmap, /Cave-brute, Dust-skitter, Stonehide/);
  assert.doesNotMatch(roadmap, /25 collectible energy per Mushroom every 8 seconds/i);
});
