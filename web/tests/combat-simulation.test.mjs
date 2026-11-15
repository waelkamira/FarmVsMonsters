import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  resolvePlantPlacement,
  resolvePlantUproot,
  resolveEnergyPickup,
  applyHitPointsDamage
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

test("uproot rejects destroyed plants and does not mutate its input", () => {
  const plant = { type: "mushroom", alive: false, energyCost: 50 };
  const snapshot = { ...plant };
  assert.equal(resolvePlantUproot({ energy: 100, plant }).reason, "INVALID_UPROOT_STATE");
  assert.deepEqual(plant, snapshot);
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
