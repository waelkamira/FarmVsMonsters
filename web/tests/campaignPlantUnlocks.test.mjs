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

test("winning Stage 1 unlocks Stage 2 and Pumpkin exactly once", () => {
  const storage = createStorage();
  assert.equal(unlockNextStage(storage, 1), true);
  assert.equal(unlockPlantReward(storage, 1), true);
  assert.equal(unlockPlantReward(storage, 1), true);

  const progress = JSON.parse(storage.getItem(CAMPAIGN_PROGRESS_KEY));
  assert.equal(progress.unlockedStage, 2);
  assert.deepEqual(progress.unlockedPlantIds, ["radish", "mushroom", "pumpkin"]);
  assert.deepEqual(progress.completedStages, [1]);
});

test("replaying an earlier stage does not remove later plant rewards", () => {
  const storage = createStorage();
  unlockNextStage(storage, 1);
  unlockPlantReward(storage, 1);
  unlockNextStage(storage, 1);

  assert.deepEqual(loadUnlockedPlantIds(storage), ["radish", "mushroom", "pumpkin"]);
});

test("legacy saves that already unlocked Stage 2 receive Pumpkin", () => {
  const storage = createStorage({
    [CAMPAIGN_PROGRESS_KEY]: JSON.stringify({
      version: 1,
      unlockedStage: 2,
      completedStages: [1]
    })
  });
  assert.deepEqual(loadUnlockedPlantIds(storage), ["radish", "mushroom", "pumpkin"]);
});

test("locked future rewards are not granted by an invalid stage number", () => {
  const storage = createStorage();
  assert.equal(unlockPlantReward(storage, 0), false);
  assert.equal(unlockPlantReward(storage, 99), false);
  assert.deepEqual(loadUnlockedPlantIds(storage), ["radish", "mushroom"]);
});
