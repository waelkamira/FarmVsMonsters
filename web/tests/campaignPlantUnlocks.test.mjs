import test from "node:test";
import assert from "node:assert/strict";
import {
  CAMPAIGN_PROGRESS_KEY,
  loadUnlockedPlantIds,
  unlockNextStage,
  unlockPlantReward
} from "../game/rules/phaseOneRules.mjs";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
}

test("new campaign starts with only Radish and Energy Mushroom", () => {
  const storage = createStorage();
  assert.deepEqual(loadUnlockedPlantIds(storage), ["radish", "mushroom"]);
});

test("browser-side victories cannot unlock stages or plant rewards", () => {
  const storage = createStorage();
  assert.equal(unlockNextStage(storage, 1), false);
  assert.equal(unlockPlantReward(storage, 1), false);
  assert.deepEqual(loadUnlockedPlantIds(storage), ["radish", "mushroom"]);
  assert.equal(storage.getItem(CAMPAIGN_PROGRESS_KEY), null);
});

test("forged and legacy browser saves cannot unlock future plant rewards", () => {
  const storage = createStorage({
    [CAMPAIGN_PROGRESS_KEY]: JSON.stringify({
      version: 1,
      unlockedStage: 10,
      completedStages: [1,2,3,4,5,6,7,8,9],
      unlockedPlantIds: ["pumpkin", "pineapple", "hazelnut", "mango"]
    })
  });
  assert.deepEqual(loadUnlockedPlantIds(storage), ["radish", "mushroom"]);
  assert.equal(unlockNextStage(storage, 10), false);
  assert.equal(unlockPlantReward(storage, 1), false);
  assert.deepEqual(loadUnlockedPlantIds(storage), ["radish", "mushroom"]);
});

test("locked future rewards are not granted by an invalid stage number", () => {
  const storage = createStorage();
  assert.equal(unlockPlantReward(storage, 0), false);
  assert.equal(unlockPlantReward(storage, 99), false);
  assert.deepEqual(loadUnlockedPlantIds(storage), ["radish", "mushroom"]);
});
