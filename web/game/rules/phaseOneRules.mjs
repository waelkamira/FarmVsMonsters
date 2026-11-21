import { PHASE_ONE_PLANTS, PHASE_ONE_REWARDS, PHASE_ONE_WAVE_SIZES, PHASE_ONE_ENERGY } from "./phaseOneCombatContract.mjs";
import { resolveEnergyPickup, resolveMonsterArchetype } from "./combatSimulation.mjs";

// Twenty ordinary monsters across five guided onboarding waves. The dragon boss is separate.
export { PHASE_ONE_WAVE_SIZES };
export const PHASE_ONE_TOTAL_MONSTERS = PHASE_ONE_WAVE_SIZES.reduce((sum, count) => sum + count, 0);
export const CAMPAIGN_STAGE_COUNT = 10;
const CAMPAIGN_STAGE_MONSTER_COUNTS = Object.freeze([20, 25, 30, 36, 42, 48, 55, 62, 70, 80]);
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

export function loadUnlockedPlantIds(storage) {
  const data = readCampaignProgress(storage);
  const unlocked = new Set(STARTING_PLANT_IDS);
  if (Array.isArray(data.unlockedPlantIds)) {
    data.unlockedPlantIds.forEach((id) => {
      if (typeof id === "string" && id.trim()) unlocked.add(id);
    });
  } else if (Number.isInteger(data.unlockedStage) && data.unlockedStage >= 2) {
    // Backward compatibility: old saves that opened Stage 2 completed Stage 1.
    unlocked.add("pumpkin");
  }
  return [...unlocked];
}

export function unlockPlantReward(storage, completedStage) {
  const plantId = CAMPAIGN_PLANT_REWARDS[completedStage];
  if (!plantId || !storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") return false;
  const current = readCampaignProgress(storage);
  const unlockedPlantIds = [...new Set([...loadUnlockedPlantIds(storage), plantId])];
  try {
    storage.setItem(CAMPAIGN_PROGRESS_KEY, JSON.stringify({
      ...current,
      version: 1,
      unlockedStage: loadUnlockedStage(storage),
      completedStages: Array.isArray(current.completedStages) ? current.completedStages : [],
      unlockedPlantIds
    }));
    return true;
  } catch {
    return false;
  }
}

export function unlockNextStage(storage, completedStage) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") return false;
  if (!Number.isInteger(completedStage) || completedStage < 1 || completedStage > CAMPAIGN_STAGE_COUNT) return false;
  const current = readCampaignProgress(storage);
  const unlockedStage = Math.min(CAMPAIGN_STAGE_COUNT, Math.max(loadUnlockedStage(storage), completedStage + 1));
  try {
    storage.setItem(CAMPAIGN_PROGRESS_KEY, JSON.stringify({
      ...current,
      version: 1,
      unlockedStage,
      completedStages: [...new Set([
        ...(Array.isArray(current.completedStages) ? current.completedStages : []),
        ...Array.from({ length: unlockedStage - 1 }, (_, index) => index + 1)
      ])].sort((a, b) => a - b),
      unlockedPlantIds: loadUnlockedPlantIds(storage)
    }));
    return true;
  } catch {
    return false;
  }
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
