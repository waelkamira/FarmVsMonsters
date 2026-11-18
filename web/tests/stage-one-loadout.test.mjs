import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE_ONE_BATTLE_LOADOUT,
  STAGE_ONE_PLANTS,
  resolveStageOneLoadout
} from "../game/data/stageOnePlants.mjs";

test("Stage 1 exposes only Radish and Energy Mushroom", () => {
  assert.deepEqual(STAGE_ONE_BATTLE_LOADOUT, ["radish", "mushroom"]);
  assert.deepEqual(resolveStageOneLoadout(null), ["radish", "mushroom"]);
});

test("saved Stage 1 loadouts cannot re-enable prototype plants", () => {
  assert.deepEqual(
    resolveStageOneLoadout(["pumpkin", "pineapple", "mango", "hazelnut", "radish"]),
    ["mushroom", "radish"]
  );
  assert.deepEqual(resolveStageOneLoadout(["mushroom"]), ["mushroom", "radish"]);
  assert.deepEqual(resolveStageOneLoadout(["radish"]), ["mushroom", "radish"]);
  assert.deepEqual(resolveStageOneLoadout([]), ["mushroom", "radish"]);
});

test("invalid saved loadout entries are ignored without losing the Stage 1 core", () => {
  assert.deepEqual(
    resolveStageOneLoadout(["dragon", null, 42, "radish", "mushroom", "radish"]),
    ["radish", "mushroom"]
  );
});

test("plant encyclopedia distinguishes the Stage 1 loadout from implemented prototypes", () => {
  const available = STAGE_ONE_PLANTS.filter((plant) => plant.stageOneAvailable).map((plant) => plant.id);
  const prototypes = STAGE_ONE_PLANTS.filter((plant) => plant.implemented && !plant.stageOneAvailable).map((plant) => plant.id);
  assert.deepEqual(available, ["radish", "energy-mushroom"]);
  assert.deepEqual(prototypes, ["pumpkin-guard", "pineapple", "mango"]);
});
