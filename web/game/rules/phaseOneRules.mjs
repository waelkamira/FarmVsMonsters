import { PHASE_ONE_PLANTS, PHASE_ONE_REWARDS, PHASE_ONE_WAVE_SIZES, PHASE_ONE_ENERGY } from "./phaseOneCombatContract.mjs";
import { resolveEnergyPickup, resolveMonsterArchetype } from "./combatSimulation.mjs";

// Thirty ordinary monsters across five gentle-to-challenging waves. The dragon boss is separate.
export { PHASE_ONE_WAVE_SIZES };
export const PHASE_ONE_TOTAL_MONSTERS = PHASE_ONE_WAVE_SIZES.reduce((sum, count) => sum + count, 0);
export const CAMPAIGN_STAGE_COUNT = 10;
export const ordinaryMonsterCountForStage = (stage) =>
  Number.isInteger(stage) && stage >= 1 && stage <= CAMPAIGN_STAGE_COUNT ? 29 + stage : 0;

export const INITIAL_ENERGY = PHASE_ONE_ENERGY.initial;
export const MAX_ENERGY = PHASE_ONE_ENERGY.maximum;
export const MONSTER_KILL_COIN_REWARD = PHASE_ONE_REWARDS.ordinaryMonsterDefeatCoins;
export const MUSHROOM_PICKUP_TTL_MS = PHASE_ONE_PLANTS.energyMushroom.pickupTtlMs;

export const RADISH_CONFIG = Object.freeze({
  label: "Radish",
  cost: PHASE_ONE_PLANTS.radish.plantingEnergyCost,
  hp: PHASE_ONE_PLANTS.radish.hp,
  cooldown: PHASE_ONE_PLANTS.radish.cooldownMs,
  range: PHASE_ONE_PLANTS.radish.range
});

export const MUSHROOM_CONFIG = Object.freeze({
  label: "Energy Mushroom",
  cost: PHASE_ONE_PLANTS.energyMushroom.plantingEnergyCost,
  hp: PHASE_ONE_PLANTS.energyMushroom.hp,
  energy: PHASE_ONE_PLANTS.energyMushroom.energyPerPickup,
  productionInterval: PHASE_ONE_PLANTS.energyMushroom.productionIntervalMs
});
export const TOMATO_CONFIG = Object.freeze({ label: "Tomato", ...PHASE_ONE_PLANTS.tomato, cost: PHASE_ONE_PLANTS.tomato.plantingEnergyCost });
export const PUMPKIN_CONFIG = Object.freeze({ label: "Pumpkin", ...PHASE_ONE_PLANTS.pumpkin, cost: PHASE_ONE_PLANTS.pumpkin.plantingEnergyCost });
export const ONION_CONFIG = Object.freeze({ label: "Onion", ...PHASE_ONE_PLANTS.onion, cost: PHASE_ONE_PLANTS.onion.plantingEnergyCost });

export const collectEnergy = resolveEnergyPickup;
export function isWaveComplete(spawnedCount, waveSize, livingMonsterCount) {
  return spawnedCount >= waveSize && livingMonsterCount === 0;
}

export function isPhaseOneVictory(wave, totalWaves, spawnedCount, waveSize, livingMonsterCount) {
  return wave === totalWaves && isWaveComplete(spawnedCount, waveSize, livingMonsterCount);
}

export const monsterArchetypeFor = resolveMonsterArchetype;


export const PROGRESSION_STORAGE_KEY = "farmVsMonsters.progression.v1";
export const PROGRESSION_DATA_VERSION = 1;

export function normalizeCoins(value) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 0) return 0;
  return numeric;
}

export function loadSavedCoins(storage) {
  if (!storage || typeof storage.getItem !== "function") return 0;
  try {
    const raw = storage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    if (!data || data.version !== PROGRESSION_DATA_VERSION) return 0;
    return normalizeCoins(data.coins);
  } catch {
    return 0;
  }
}

export function saveCoins(storage, value) {
  const coins = normalizeCoins(value);
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify({
      version: PROGRESSION_DATA_VERSION,
      coins
    }));
    return true;
  } catch {
    return false;
  }
}

// Pure purchase transaction: prices come from the approved plant catalog/UI,
// never from an implicit fallback. This keeps currency rules testable before
// the final roster and its prices are approved.
export function purchasePlant({ coins, plantId, price, unlockedPlantIds = [] } = {}) {
  const balance = normalizeCoins(coins);
  if (!Array.isArray(unlockedPlantIds)) {
    return { ok: false, reason: "invalid-unlocks", coins: balance, unlockedPlantIds: [] };
  }
  const id = typeof plantId === "string" ? plantId.trim() : "";
  if (!id) return { ok: false, reason: "invalid-plant", coins: balance, unlockedPlantIds: [...unlockedPlantIds] };
  if (unlockedPlantIds.includes(id)) {
    return { ok: false, reason: "already-unlocked", coins: balance, unlockedPlantIds: [...unlockedPlantIds] };
  }
  if (!Number.isSafeInteger(price) || price <= 0) {
    return { ok: false, reason: "invalid-price", coins: balance, unlockedPlantIds: [...unlockedPlantIds] };
  }
  if (balance < price) {
    return { ok: false, reason: "insufficient-coins", coins: balance, unlockedPlantIds: [...unlockedPlantIds] };
  }
  return {
    ok: true,
    reason: "purchased",
    coins: balance - price,
    unlockedPlantIds: [...unlockedPlantIds, id]
  };
}


export const CAMPAIGN_PROGRESS_KEY = "farmVsMonsters.campaignProgress.v1";

export function loadUnlockedStage(storage) {
  if (!storage || typeof storage.getItem !== "function") return 1;
  try {
    const raw = storage.getItem(CAMPAIGN_PROGRESS_KEY);
    if (!raw) return 1;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Number.isInteger(data.unlockedStage)) return 1;
    return Math.min(CAMPAIGN_STAGE_COUNT, Math.max(1, data.unlockedStage));
  } catch {
    return 1;
  }
}

export function unlockNextStage(storage, completedStage) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") return false;
  if (!Number.isInteger(completedStage) || completedStage < 1 || completedStage > CAMPAIGN_STAGE_COUNT) return false;
  const unlockedStage = Math.min(CAMPAIGN_STAGE_COUNT, Math.max(loadUnlockedStage(storage), completedStage + 1));
  try {
    storage.setItem(CAMPAIGN_PROGRESS_KEY, JSON.stringify({
      version: 1,
      unlockedStage,
      completedStages: Array.from({ length: unlockedStage - 1 }, (_, index) => index + 1)
    }));
    return true;
  } catch {
    return false;
  }
}
