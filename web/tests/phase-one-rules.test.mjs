import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  PHASE_ONE_WAVE_SIZES,
  PHASE_ONE_TOTAL_MONSTERS,
  INITIAL_ENERGY,
  MAX_ENERGY,
  MONSTER_KILL_ENERGY_REWARD,
  MUSHROOM_PICKUP_TTL_MS,
  RADISH_CONFIG,
  MUSHROOM_CONFIG,
  collectEnergy,
  isWaveComplete,
  isPhaseOneVictory,
  monsterArchetypeFor
} from "../game/rules/phaseOneRules.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const pauseScene = readFileSync(resolve(here, "../game/scenes/PauseScene.js"), "utf8");
const guide = readFileSync(resolve(here, "../app/how-to-play/page.js"), "utf8");
const gamePage = readFileSync(resolve(here, "../app/game/page.js"), "utf8");
const roadmap = readFileSync(resolve(here, "../../Documentation/GAME_DEVELOPMENT_ROADMAP.md"), "utf8");

test("five Phase 1 waves are strictly increasing and total exactly 100", () => {
  assert.deepEqual(PHASE_ONE_WAVE_SIZES, [10, 15, 20, 25, 30]);
  assert.equal(PHASE_ONE_TOTAL_MONSTERS, 100);
  assert.ok(PHASE_ONE_WAVE_SIZES.every((count, index) => index === 0 || count > PHASE_ONE_WAVE_SIZES[index - 1]));
});

test("initial energy, plant costs, HP and mushroom production are centralized", () => {
  assert.equal(INITIAL_ENERGY, 150);
  assert.equal(MAX_ENERGY, 300);
  assert.equal(MONSTER_KILL_ENERGY_REWARD, 8);
  assert.deepEqual(
    { cost: RADISH_CONFIG.cost, hp: RADISH_CONFIG.hp },
    { cost: 35, hp: 160 }
  );
  assert.deepEqual(
    { cost: MUSHROOM_CONFIG.cost, hp: MUSHROOM_CONFIG.hp, energy: MUSHROOM_CONFIG.energy, interval: MUSHROOM_CONFIG.productionInterval },
    { cost: 50, hp: 85, energy: 15, interval: 12_000 }
  );
  assert.equal(MUSHROOM_PICKUP_TTL_MS, 12_000);
});

test("energy collection never exceeds 300 and never grants negative energy", () => {
  assert.deepEqual(collectEnergy(100, 15), { energy: 115, collected: 15 });
  assert.deepEqual(collectEnergy(299, 15), { energy: 300, collected: 1 });
  assert.deepEqual(collectEnergy(300, 15), { energy: 300, collected: 0 });
  assert.deepEqual(collectEnergy(120, -20), { energy: 120, collected: 0 });
  assert.deepEqual(collectEnergy(-10, 15), { energy: 15, collected: 15 });
  assert.deepEqual(collectEnergy(400, 15), { energy: 300, collected: 0 });
});

test("mushroom is resource-only and its pickups expire after 12 seconds", () => {
  assert.match(scene, /livingPlantCount\(\) \{ return this\.plants\.filter\(\(p\) => p\.alive && p\.type === "radish"\)\.length; \}/);
  assert.match(scene, /if \(type === "radish"\) this\.hasPlantedDefender = true/);
  assert.match(scene, /this\.hasPlantedDefender && this\.livingPlantCount\(\) === 0/);
  assert.match(scene, /this\.time\.delayedCall\(MUSHROOM_PICKUP_TTL_MS/);
});

test("Mushroom production always creates a full collectible; the energy cap is applied at pickup", () => {
  const production = scene.slice(scene.indexOf("spawnMushroomEnergy(plant) {"), scene.indexOf("fireThorn(plant"));
  assert.match(production, /const amount = MUSHROOM_CONFIG\.energy;/);
  assert.doesNotMatch(production, /Math\.min\(MUSHROOM_CONFIG\.energy, MAX_ENERGY - this\.energy\)/);
  assert.match(production, /collectEnergy\(this\.energy, amount\)/);
});

test("resource Mushrooms never stop monsters; only living Radishes are defensive blockers", () => {
  const updateMonsters = scene.slice(scene.indexOf("  updateMonsters(dt, delta) {"), scene.indexOf("  updateProjectiles(dt) {"));
  assert.match(updateMonsters, /p\.alive && p\.type === "radish" && p\.row === monster\.row/);
  assert.doesNotMatch(updateMonsters, /p\.alive && p\.row === monster\.row/);
});

test("a farmhouse defeat aborts the rest of the current simulation frame", () => {
  const update = scene.slice(scene.indexOf("  update(_time, delta) {"), scene.indexOf("  // Sort world characters"));
  assert.match(update, /this\.updateMonsters\(dt, delta\);\s*if \(this\.gameOver\) return;\s*this\.updateDepthSorting\(\);/);
});

test("terminal results clean up pending Mushroom pickups and their expiry timers", () => {
  const create = scene.slice(scene.indexOf("  create() {"), scene.indexOf("  drawField() {"));
  const production = scene.slice(scene.indexOf("  spawnMushroomEnergy(plant) {"), scene.indexOf("  fireThorn(plant"));
  const endGame = scene.slice(scene.indexOf("  endGame(won) {"), scene.indexOf("  createGameOverButton("));
  assert.match(create, /this\.energyPickups = \[\]/);
  assert.match(production, /this\.energyPickups\.push\(token\)/);
  assert.match(production, /this\.energyPickups = this\.energyPickups\.filter\(\(pickup\) => pickup !== token\)/);
  assert.match(endGame, /token\.expiryTimer\.remove\(false\)/);
  assert.match(endGame, /this\.tweens\.killTweensOf\(token\)/);
  assert.match(endGame, /this\.energyPickups = \[\]/);
});

test("monster archetype composition introduces threats in measured waves", () => {
  for (let i = 0; i < 10; i += 1) {
    assert.equal(monsterArchetypeFor(1, i), "cave-brute");
    assert.equal(monsterArchetypeFor(2, i), "cave-brute");
  }
  for (const wave of [3, 4]) {
    assert.equal(monsterArchetypeFor(wave, 1), "dust-skitter");
    assert.equal(monsterArchetypeFor(wave, 0), "cave-brute");
    assert.equal(monsterArchetypeFor(wave, 4), "dust-skitter");
  }
  for (let i = 0; i < 30; i += 1) {
    const expected = (i + 1) % 5 === 0 ? "stonehide" : i % 3 === 1 ? "dust-skitter" : "cave-brute";
    assert.equal(monsterArchetypeFor(5, i), expected);
  }
});

test("all three monster profiles and Stonehide bracing damage reduction remain wired", () => {
  for (const kind of ["cave-brute", "dust-skitter", "stonehide"]) {
    assert.ok(scene.includes(`"${kind}": {`), `missing ${kind} profile`);
  }
  assert.match(scene, /return monster\.braced \? armorMultiplier \* 0\.55 : armorMultiplier/);
});

test("requestPlant uses the imported centralized plant configs", () => {
  const requestPlant = scene.slice(scene.indexOf("requestPlant(col, row) {"), scene.indexOf("updatePlantingMovement(dt) {"));
  assert.match(requestPlant, /this\.selectedPlant === "mushroom" \? MUSHROOM_CONFIG : RADISH_CONFIG/);
  assert.doesNotMatch(requestPlant, /\b(?:MUSHROOM|RADISH)\b(?!_CONFIG)/);
});

test("planting validates occupancy and energy before charging", () => {
  assert.match(scene, /if \(this\.energy < config\.cost \|\| this\.plants\.some\(\(p\) => p\.alive && p\.col === col && p\.row === row\)\)/);
  assert.match(scene, /this\.energy -= config\.cost/);
  assert.match(scene, /this\.plants\.push\(plant\)/);
  assert.match(scene, /this\.totalPlantsPlanted \+= 1/);
});

test("monster defeat is guarded against duplicate rewards", () => {
  assert.match(scene, /if \(monster\.hp > 0 \|\| !monster\.alive\) return/);
  assert.match(scene, /monster\.alive = false/);
  assert.match(scene, /this\.totalDefeatedMonsters \+= 1/);
  assert.match(scene, /this\.energy = Math\.min\(MAX_ENERGY, this\.energy \+ MONSTER_KILL_ENERGY_REWARD\)/);
});

test("a wave clears only after all scheduled monsters spawn and all living monsters die", () => {
  assert.equal(isWaveComplete(9, 10, 0), false);
  assert.equal(isWaveComplete(10, 10, 1), false);
  assert.equal(isWaveComplete(10, 10, 0), true);
  assert.equal(isWaveComplete(11, 10, 0), true);
});

test("victory is impossible before the final wave or before its last enemy is defeated", () => {
  assert.equal(isPhaseOneVictory(4, 5, 30, 30, 0), false);
  assert.equal(isPhaseOneVictory(5, 5, 29, 30, 0), false);
  assert.equal(isPhaseOneVictory(5, 5, 30, 30, 1), false);
  assert.equal(isPhaseOneVictory(5, 5, 30, 30, 0), true);
});

test("battle scene uses the shared pure rules rather than duplicate balancing constants", () => {
  assert.match(scene, /from "\.\.\/rules\/phaseOneRules\.mjs"/);
  assert.match(scene, /isPhaseOneVictory\(this\.wave, this\.totalWaves/);
  assert.match(scene, /resolveMonsterArchetype\(this\.wave, spawnIndex\)/);
  assert.match(scene, /collectEnergy\(this\.energy, amount\)/);
});

test("pause, terminal-state and retry guards remain present", () => {
  assert.match(scene, /if \(this\.gameOver \|\| this\.isPaused\) return/);
  assert.match(scene, /if \(this\.gameOver \|\| this\.isPaused \|\| !this\.scene\.isActive\(\)\) return/);
  assert.match(scene, /this\.scene\.restart\(\)/);
  assert.match(scene, /this\.stopBackgroundMusic\(\)/);
});

test("pause scene resumes, restarts and removes its keyboard listeners safely", () => {
  assert.match(pauseScene, /this\.scene\.resume\("BattleScene"\)/);
  assert.match(pauseScene, /battle\.resumeFromPause\(\)/);
  assert.match(pauseScene, /this\.scene\.start\("BattleScene"\)/);
  assert.match(pauseScene, /this\.input\.keyboard\.off\("keydown-ESC", this\.resumeBattle, this\)/);
  assert.match(pauseScene, /this\.input\.keyboard\.off\("keydown-P", this\.resumeBattle, this\)/);
  assert.match(scene, /this\.events\.once\("shutdown", \(\) => this\.input\.keyboard\.off\("keydown-P", this\.pauseGame, this\)\)/);
});

test("player guidance and roadmap match the current Phase 1 balance", () => {
  assert.match(guide, /15-energy collectible every 12 seconds/);
  assert.match(gamePage, /Collect glowing Mushroom energy/);
  assert.match(roadmap, /10 \/ 15 \/ 20 \/ 25 \/ 30/);
  assert.match(roadmap, /full 15-energy collectible per Mushroom every 12 seconds/);
  assert.match(roadmap, /Cave-brute, Dust-skitter, Stonehide/);
  assert.doesNotMatch(roadmap, /25 collectible energy per Mushroom every 8 seconds/i);
});
