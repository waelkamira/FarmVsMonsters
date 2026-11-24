import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { selectLaneBlocker } from "../game/rules/combatSimulation.mjs";
import { PHASE_ONE_MONSTERS, PHASE_ONE_REWARDS, getStonehideIncomingDamageMultiplier } from "../game/rules/phaseOneCombatContract.mjs";
import { dirname, resolve } from "node:path";
import {
  PHASE_ONE_WAVE_SIZES,
  PHASE_ONE_TOTAL_MONSTERS,
  ordinaryMonsterCountForStage,
  INITIAL_ENERGY,
  MAX_ENERGY,
  MONSTER_KILL_COIN_REWARD,
  MUSHROOM_PICKUP_TTL_MS,
  PROGRESSION_STORAGE_KEY,
  normalizeCoins,
  loadSavedCoins,
  saveCoins,
  RADISH_CONFIG,
  MUSHROOM_CONFIG,
  collectEnergy,
  isWaveComplete,
  isPhaseOneVictory,
  monsterArchetypeFor,
  purchasePlant,
  CAMPAIGN_PROGRESS_KEY,
  CAMPAIGN_STAGE_COUNT,
  loadUnlockedStage,
  unlockNextStage
} from "../game/rules/phaseOneRules.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const soundAssets = JSON.parse(readFileSync(resolve(here, "../game/data/sound-assets.json"), "utf8"));
const pauseScene = readFileSync(resolve(here, "../game/scenes/PauseScene.js"), "utf8");
const guide = readFileSync(resolve(here, "../app/how-to-play/page.js"), "utf8");
const gamePage = readFileSync(resolve(here, "../app/game/page.js"), "utf8");
const homePage = readFileSync(resolve(here, "../app/page.js"), "utf8");
const roadmap = readFileSync(resolve(here, "../../Documentation/GAME_DEVELOPMENT_ROADMAP.md"), "utf8");

test("CC0 Kenney sound assets are bundled locally and mapped to gameplay events", () => {
  assert.equal(soundAssets.license, "CC0-1.0");
  assert.equal(soundAssets.creator, "Kenney");
  assert.ok(soundAssets.assets.length >= 10);
  assert.equal(soundAssets.assets.find((asset) => asset.key === "sfx-monster-jump").sourcePack, "512 Sound Effects (8-bit style)");
  for (const asset of soundAssets.assets) {
    assert.ok(asset.key.startsWith("sfx-"));
    assert.ok(asset.path.startsWith("/assets/audio/sfx/"));
    assert.ok(existsSync(resolve(here, "../public", asset.path.slice(1))), `missing sound file: ${asset.path}`);
    assert.ok(
      asset.sourceUrl.startsWith("https://kenney.nl/assets/") ||
      asset.sourceUrl === "https://opengameart.org/content/512-sound-effects-8-bit-style"
    );
  }
  assert.match(scene, /for \(const asset of soundAssets\.assets\) \{\s*this\.load\.audio\(asset\.key, asset\.path\);/);
  assert.match(scene, /this\.sound\.play\(key, \{ volume: PhaserMath\.Clamp\(volume \/ 100, 0, 1\) \}\)/);
  assert.match(scene, /playFarmerFootsteps\(dt\)/);
  assert.match(scene, /playMonsterJumpSound\(\)/);
  assert.match(scene, /playSfx\("sfx-monster-jump"/);
  assert.match(scene, /playMonsterLandSound\(\)/);
  assert.match(scene, /playMonsterBiteSound\(\)/);
  assert.match(scene, /playMonsterHitSound\(\)/);
  assert.match(scene, /playMonsterDefeatSound\(\)/);
  assert.match(scene, /playCoinRewardSound\(\)/);
  assert.match(scene, /playThornImpactSound\(\)/);
  assert.match(scene, /playVictoryMusic\(\) \{\s*this\.playSfx\("sfx-victory"/);
  assert.match(scene, /playDefeatMusic\(\) \{\s*this\.playSfx\("sfx-defeat"/);
});

test("five Phase 1 waves are gently increasing and total exactly 30 ordinary monsters", () => {
  assert.deepEqual(PHASE_ONE_WAVE_SIZES, [3, 5, 6, 7, 9]);
  assert.equal(PHASE_ONE_TOTAL_MONSTERS, 30);
  assert.ok(PHASE_ONE_WAVE_SIZES.every((count, index) => index === 0 || count > PHASE_ONE_WAVE_SIZES[index - 1]));
});

test("campaign stage counts increase by one ordinary monster per stage; dragon is excluded", () => {
  assert.deepEqual(Array.from({ length: 10 }, (_, i) => ordinaryMonsterCountForStage(i + 1)), [30,31,32,33,34,35,36,37,38,39]);
  assert.equal(ordinaryMonsterCountForStage(0), 0);
  assert.equal(ordinaryMonsterCountForStage(11), 0);
});

test("initial energy, plant costs, HP and mushroom production are centralized", () => {
  assert.equal(INITIAL_ENERGY, 150);
  assert.equal(MAX_ENERGY, 300);
  assert.equal(MONSTER_KILL_COIN_REWARD, 8);
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


test("coin progression persists safely across browser sessions", () => {
  const values = new Map();
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); }
  };
  assert.equal(loadSavedCoins(storage), 0);
  assert.equal(saveCoins(storage, 24), true);
  assert.equal(values.has(PROGRESSION_STORAGE_KEY), true);
  assert.equal(loadSavedCoins(storage), 24);
  assert.equal(normalizeCoins(-1), 0);
  assert.equal(normalizeCoins(1.5), 0);
  assert.equal(normalizeCoins(Number.MAX_SAFE_INTEGER + 1), 0);
});

test("coin progression rejects malformed, outdated, and inaccessible storage", () => {
  const malformed = { getItem() { return "{not-json"; } };
  const outdated = { getItem() { return JSON.stringify({ version: 0, coins: 900 }); } };
  const inaccessible = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(loadSavedCoins(malformed), 0);
  assert.equal(loadSavedCoins(outdated), 0);
  assert.equal(loadSavedCoins(inaccessible), 0);
  assert.equal(saveCoins(inaccessible, 8), false);
  assert.equal(saveCoins(null, 8), false);
});


test("plant purchase deducts the exact approved price and unlocks once", () => {
  const result = purchasePlant({ coins: 80, plantId: "pea-shooter", price: 60, unlockedPlantIds: ["radish", "mushroom"] });
  assert.deepEqual(result, {
    ok: true,
    reason: "purchased",
    coins: 20,
    unlockedPlantIds: ["radish", "mushroom", "pea-shooter"]
  });
});

test("plant purchase rejects missing prices, invalid values, duplicates, and insufficient funds without charging", () => {
  const base = { coins: 40, plantId: "ice-bloom", unlockedPlantIds: ["radish"] };
  assert.equal(purchasePlant(base).reason, "invalid-price");
  assert.equal(purchasePlant({ ...base, price: 0 }).reason, "invalid-price");
  assert.equal(purchasePlant({ ...base, price: 1.5 }).reason, "invalid-price");
  assert.equal(purchasePlant({ ...base, price: 50 }).reason, "insufficient-coins");
  assert.equal(purchasePlant({ ...base, price: 20, unlockedPlantIds: ["radish", "ice-bloom"] }).reason, "already-unlocked");
  assert.equal(purchasePlant({ ...base, plantId: "  ", price: 20 }).reason, "invalid-plant");
  assert.equal(purchasePlant({ ...base, unlockedPlantIds: null, price: 20 }).reason, "invalid-unlocks");
  const unchanged = purchasePlant({ ...base, price: 50 });
  assert.equal(unchanged.coins, 40);
  assert.deepEqual(unchanged.unlockedPlantIds, ["radish"]);
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
  const production = scene.slice(scene.indexOf("spawnMushroomEnergy(plant) {"), scene.indexOf("spawnStudioEnergy(plant"));
  assert.match(production, /const amount = MUSHROOM_CONFIG\.energy;/);
  assert.doesNotMatch(production, /Math\.min\(MUSHROOM_CONFIG\.energy, MAX_ENERGY - this\.energy\)/);
  assert.match(production, /collectEnergy\(this\.energy, amount\)/);
});

test("resource Mushrooms never stop monsters; only living Radishes are defensive blockers", () => {
  const updateMonsters = scene.slice(scene.indexOf("  updateMonsters(dt, delta) {"), scene.indexOf("  updateProjectiles(dt) {"));
  assert.match(updateMonsters, /selectLaneBlocker\(/);
  assert.equal(selectLaneBlocker({
    plants: [{ plant: { type: "mushroom", row: 1, alive: true }, localX: -1 }],
    row: 1, monsterLocalX: 0
  }), null);
  assert.equal(selectLaneBlocker({
    plants: [{ plant: { type: "radish", row: 1, alive: true }, localX: -1 }],
    row: 1, monsterLocalX: 0
  }).type, "radish");
});

test("the first monster crossing the final line ends the game immediately", () => {
  const updateMonsters = scene.slice(scene.indexOf("  updateMonsters(dt, delta) {"), scene.indexOf("  updateProjectiles(dt) {"));
  assert.match(updateMonsters, /if \(!blocker && monster\.localX <= HOME_LOCAL_X \+ 34\) \{\s*\/\/ The first monster to cross the final line ends the run immediately\.[\s\S]*?this\.endGame\(false\);\s*return;/);
  assert.doesNotMatch(updateMonsters, /houseHealth\s*=\s*Math\.max/);
});

test("uprooting a plant does not switch the stationary farmer to an action animation", () => {
  const uproot = scene.slice(scene.indexOf("  uprootPlant(plant) {"), scene.indexOf("  destroyPlant(plant) {"));
  assert.doesNotMatch(uproot, /playFarmerAction|setFarmerAnimation|farmer-uproot/);
  assert.match(uproot, /this\.playUprootSound\(\)/);
});

test("a farmhouse defeat aborts the rest of the current simulation frame", () => {
  const update = scene.slice(scene.indexOf("  update(_time, delta) {"), scene.indexOf("  showWaveAnnouncement(wave) {"));
  assert.match(update, /this\.updateMonsters\(dt, deltaMs\);\s*if \(this\.gameOver\) return;[\s\S]*?this\.updateDepthSorting\(\);/);
});

test("terminal results clean up pending Mushroom pickups and their expiry timers", () => {
  const create = scene.slice(scene.indexOf("  create() {"), scene.indexOf("  drawField() {"));
  const production = scene.slice(scene.indexOf("  spawnMushroomEnergy(plant) {"), scene.indexOf("  spawnStudioEnergy(plant"));
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
    const expected = (i + 1) % 10 === 0 ? "alpha-brute" : (i + 1) % 5 === 0 ? "stonehide" : i % 3 === 1 ? "dust-skitter" : "cave-brute";
    assert.equal(monsterArchetypeFor(5, i), expected);
  }
});

test("Dust Skitters perform periodic visual hops while remaining grounded by plant collisions", () => {
  const spawn = scene.slice(scene.lastIndexOf("  spawnMonster("), scene.indexOf("  updateMonsters(dt, delta) {"));
  const update = scene.slice(scene.indexOf("  updateMonsters(dt, delta) {"), scene.indexOf("  updateProjectiles(dt) {"));
  assert.match(spawn, /jumpCooldown: archetype === "dust-skitter"/);
  assert.match(spawn, /jumpDuration: 560/);
  assert.match(update, /resolveDustSkitterMotionStep\(/);
  assert.match(update, /jumpVisualHeight: 34/);
  assert.match(update, /monster\.hyenaSprite\.y = jumpOffset/);
  assert.match(update, /if \(withinBiteRange\) \{\s*if \(monster\.isJumping\)/);
  assert.match(update, /monster\.isJumping = false;\s*monster\.jumpElapsed = 0;/);
  assert.doesNotMatch(spawn, /\bshadow\b/i, "characters must not receive ground shadows");
  assert.doesNotMatch(update, /monster\.shadow/, "monster movement must not update a ground shadow");
});

test("all three monster profiles and Stonehide bracing damage reduction remain wired", () => {
  for (const kind of ["cave-brute", "dust-skitter", "stonehide"]) {
    assert.ok(PHASE_ONE_MONSTERS[kind], `missing ${kind} profile`);
  }
  assert.equal(getStonehideIncomingDamageMultiplier(false), 0.7);
  assert.equal(getStonehideIncomingDamageMultiplier(true), 0.385);
});

test("requestPlant uses the imported centralized plant configs", () => {
  const requestPlant = scene.slice(scene.indexOf("requestPlant(col, row) {"), scene.indexOf("updatePlantingMovement(dt) {"));
  assert.match(requestPlant, /const plantConfigs = \{/);
  assert.match(requestPlant, /"electric-mushroom": ELECTRIC_MUSHROOM_CONFIG/);
  assert.match(requestPlant, /const plantConfig = plantConfigs\[this\.selectedPlant\]/);
});

test("planting validates occupancy and energy before charging", () => {
  const requestPlant = scene.slice(scene.indexOf("requestPlant(col, row) {"), scene.indexOf("updatePlantingMovement(dt) {"));
  assert.match(requestPlant, /const existingPlant = this\.plants\.find\(\(plant\) => plant\.alive && plant\.col === col && plant\.row === row\)/);
  assert.match(requestPlant, /if \(this\.energy < plantConfig\.cost\)/);
  assert.match(scene, /resolvePlantPlacement\(/);
  assert.match(scene, /this\.totalPlantsPlanted \+= 1/);
});

test("monster defeat is guarded against duplicate rewards", () => {
  assert.match(scene, /if \(monster\.hp > 0 \|\| !monster\.alive\) return/);
  assert.match(scene, /monster\.alive = false/);
  assert.match(scene, /this\.totalDefeatedMonsters \+= 1/);
  assert.match(scene, /this\.coins \+= PHASE_ONE_REWARDS\.ordinaryMonsterDefeatCoins/);
  assert.match(scene, /this\.registry\.set\(["']coins["'], this\.coins\)/);
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
  assert.match(scene, /if \(this\.gameOver \|\| this\.isPaused \|\| this\.collectionMenuOpen \|\| this\.inventoryOpen\) return/);
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

test("home menu restores authenticated cloud progress and keeps guest entry", () => {
  assert.match(homePage, /getPlayerSession\(\)/);
  assert.match(homePage, /restoreOrInitializeCloudProgress\(\)/);
  assert.match(homePage, /router\.push\("\/game"\)/);
});

test("player guidance and roadmap match the current Phase 1 balance", () => {
  assert.match(guide, /15-energy collectible every 12 seconds/);
  assert.match(gamePage, /Collect Mushroom energy/);
  assert.match(scene, /createCollectionMenuControl\(\)/);
  assert.match(scene, /this\.collectionMenuTab = "phases"/);
  assert.match(scene, /"treasure-cave-menu"/);
  assert.match(scene, /"dragon-boss"/);
  assert.match(scene, /const startFrame = key === "hyena-bite" \? 6 : 0/);
  assert.match(scene, /generateFrameNumbers\(key, \{ start: startFrame, end: endFrame \}\)/);
  assert.match(scene, /this\.playHyenaAnimation\(monster, "hyena-bite"\)/);
  assert.doesNotMatch(scene, /monster\.hyenaSprite\.anims\.pause\(\)/);
  assert.match(roadmap, /3 \/ 5 \/ 6 \/ 7 \/ 9/);
  assert.match(roadmap, /full 15-energy collectible per Mushroom every 12 seconds/);
  assert.match(roadmap, /Cave-brute, Dust-skitter, Stonehide/);
  assert.doesNotMatch(roadmap, /25 collectible energy per Mushroom every 8 seconds/i);
});


test("campaign progression unlocks the next stage only through a valid completion write", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value)
  };

  assert.equal(loadUnlockedStage(storage), 1);
  assert.equal(unlockNextStage(storage, 0), false);
  assert.equal(unlockNextStage(storage, 1), true);
  assert.equal(loadUnlockedStage(storage), 2);
  assert.deepEqual(JSON.parse(values.get(CAMPAIGN_PROGRESS_KEY)), {
    version: 1,
    unlockedStage: 2,
    completedStages: [1],
    unlockedPlantIds: ["radish", "mushroom"]
  });

  assert.equal(unlockNextStage(storage, CAMPAIGN_STAGE_COUNT), true);
  assert.equal(loadUnlockedStage(storage), CAMPAIGN_STAGE_COUNT);
  assert.equal(unlockNextStage(storage, CAMPAIGN_STAGE_COUNT + 1), false);
});

test("campaign progression safely falls back to stage one for corrupt or unavailable storage", () => {
  assert.equal(loadUnlockedStage(null), 1);
  assert.equal(loadUnlockedStage({ getItem: () => "not-json" }), 1);
  assert.equal(loadUnlockedStage({ getItem: () => JSON.stringify({ version: 9, unlockedStage: 8 }) }), 1);
  assert.equal(loadUnlockedStage({ getItem: () => JSON.stringify({ version: 1, unlockedStage: 999 }) }), CAMPAIGN_STAGE_COUNT);
  assert.equal(unlockNextStage({ getItem: () => null, setItem: () => { throw new Error("quota"); } }, 1), false);
});

test("stage selection reflects saved unlocks without linking unfinished stages into gameplay", () => {
  const stagePage = readFileSync(resolve(here, "../app/stages/page.js"), "utf8");
  assert.match(stagePage, /loadUnlockedStage\(window\.localStorage\)/);
  assert.match(stagePage, /unlockedStage >= 2/);
  assert.match(stagePage, /UNLOCKED · INTRO/);
  assert.match(stagePage, /href="\/stage\/1"/);
  assert.match(scene, /won = Boolean\(won && \(this\.stageNumber !== 1 \|\| this\.phaseOneStoryState === "complete"\)\)/);
  assert.match(scene, /unlockNextStage\(window\.localStorage, 1\)/);
});


test("wave transitions include a pausable five-second preparation window without changing wave sizes", () => {
  const create = scene.slice(scene.indexOf("  create() {"), scene.indexOf("  drawField() {"));
  const update = scene.slice(scene.indexOf("  update(_time, delta) {"), scene.indexOf("  showWaveAnnouncement(wave) {"));
  const progress = scene.slice(scene.indexOf("  checkWaveProgress() {"), scene.indexOf("  playVictoryMusic() {"));
  assert.match(create, /this\.waveIntermissionMs = 0/);
  assert.match(update, /resolveWaveSpawnStep\(/);
  assert.match(update, /this\.waveIntermissionMs = spawnStep\.intermissionMs/);
  assert.match(update, /if \(spawnStep\.shouldSpawn\)/);
  assert.match(update, /this\.spawnMonster\(spawnIndex\)/);
  assert.match(progress, /this\.waveIntermissionMs = PHASE_ONE_TIMING\.waveIntermissionMs/);
  assert.match(progress, /PHASE_ONE_TIMING\.nextWaveSpawnDelayMs/);
  assert.deepEqual(PHASE_ONE_WAVE_SIZES, [3, 5, 6, 7, 9]);
  assert.match(scene, /if \(this\.gameOver \|\| this\.isPaused \|\| this\.collectionMenuOpen \|\| this\.inventoryOpen\) return/);
});


test("stage two intro restores signed-in cloud progress before redirecting", () => {
  const stageTwoPage = readFileSync(resolve(here, "../app/stage/2/page.js"), "utf8");
  assert.match(stageTwoPage, /getPlayerSession, restoreOrInitializeCloudProgress/);
  assert.match(stageTwoPage, /await getPlayerSession\(\)/);
  assert.match(stageTwoPage, /await restoreOrInitializeCloudProgress\(\)/);
  assert.match(stageTwoPage, /restored\?\.progress\?\.unlockedStage/);
  assert.match(stageTwoPage, /if \(unlocked >= 2\)/);
  assert.match(stageTwoPage, /router\.replace\("\/stages"\)/);
  assert.match(stageTwoPage, /return \(\) => \{\s*active = false;/);
  assert.match(stageTwoPage, /battle waves are still being developed|موجات القتال ما زال قيد التطوير/);
});
