import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  resolvePlantPlacement,
  resolvePlantUproot,
  resolveEnergyPickup,
  applyHitPointsDamage,
  resolveMonsterLaneStep,
  resolveMonsterFreezeStep,
  resolveProjectileLaneStep,
  selectLaneBlocker,
  selectProjectileTarget,
  selectFarmerMeleeTarget,
  selectDragonFireballTarget,
  advanceCooldown,
  resolveBiteAttack,
  resolveDustSkitterMotionStep,
  resolveWaveSpawnStep,
  resolveMonsterArchetype
} from "../game/rules/combatSimulation.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const rules = readFileSync(resolve(here, "../game/rules/phaseOneRules.mjs"), "utf8");

test("plant placement creates an authoritative plant record and deducts its exact cost", () => {
  const result = resolvePlantPlacement({
    energy: 150, plants: [], type: "radish", col: 2, row: 3, columns: 8, rows: 5
  });
  assert.equal(result.ok, true);
  assert.equal(result.energy, 115);
  assert.deepEqual(result.plant, {
    type: "radish", col: 2, row: 3, hp: 160, alive: true, energyCost: 35
  });
});

test("mushroom placement uses the shared plant cost and health", () => {
  const result = resolvePlantPlacement({
    energy: 50, plants: [], type: "mushroom", col: 7, row: 4, columns: 8, rows: 5
  });
  assert.equal(result.ok, true);
  assert.equal(result.energy, 0);
  assert.equal(result.plant.hp, 85);
  assert.equal(result.plant.energyCost, 50);
});

test("placement rejects unknown plants, occupied cells, invalid coordinates and insufficient energy", () => {
  const occupied = [{ type: "radish", col: 1, row: 1, alive: true }];
  const cases = [
    [{ energy: 150, plants: [], type: "dragon", col: 0, row: 0, columns: 8, rows: 5 }, "UNKNOWN_PLANT_TYPE"],
    [{ energy: 150, plants: occupied, type: "mushroom", col: 1, row: 1, columns: 8, rows: 5 }, "CELL_OCCUPIED"],
    [{ energy: 150, plants: [], type: "radish", col: 8, row: 0, columns: 8, rows: 5 }, "CELL_OUT_OF_BOUNDS"],
    [{ energy: 150, plants: [], type: "radish", col: 0, row: -1, columns: 8, rows: 5 }, "CELL_OUT_OF_BOUNDS"],
    [{ energy: 34, plants: [], type: "radish", col: 0, row: 0, columns: 8, rows: 5 }, "INSUFFICIENT_ENERGY"]
  ];
  for (const [input, reason] of cases) {
    const result = resolvePlantPlacement(input);
    assert.equal(result.ok, false);
    assert.equal(result.reason, reason);
  }
});

test("a destroyed plant does not occupy its cell for a later placement", () => {
  const plants = [{ type: "radish", col: 2, row: 2, alive: false }];
  const result = resolvePlantPlacement({
    energy: 100, plants, type: "radish", col: 2, row: 2, columns: 8, rows: 5
  });
  assert.equal(result.ok, true);
});

test("manual uprooting refunds the recorded planting cost, including above the pickup cap", () => {
  const plant = { type: "radish", alive: true, energyCost: 35 };
  const result = resolvePlantUproot({ energy: 290, plant });
  assert.deepEqual(result, {
    ok: true, reason: "PLANT_UPROOTED", energy: 325, refund: 35
  });
});

test("uproot rejects destroyed plants, forged refunds and does not mutate its input", () => {
  const plant = { type: "mushroom", alive: false, energyCost: 50 };
  const snapshot = { ...plant };
  assert.equal(resolvePlantUproot({ energy: 100, plant }).reason, "INVALID_UPROOT_STATE");
  assert.deepEqual(plant, snapshot);
  assert.equal(
    resolvePlantUproot({ energy: 100, plant: { type: "radish", alive: true, energyCost: 999 } }).reason,
    "PLANT_COST_MISMATCH"
  );
});

test("energy pickup applies the 300 energy cap and handles malformed amounts safely", () => {
  assert.deepEqual(resolveEnergyPickup(290, 15), { energy: 300, collected: 10 });
  assert.deepEqual(resolveEnergyPickup(300, 15), { energy: 300, collected: 0 });
  assert.deepEqual(resolveEnergyPickup(20, -5), { energy: 20, collected: 0 });
  assert.deepEqual(resolveEnergyPickup(20, NaN), { energy: 20, collected: 0 });
});

test("hit point damage clamps at zero and reports defeat exactly at zero", () => {
  assert.deepEqual(applyHitPointsDamage(100, 35), {
    hp: 65, damageApplied: 35, defeated: false
  });
  assert.deepEqual(applyHitPointsDamage(10, 25), {
    hp: 0, damageApplied: 10, defeated: true
  });
  assert.deepEqual(applyHitPointsDamage(0, 25), {
    hp: 0, damageApplied: 0, defeated: true
  });
  assert.throws(() => applyHitPointsDamage(10, -1), /INVALID_HIT_POINTS_DAMAGE/);
});

test("Phaser delegates player plant actions and HP changes to the pure simulation kernel", () => {
  assert.match(scene, /resolvePlantPlacement\(/);
  assert.match(scene, /resolvePlantUproot\(/);
  assert.match(scene, /applyHitPointsDamage\(/);
  assert.match(rules, /resolveEnergyPickup/);
  assert.doesNotMatch(scene, /this\.energy -= config\.cost/);
});

test("monster lane stepping clamps movement at plant bite reach without tunneling", () => {
  assert.deepEqual(resolveMonsterLaneStep({
    localX: 120, speed: 80, deltaSeconds: 0.5,
    blockerLocalX: 100, biteReach: 12
  }), { localX: 112, stoppedByPlant: true });
  assert.deepEqual(resolveMonsterLaneStep({
    localX: 150, speed: 20, deltaSeconds: 0.5,
    blockerLocalX: 100, biteReach: 12
  }), { localX: 140, stoppedByPlant: false });
  assert.deepEqual(resolveMonsterLaneStep({
    localX: 120, speed: 80, deltaSeconds: 0.5
  }), { localX: 80, stoppedByPlant: false });
  assert.throws(() => resolveMonsterLaneStep({
    localX: 10, speed: -1, deltaSeconds: 0.1
  }), /INVALID_MONSTER_LANE_STEP/);
});

test("projectile lane stepping uses elapsed seconds and rejects invalid values", () => {
  assert.equal(resolveProjectileLaneStep({
    localX: 10, speed: 320, deltaSeconds: 0.25
  }), 90);
  assert.throws(() => resolveProjectileLaneStep({
    localX: 10, speed: 320, deltaSeconds: -1
  }), /INVALID_PROJECTILE_LANE_STEP/);
});

test("Phaser delegates monster and projectile lane movement to the simulation kernel", () => {
  assert.match(scene, /resolveMonsterLaneStep\(/);
  assert.match(scene, /resolveProjectileLaneStep\(/);
  assert.match(scene, /selectLaneBlocker\(/);
  assert.match(scene, /selectProjectileTarget\(/);
  assert.match(scene, /selectFarmerMeleeTarget\(/);
  assert.match(scene, /selectDragonFireballTarget\(/);
  assert.match(scene, /applyHitPointsDamage\(/);
  assert.match(scene, /monster\.attackCooldown = bite\.cooldownMs/);
  assert.match(scene, /boss\.shotCooldown = advanceCooldown\(/);
  assert.match(scene, /boss\.attackCooldown = advanceCooldown\(/);
  assert.match(scene, /plant\.cooldown = advanceCooldown\(/);
  assert.match(scene, /resolveDustSkitterMotionStep\(/);
  assert.match(scene, /resolveBiteAttack\(/);
});

test("lane blocker selection chooses the nearest living radish behind the monster", () => {
  const nearest = { type: "radish", row: 2, alive: true, id: "near" };
  const farther = { type: "radish", row: 2, alive: true, id: "far" };
  const result = selectLaneBlocker({
    plants: [
      { plant: farther, localX: -2 },
      { plant: { type: "mushroom", row: 2, alive: true }, localX: -0.5 },
      { plant: { type: "radish", row: 1, alive: true }, localX: -0.25 },
      { plant: { type: "radish", row: 2, alive: false }, localX: -0.1 },
      { plant: nearest, localX: -0.25 },
      { plant: { type: "radish", row: 2, alive: true }, localX: 0.2 }
    ],
    row: 2,
    monsterLocalX: 0
  });
  assert.equal(result, nearest);
  const justPassed = { type: "radish", row: 2, alive: true, id: "overlapped" };
  assert.equal(selectLaneBlocker({
    plants: [{ plant: justPassed, localX: 3 }],
    row: 2, monsterLocalX: 0, maxOvershoot: 4
  }), justPassed);
  assert.equal(selectLaneBlocker({
    plants: [{ plant: justPassed, localX: 5 }],
    row: 2, monsterLocalX: 0, maxOvershoot: 4
  }), null);
  assert.equal(selectLaneBlocker({ plants: [], row: 2, monsterLocalX: 0 }), null);
  assert.throws(() => selectLaneBlocker({ plants: [], row: 2, monsterLocalX: NaN }), /INVALID_LANE_BLOCKER_QUERY/);
});

test("projectile targeting preserves same-lane first-match and scaled hit radius", () => {
  const first = { row: 1, localX: 1.1, alive: true, widthScale: 2, id: "first" };
  const closer = { row: 1, localX: 1.01, alive: true, id: "closer" };
  const result = selectProjectileTarget({
    monsters: [
      { row: 0, localX: 1, alive: true },
      first,
      closer,
      { row: 1, localX: 1, alive: false }
    ],
    row: 1,
    localX: 1,
    collisionRadius: 0.1
  });
  assert.equal(result, first);
  assert.equal(selectProjectileTarget({ monsters: [], row: 1, localX: 1, collisionRadius: 0.1 }), null);
});

test("farmer melee selects the nearest monster in the active lane and preserves tie order", () => {
  const first = { row: 2, x: 105, alive: true, id: "first" };
  const tied = { row: 2, x: 95, alive: true, id: "tied" };
  const result = selectFarmerMeleeTarget({
    monsters: [
      { row: 1, x: 100, alive: true },
      { row: 2, x: 140, alive: true },
      first,
      tied
    ],
    row: 2,
    farmerX: 100,
    reach: 10
  });
  assert.equal(result, first);
  assert.equal(selectFarmerMeleeTarget({ monsters: [], row: 2, farmerX: 100, reach: 10 }), null);
});

test("dragon fireball chooses the living plant with the lowest HP and preserves tie order", () => {
  const weakest = { hp: 12, alive: true, id: "weakest" };
  const tied = { hp: 12, alive: true, id: "tied" };
  assert.equal(selectDragonFireballTarget([
    { hp: 1, alive: false },
    { hp: 30, alive: true },
    weakest,
    tied
  ]), weakest);
  assert.equal(selectDragonFireballTarget([{ hp: 1, alive: false }]), null);
});

test("cooldown advances by elapsed milliseconds and bite attacks reset to the configured interval", () => {
  assert.equal(advanceCooldown(500, 120), 380);
  assert.deepEqual(resolveBiteAttack({ cooldownMs: 40, deltaMs: 50, intervalMs: 900 }), {
    shouldAttack: true,
    cooldownMs: 900
  });
  assert.deepEqual(resolveBiteAttack({ cooldownMs: 500, deltaMs: 100, intervalMs: 900 }), {
    shouldAttack: false,
    cooldownMs: 400
  });
  assert.throws(() => advanceCooldown(100, -1), /INVALID_COOLDOWN_STEP/);
});

test("Dust Skitter jump starts, advances visually, and lands without changing lane position", () => {
  const started = resolveDustSkitterMotionStep({
    isJumping: false,
    jumpCooldownMs: 20,
    jumpElapsedMs: 0,
    jumpDurationMs: 500,
    deltaMs: 40,
    jumpSpeedMultiplier: 1.12,
    jumpVisualHeight: 34,
    visualScale: 0.68,
    nextJumpDurationMs: 500,
    nextJumpResetCooldownMs: null,
    burstCooldownMs: 1000,
    burstRemainingMs: 0,
    burstDurationMs: 420,
    burstSpeedMultiplier: 1.65,
    nextBurstCooldownMs: null
  });
  assert.equal(started.isJumping, true);
  assert.equal(started.jumpStarted, true);
  assert.equal(started.jumpElapsedMs, 40);
  assert.ok(started.jumpOffset < 0);
  assert.equal(started.movementMultiplier, 1.12);

  const landed = resolveDustSkitterMotionStep({
    isJumping: true,
    jumpCooldownMs: 800,
    jumpElapsedMs: 480,
    jumpDurationMs: 500,
    deltaMs: 40,
    jumpSpeedMultiplier: 1.12,
    jumpVisualHeight: 34,
    visualScale: 0.68,
    nextJumpDurationMs: null,
    nextJumpResetCooldownMs: 2400,
    burstCooldownMs: 1000,
    burstRemainingMs: 0,
    burstDurationMs: 420,
    burstSpeedMultiplier: 1.65,
    nextBurstCooldownMs: null
  });
  assert.equal(landed.isJumping, false);
  assert.equal(landed.jumpLanded, true);
  assert.equal(landed.jumpElapsedMs, 0);
  assert.equal(landed.jumpOffset, 0);
  assert.equal(landed.jumpCooldownMs, 2400);
});

test("Dust Skitter burst begins and consumes its first frame exactly as the live scene did", () => {
  const step = resolveDustSkitterMotionStep({
    isJumping: false,
    jumpCooldownMs: 1000,
    jumpElapsedMs: 0,
    jumpDurationMs: 500,
    deltaMs: 20,
    jumpSpeedMultiplier: 1.12,
    jumpVisualHeight: 34,
    visualScale: 0.68,
    nextJumpDurationMs: null,
    nextJumpResetCooldownMs: null,
    burstCooldownMs: 10,
    burstRemainingMs: 0,
    burstDurationMs: 420,
    burstSpeedMultiplier: 1.65,
    nextBurstCooldownMs: 3300
  });
  assert.equal(step.burstStarted, true);
  assert.equal(step.burstRemainingMs, 400);
  assert.equal(step.burstCooldownMs, 3300);
  assert.equal(step.movementMultiplier, 1.65);
});

test("Dust Skitter combines jump and burst movement multipliers", () => {
  const step = resolveDustSkitterMotionStep({
    isJumping: true,
    jumpCooldownMs: 900,
    jumpElapsedMs: 100,
    jumpDurationMs: 500,
    deltaMs: 50,
    jumpSpeedMultiplier: 1.12,
    jumpVisualHeight: 34,
    visualScale: 0.68,
    nextJumpDurationMs: null,
    nextJumpResetCooldownMs: null,
    burstCooldownMs: 800,
    burstRemainingMs: 100,
    burstDurationMs: 420,
    burstSpeedMultiplier: 1.65,
    nextBurstCooldownMs: null
  });
  assert.equal(step.movementMultiplier, 1.12 * 1.65);
  assert.equal(step.burstRemainingMs, 50);
});

test("phase-one wave scheduler preserves intermission, first spawn delay and interval cadence", () => {
  const intermission = resolveWaveSpawnStep({
    wave: 2, waveSize: 5, spawnedThisWave: 0,
    intermissionMs: 5000, spawnTimerMs: 1600, deltaMs: 1000
  });
  assert.equal(intermission.shouldSpawn, false);
  assert.equal(intermission.intermissionMs, 4000);
  assert.equal(intermission.spawnTimerMs, 1600);
  assert.equal(intermission.remainingIntermissionSecond, 4);

  const firstSpawn = resolveWaveSpawnStep({
    wave: 2, waveSize: 5, spawnedThisWave: 0,
    intermissionMs: 0, spawnTimerMs: 100, deltaMs: 120
  });
  assert.equal(firstSpawn.shouldSpawn, true);
  assert.equal(firstSpawn.spawnedThisWave, 1);
  assert.equal(firstSpawn.spawnTimerMs, 4960);

  const waiting = resolveWaveSpawnStep({
    wave: 2, waveSize: 5, spawnedThisWave: 1,
    intermissionMs: 0, spawnTimerMs: 500, deltaMs: 100
  });
  assert.equal(waiting.shouldSpawn, false);
  assert.equal(waiting.spawnTimerMs, 400);
});

test("stage wave scheduler accepts configured counts, empty waves and custom spawn cadence", () => {
  const custom = resolveWaveSpawnStep({
    wave: 2, waveSize: 10, spawnedThisWave: 0,
    intermissionMs: 0, spawnTimerMs: 0, spawnIntervalMs: 2750, deltaMs: 16
  });
  assert.equal(custom.shouldSpawn, true);
  assert.equal(custom.spawnedThisWave, 1);
  assert.equal(custom.spawnTimerMs, 2750);

  const empty = resolveWaveSpawnStep({
    wave: 3, waveSize: 0, spawnedThisWave: 0,
    intermissionMs: 0, spawnTimerMs: 0, deltaMs: 16
  });
  assert.equal(empty.shouldSpawn, false);
  assert.equal(empty.spawnedThisWave, 0);
});

test("phase-one wave scheduler spawns at most one monster per update and stops at roster size", () => {
  const lastSpawn = resolveWaveSpawnStep({
    wave: 5, waveSize: 9, spawnedThisWave: 8,
    intermissionMs: 0, spawnTimerMs: 0, deltaMs: 16
  });
  assert.equal(lastSpawn.shouldSpawn, true);
  assert.equal(lastSpawn.spawnedThisWave, 9);

  const complete = resolveWaveSpawnStep({
    wave: 5, waveSize: 9, spawnedThisWave: 9,
    intermissionMs: 0, spawnTimerMs: 0, deltaMs: 5000
  });
  assert.equal(complete.shouldSpawn, false);
  assert.equal(complete.spawnedThisWave, 9);
  assert.equal(complete.spawnTimerMs, 0);

  const shorterConfiguredWave = resolveWaveSpawnStep({
    wave: 5, waveSize: 8, spawnedThisWave: 0,
    intermissionMs: 0, spawnTimerMs: 0, deltaMs: 16
  });
  assert.equal(shorterConfiguredWave.shouldSpawn, true);
  assert.throws(() => resolveWaveSpawnStep({
    wave: 5, waveSize: 501, spawnedThisWave: 0,
    intermissionMs: 0, spawnTimerMs: 0, deltaMs: 16
  }), /INVALID_WAVE_SPAWN_STATE/);
});

test("spawn composition stays fixed and validates only campaign-wide spawn indices", () => {
  assert.equal(resolveMonsterArchetype(1, 0), "cave-brute");
  assert.equal(resolveMonsterArchetype(3, 1), "dust-skitter");
  assert.equal(resolveMonsterArchetype(5, 4), "stonehide");
  assert.equal(resolveMonsterArchetype(5, 1), "dust-skitter");
  assert.throws(() => resolveMonsterArchetype(1, 30), /INVALID_MONSTER_SPAWN_INDEX/);
});


test("Snow Thrower placement uses its approved cost, health and lane rules", () => {
  const result = resolvePlantPlacement({
    energy: 150, plants: [], type: "snow-thrower", col: 2, row: 3, columns: 8, rows: 5
  });
  assert.equal(result.ok, true);
  assert.equal(result.energy, 60);
  assert.equal(result.plant.hp, 150);
  assert.equal(result.plant.energyCost, 90);
});

test("monster freeze timer immobilizes for 2600ms and then thaws", () => {
  assert.deepEqual(resolveMonsterFreezeStep(2600, 1000), { remainingMs: 1600, isFrozen: true });
  assert.deepEqual(resolveMonsterFreezeStep(100, 100), { remainingMs: 0, isFrozen: false });
  assert.throws(() => resolveMonsterFreezeStep(100, -1), /INVALID_MONSTER_FREEZE_STEP/);
});

test("Phaser registers Snow Thrower assets and freezes monsters without HP damage", () => {
  assert.match(scene, /snow-thrower-level-1/);
  assert.match(scene, /Snow-thrower-bomb-level-1\.png/);
  assert.match(scene, /frozen-hyena-level-1/);
  assert.match(scene, /this\.freezeMonster\(hit\)/);\n  assert.match(scene, /monster\.freezeStage = Math\.min\(5, \(monster\.freezeStage \|\| 0\) \+ 1\)/);
  assert.match(scene, /restoreMonsterAfterFreeze/);
});

test("Studio plant profiles allow a new plant to use configured placement and its recorded refund", () => {
  const config = { plantingEnergyCost: 62, hp: 230 };
  const placed = resolvePlantPlacement({
    energy: 150, plants: [], type: "bamboo-level-1", col: 3, row: 2,
    columns: 8, rows: 5, customConfig: config
  });
  assert.equal(placed.ok, true);
  assert.equal(placed.energy, 88);
  assert.deepEqual(placed.plant, {
    type: "bamboo-level-1", col: 3, row: 2, hp: 230,
    alive: true, energyCost: 62
  });
  const uprooted = resolvePlantUproot({ energy: 88, plant: placed.plant });
  assert.deepEqual(uprooted, {
    ok: true, reason: "PLANT_UPROOTED", energy: 150, refund: 62
  });
});

test("Studio placement rejects a missing or malformed custom combat profile", () => {
  const base = { energy: 100, plants: [], type: "new-studio-plant", col: 0, row: 0, columns: 8, rows: 5 };
  assert.equal(resolvePlantPlacement(base).reason, "UNKNOWN_PLANT_TYPE");
  assert.equal(resolvePlantPlacement({ ...base, customConfig: { plantingEnergyCost: -1, hp: 20 } }).reason, "UNKNOWN_PLANT_TYPE");
  assert.equal(resolvePlantPlacement({ ...base, customConfig: { plantingEnergyCost: 10, hp: 0 } }).reason, "UNKNOWN_PLANT_TYPE");
});
