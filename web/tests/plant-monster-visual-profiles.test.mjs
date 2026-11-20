import test from "node:test";
import assert from "node:assert/strict";
import {
  PLANT_ANIMATION_PROFILES,
  MONSTER_REACTION_PROFILES,
  PLANT_EVOLUTION_PROFILES,
  MONSTER_EVOLUTION_PROFILES,
  getPlantAnimationProfile,
  getPlantIdleMotionTransform,
  getMonsterReactionProfile,
  getPlantEvolutionProfile,
  getMonsterEvolutionProfile
} from "../game/visuals/PlantMonsterVisualProfiles.mjs";

const plantIds = ["radish", "mushroom", "pumpkin", "pineapple", "hazelnut", "mango", "snow-thrower", "electric-mushroom"];
const monsterIds = ["dust-skitter", "cave-brute", "stonehide", "alpha-brute"];

test("every playable plant has an animation profile and three visual evolution stages", () => {
  for (const id of plantIds) {
    const animation = getPlantAnimationProfile(id);
    const evolution = getPlantEvolutionProfile(id);
    assert.ok(animation, id);
    assert.ok(animation.idle.loop, id);
    assert.ok(animation.chargeMs > 0 && animation.attackMs > 0 && animation.recoveryMs > 0, id);
    assert.ok(animation.anticipationPx > 0 && animation.anticipationMs > 0, id);
    assert.equal(evolution.stages.length, 3, id);
    assert.deepEqual(evolution.stages.map((stage) => stage.level), [1, 2, 3]);
  }
  assert.equal(Object.keys(PLANT_ANIMATION_PROFILES).length, plantIds.length);
  assert.equal(Object.keys(PLANT_EVOLUTION_PROFILES).length, plantIds.length);
});

test("every implemented monster has a distinct hit response and three evolution stages", () => {
  for (const id of monsterIds) {
    const reaction = getMonsterReactionProfile(id);
    const evolution = getMonsterEvolutionProfile(id);
    assert.ok(reaction, id);
    assert.ok(reaction.recoilPx >= 0, id);
    assert.ok(reaction.hitDurationMs > 0, id);
    assert.ok(reaction.glowRadius > 0, id);
    assert.equal(evolution.stages.length, 3, id);
  }
  assert.equal(Object.keys(MONSTER_REACTION_PROFILES).length, monsterIds.length);
  assert.equal(Object.keys(MONSTER_EVOLUTION_PROFILES).length, monsterIds.length);
});

test("unknown plants fail closed and unknown monsters use the standard reaction", () => {
  assert.equal(getPlantAnimationProfile("unknown"), null);
  assert.equal(getPlantEvolutionProfile("unknown"), null);
  assert.equal(getMonsterEvolutionProfile("unknown"), null);
  assert.equal(getMonsterReactionProfile("unknown"), MONSTER_REACTION_PROFILES["cave-brute"]);
});


test("plant idle breathing stays subtle, deterministic, and preserves base scale", () => {
  for (const id of plantIds) {
    const first = getPlantIdleMotionTransform(id, 500, 120, 0.8, 1.1);
    const second = getPlantIdleMotionTransform(id, 500, 120, 0.8, 1.1);
    assert.deepEqual(first, second, id);
    assert.ok(first.scaleX > 0.78 && first.scaleX < 0.82, id);
    assert.ok(first.scaleY > 1.05 && first.scaleY < 1.15, id);
  }
  assert.equal(getPlantIdleMotionTransform("unknown", 100), null);
});
