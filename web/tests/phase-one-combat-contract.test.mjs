import test from "node:test";
import assert from "node:assert/strict";
import {
  PHASE_ONE_COMBAT_CONTRACT_VERSION,
  PHASE_ONE_REWARDS,
  PHASE_ONE_PLANTS,
  PHASE_ONE_DRAGON,
  PHASE_ONE_MONSTERS,
  getMonsterCombatStats,
  getStonehideIncomingDamageMultiplier
} from "../game/rules/phaseOneCombatContract.mjs";

test("Stage 1 combat contract is explicitly versioned and keeps the approved coin reward", () => {
  assert.equal(PHASE_ONE_COMBAT_CONTRACT_VERSION, 1);
  assert.equal(PHASE_ONE_REWARDS.ordinaryMonsterDefeatCoins, 8);
  assert.ok(Object.isFrozen(PHASE_ONE_REWARDS));
});

test("plant and dragon combat values are centralized without changing current tuning", () => {
  assert.deepEqual(PHASE_ONE_PLANTS.radish, {
    projectileDamage: 25,
    plantingEnergyCost: 35,
    hp: 160,
    cooldownMs: 1450,
    range: 360
  });
  assert.equal(PHASE_ONE_PLANTS.energyMushroom.energyPerPickup, 15);
  assert.equal(PHASE_ONE_PLANTS.energyMushroom.productionIntervalMs, 12000);
  assert.equal(PHASE_ONE_DRAGON.maxHp, 750);
  assert.equal(PHASE_ONE_DRAGON.farmerSlingDamage, 25);
  assert.equal(PHASE_ONE_DRAGON.farmerSlingInitialDelayMs, 850);
  assert.equal(PHASE_ONE_DRAGON.farmerSlingIntervalMs, 900);
  assert.equal(PHASE_ONE_DRAGON.fireballDamageToPlant, 55);
  assert.equal(PHASE_ONE_DRAGON.fireballDamageToFarm, 12);
});

test("monster HP, movement, attack and armor values match the live Stage 1 rules", () => {
  const brute = getMonsterCombatStats("cave-brute", 1);
  assert.equal(brute.hp, 175);
  assert.equal(brute.speed, 8);
  assert.equal(brute.plantDamage, 16);
  assert.equal(brute.attackIntervalMs, 1150);

  const skitter = getMonsterCombatStats("dust-skitter", 1);
  assert.equal(skitter.hp, 36);
  assert.equal(skitter.speed, 13.6);
  assert.equal(skitter.burstDurationMs, 420);
  assert.equal(skitter.jumpSpeedMultiplier, 1.12);
  assert.equal(skitter.burstSpeedMultiplier, 1.65);

  const stonehide = getMonsterCombatStats("stonehide", 1);
  assert.equal(stonehide.hp, 152);
  assert.equal(stonehide.speed, 4.96);
  assert.equal(stonehide.incomingDamageMultiplier, 0.7);
  assert.equal(getStonehideIncomingDamageMultiplier(false), 0.7);
  assert.equal(getStonehideIncomingDamageMultiplier(true), 0.385);

  const alpha = getMonsterCombatStats("alpha-brute", 1);
  assert.equal(alpha.hp, 350);
  assert.equal(alpha.speed, 3.84);
  assert.equal(alpha.plantDamage, 32);
});

test("combat contract rejects unknown archetypes and invalid wave numbers", () => {
  assert.throws(() => getMonsterCombatStats("unknown", 1), /INVALID_MONSTER_COMBAT_INPUT/);
  assert.throws(() => getMonsterCombatStats("cave-brute", 0), /INVALID_MONSTER_COMBAT_INPUT/);
  assert.throws(() => getMonsterCombatStats("cave-brute", 11), /INVALID_MONSTER_COMBAT_INPUT/);
});

test("Phaser consumes the shared combat contract instead of owning a duplicate balance table", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, resolve } = await import("node:path");
  const here = dirname(fileURLToPath(import.meta.url));
  const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
  const rules = readFileSync(resolve(here, "../game/rules/phaseOneRules.mjs"), "utf8");

  assert.match(scene, /getMonsterCombatStats\(archetype, this\.wave\)/);
  assert.match(scene, /PHASE_ONE_DRAGON\.maxHp/);
  assert.match(scene, /PHASE_ONE_REWARDS\.ordinaryMonsterDefeatCoins/);
  assert.doesNotMatch(scene, /const COMBAT_BALANCE\s*=/);
  assert.match(rules, /PHASE_ONE_REWARDS\.ordinaryMonsterDefeatCoins/);
});
