import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SEED_PACKETS,
  createDefaultSeedLoadout,
  normalizeSeedLoadout
} from "../game/rules/seedLoadout.mjs";

const allSeeds = ["radish", "mushroom", "pumpkin", "pineapple", "hazelnut", "mango", "snow-thrower"];

test("new players receive only their two starter seed packets", () => {
  assert.deepEqual(createDefaultSeedLoadout(["radish", "mushroom"]), ["radish", "mushroom"]);
});

test("default loadout includes unlocked seeds but never exceeds the packet tray limit", () => {
  const selected = createDefaultSeedLoadout(allSeeds);
  assert.equal(selected.length, MAX_SEED_PACKETS);
  assert.deepEqual(selected.slice(0, 2), ["radish", "mushroom"]);
});

test("saved loadouts discard locked, unknown and duplicate plant IDs", () => {
  assert.deepEqual(
    normalizeSeedLoadout(["radish", "radish", "dragon", "pumpkin"], ["radish", "mushroom", "pumpkin"]),
    ["radish", "mushroom", "pumpkin"]
  );
});

test("both starter packets are always retained", () => {
  const selected = normalizeSeedLoadout(["pumpkin", "pineapple"], ["radish", "mushroom", "pumpkin", "pineapple"]);
  assert.ok(selected.includes("radish"));
  assert.ok(selected.includes("mushroom"));
});

test("a loadout can never exceed six packets", () => {
  const selected = normalizeSeedLoadout(allSeeds, allSeeds);
  assert.equal(selected.length, MAX_SEED_PACKETS);
});
