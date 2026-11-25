import { PHASE_ONE_PLANTS, PHASE_ONE_REWARDS, PHASE_ONE_WAVE_SIZES, PHASE_ONE_ENERGY } from "./phaseOneCombatContract.mjs";
import { resolveEnergyPickup, resolveMonsterArchetype } from "./combatSimulation.mjs";

// Thirty ordinary monsters across five guided onboarding waves. The dragon boss is separate.
export { PHASE_ONE_WAVE_SIZES };
export const PHASE_ONE_TOTAL_MONSTERS = PHASE_ONE_WAVE_SIZES.reduce((sum, count) => sum + count, 0);
export const CAMPAIGN_STAGE_COUNT = 10;
const CAMPAIGN_STAGE_MONSTER_COUNTS = Object.freeze([30, 31, 32, 33, 34, 35, 36, 37, 38, 39]);
export const ordinaryMonsterCountForStage = (stage) =>
  Number.isInteger(stage) && stage >= 1 && stage <= CAMPAIGN_STAGE_COUNT
    ? CAMPAIGN_STAGE_MONSTER_COUNTS[stage - 1]
    : 0;

export const INITIAL_ENERGY = PHASE_ONE_ENERGY.initial;
export const MAX_ENERGY = PHASE_ONE_ENERGY.maximum;
export const MONSTER_KILL_COIN_REWARD = PHASE_ONE_REWARDS.ordinaryMonsterDefeatCoins;
export const MUSHROOM_PICKUP_TTL_MS = PHASE_ONE_PLANTS.energyMushroom.pickupTtlMs;

export const RADISH_CONFIG = Object.freeze({
  label: "Radish Level 1",
  ...PHASE_ONE_PLANTS.radish,
  cost: PHASE_ONE_PLANTS.radish.plantingEnergyCost,
  cooldown: PHASE_ONE_PLANTS.radish.cooldownMs
});

export const MUSHROOM_CONFIG = Object.freeze({
  label: "Energy Mushroom",
  cost: PHASE_ONE_PLANTS.energyMushroom.plantingEnergyCost,
  seedPacketRechargeMs: PHASE_ONE_PLANTS.energyMushroom.seedPacketRechargeMs,
  hp: PHASE_ONE_PLANTS.energyMushroom.hp,
  energy: PHASE_ONE_PLANTS.energyMushroom.energyPerPickup,
  productionInterval: PHASE_ONE_PLANTS.energyMushroom.productionIntervalMs
});
export const PUMPKIN_CONFIG = Object.freeze({ label: "Pumpkin", ...PHASE_ONE_PLANTS.pumpkin, cost: PHASE_ONE_PLANTS.pumpkin.plantingEnergyCost });
export const PINEAPPLE_CONFIG = Object.freeze({ label: "Pineapple", ...PHASE_ONE_PLANTS.pineapple, cost: PHASE_ONE_PLANTS.pineapple.plantingEnergyCost });
export const HAZELNUT_CONFIG = Object.freeze({ label: "Hazelnut", ...PHASE_ONE_PLANTS.hazelnut, cost: PHASE_ONE_PLANTS.hazelnut.plantingEnergyCost });
export const MANGO_CONFIG = Object.freeze({ label: "Mango", ...PHASE_ONE_PLANTS.mango, cost: PHASE_ONE_PLANTS.mango.plantingEnergyCost });
export const SNOW_THROWER_CONFIG = Object.freeze({ label: "Snow Thrower", ...PHASE_ONE_PLANTS.snowThrower, cost: PHASE_ONE_PLANTS.snowThrower.plantingEnergyCost });
export const ELECTRIC_MUSHROOM_CONFIG = Object.freeze({
  label: "Electric Mushroom",
  ...PHASE_ONE_PLANTS["electric-mushroom"],
  cost: PHASE_ONE_PLANTS["electric-mushroom"].plantingEnergyCost
});

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

// Device storage is player-controlled and must never be treated as currency.
// Until server-verified rewards are available, local play has no coin balance.
export function loadSavedCoins(_storage) {
  return 0;
}

// Deliberately fail closed: there is no trusted client-side currency write path.
export function saveCoins(_storage, _value) {
  return false;
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

// Stage access is not granted from editable browser storage. A future trusted
// cloud progression response must authorize each stage before it is entered.
export function loadUnlockedStage(_storage) {
  return 1;
}

export const STARTING_PLANT_IDS = Object.freeze(["radish", "mushroom"]);
export const CAMPAIGN_PLANT_REWARDS = Object.freeze({
  1: "pumpkin",
  2: "pineapple",
  3: "hazelnut",
  4: "mango",
  5: "snow-thrower"
});

function readCampaignProgress(storage) {
  if (!storage || typeof storage.getItem !== "function") return {};
  try {
    const data = JSON.parse(storage.getItem(CAMPAIGN_PROGRESS_KEY) || "{}");
    return data && data.version === 1 ? data : {};
  } catch {
    return {};
  }
}

// Only starter plants are available until unlocks are granted by a trusted
// server-side completion flow. Browser storage is never proof of ownership.
export function loadUnlockedPlantIds(_storage) {
  return [...STARTING_PLANT_IDS];
}

// Client-side victory claims are not authoritative and cannot unlock rewards.
export function unlockPlantReward(_storage, _completedStage) {
  return false;
}

// A browser-reported victory cannot authorize campaign progression.
export function unlockNextStage(_storage, _completedStage) {
  return false;
}


export const CAMPAIGN_MONSTER_IDS = Object.freeze(["cave-brute", "dust-skitter", "stonehide", "alpha-brute"]);

export function loadDiscoveredMonsterIds(storage) {
  const data = readCampaignProgress(storage);
  if (!Array.isArray(data.discoveredMonsterIds)) return [];
  return [...new Set(data.discoveredMonsterIds.filter((id) => CAMPAIGN_MONSTER_IDS.includes(id)))];
}

export function recordMonsterDiscovery(storage, monsterId) {
  if (!CAMPAIGN_MONSTER_IDS.includes(monsterId) || !storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") return false;
  const current = readCampaignProgress(storage);
  const discoveredMonsterIds = [...new Set([...loadDiscoveredMonsterIds(storage), monsterId])];
  try {
    storage.setItem(CAMPAIGN_PROGRESS_KEY, JSON.stringify({
      ...current,
      version: 1,
      unlockedStage: loadUnlockedStage(storage),
      completedStages: Array.isArray(current.completedStages) ? current.completedStages : [],
      unlockedPlantIds: loadUnlockedPlantIds(storage),
      discoveredMonsterIds
    }));
    return true;
  } catch {
    return false;
  }
}
