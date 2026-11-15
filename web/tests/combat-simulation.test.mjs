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
  resolveProjectileLaneStep,
  selectLaneBlocker,
  selectProjectileTarget,
  selectFarmerMeleeTarget,
  selectDragonFireballTarget
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
