import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { STAGE_ONE_PLANTS } from "../game/data/stageOnePlants.mjs";
import {
  PHASE_ONE_COMBAT_CONTRACT_VERSION,
  PHASE_ONE_WAVE_SIZES,
  PHASE_ONE_ENERGY,
  PHASE_ONE_TIMING,
  PHASE_ONE_REWARDS,
  PHASE_ONE_PLANTS,
  PHASE_ONE_FARMER,
  PHASE_ONE_DRAGON,
  getMonsterSpawnIntervalMs,
  getMonsterCombatStats,
  getStonehideIncomingDamageMultiplier
} from "../game/rules/phaseOneCombatContract.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const rules = readFileSync(resolve(here, "../game/rules/phaseOneRules.mjs"), "utf8");

test("combat contract version, wave roster, and reward policy are explicit", () => {
  assert.equal(PHASE_ONE_COMBAT_CONTRACT_VERSION, 1);
  assert.deepEqual(PHASE_ONE_WAVE_SIZES, [2, 3, 4, 5, 6]);
  assert.equal(PHASE_ONE_WAVE_SIZES.reduce((sum, size) => sum + size, 0), 20);
  assert.deepEqual(PHASE_ONE_ENERGY, { initial: 150, maximum: 300 });
  assert.equal(PHASE_ONE_REWARDS.ordinaryMonsterDefeatCoins, 8);
});

test("active Stage 1 plant encyclopedia matches combat costs and available artwork", () => {
  const contractKeyByPlantId = {
    radish: "radish",
    "energy-mushroom": "energyMushroom",
    "pumpkin-guard": "pumpkin",
    pineapple: "pineapple",
    hazelnut: "hazelnut",
    mango: "mango",
    "snow-thrower": "snowThrower",
    "electric-mushroom": "electric-mushroom"
  };
  const activePlants = STAGE_ONE_PLANTS.filter((plant) => plant.implemented);
  assert.deepEqual(
    activePlants.map((plant) => plant.id).sort(),
    Object.keys(contractKeyByPlantId).sort()
  );
  for (const plant of activePlants) {
    const contractPlant = PHASE_ONE_PLANTS[contractKeyByPlantId[plant.id]];
    assert.equal(plant.energyCost, contractPlant.plantingEnergyCost, plant.id + " encyclopedia cost must match the combat contract");
    assert.ok(existsSync(resolve(here, "../public", plant.assetPath.slice(1))), plant.id + " art file must exist");
  }
});

test("radish, mushroom and dragon combat values preserve the current tuning", () => {
  assert.deepEqual(PHASE_ONE_PLANTS.radish, {
    projectileDamage: 25,
    projectileSpeed: 320,
    projectileCollisionRadius: 24,
    plantingEnergyCost: 35,
    hp: 160,
    cooldownMs: 1450,
    range: 360,
    seedPacketRechargeMs: 5000
  });
  assert.equal(PHASE_ONE_PLANTS.energyMushroom.plantingEnergyCost, 50);
  assert.equal(PHASE_ONE_PLANTS.energyMushroom.hp, 85);
  assert.equal(PHASE_ONE_PLANTS.energyMushroom.energyPerPickup, 15);
  assert.equal(PHASE_ONE_PLANTS.energyMushroom.productionIntervalMs, 12000);
  assert.equal(PHASE_ONE_PLANTS.energyMushroom.pickupTtlMs, 12000);

  assert.deepEqual(PHASE_ONE_DRAGON, {
    maxHp: 750,
    farmerSlingDamage: 25,
    farmerSlingInitialDelayMs: 850,
    farmerSlingIntervalMs: 900,
    dragonInitialAttackDelayMs: 2800,
    fireballDamageToPlant: 55,
    fireballDamageToFarm: 12,
    attackIntervalMs: 3900,
    fireballTravelMs: 1050
  });
});

test("monster stats match the existing Stage 1 combat values", () => {
  const brute = getMonsterCombatStats("cave-brute", 1);
  assert.equal(brute.hp, 125);
  assert.equal(brute.speed, 8);
  assert.equal(brute.plantDamage, 16);
  assert.equal(brute.attackIntervalMs, 1150);

  const skitter = getMonsterCombatStats("dust-skitter", 1);
  assert.equal(skitter.hp, 36);
  assert.equal(skitter.speed, 13.6);
  assert.equal(skitter.burstDurationMs, 420);
  assert.equal(skitter.initialBurstCooldownMinMs, 1500);
  assert.equal(skitter.initialBurstCooldownMaxMs, 2300);
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

test("wave pacing is shared and rejects invalid wave numbers", () => {
  assert.equal(PHASE_ONE_TIMING.firstMonsterSpawnDelayMs, 1800);
  assert.equal(PHASE_ONE_TIMING.nextWaveSpawnDelayMs, 1600);
  assert.equal(PHASE_ONE_TIMING.waveIntermissionMs, 5000);
  assert.equal(getMonsterSpawnIntervalMs(1), 5080);
  assert.equal(getMonsterSpawnIntervalMs(5), 4600);
  assert.throws(() => getMonsterSpawnIntervalMs(0), /INVALID_WAVE_NUMBER/);
  assert.throws(() => getMonsterSpawnIntervalMs(6), /INVALID_WAVE_NUMBER/);
});

test("Phaser uses the shared contract and has no duplicate monster balance table", () => {
  assert.match(scene, /getMonsterCombatStats\(archetype, this\.wave\)/);
  assert.match(scene, /PHASE_ONE_DRAGON\.maxHp/);
  assert.match(scene, /PHASE_ONE_REWARDS\.ordinaryMonsterDefeatCoins/);
  assert.match(scene, /resolveWaveSpawnStep\(/);
  assert.match(scene, /nextSpawnTimerMs/);
  assert.doesNotMatch(scene, /const COMBAT_BALANCE\s*=/);
  assert.match(rules, /PHASE_ONE_REWARDS\.ordinaryMonsterDefeatCoins/);
  assert.match(rules, /PHASE_ONE_WAVE_SIZES/);
});
