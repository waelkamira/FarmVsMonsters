import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE_ONE_BATTLE_LOADOUT,
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
