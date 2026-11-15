export const PHASE_ONE_WAVE_SIZES = Object.freeze([10, 15, 20, 25, 30]);
export const PHASE_ONE_TOTAL_MONSTERS = PHASE_ONE_WAVE_SIZES.reduce((sum, count) => sum + count, 0);

export const INITIAL_ENERGY = 150;
export const MAX_ENERGY = 300;
export const MONSTER_KILL_COIN_REWARD = 8;
export const MUSHROOM_PICKUP_TTL_MS = 12_000;

export const RADISH_CONFIG = Object.freeze({
  label: "Radish",
  cost: 35,
  hp: 160,
  cooldown: 1450,
  range: 360
});

export const MUSHROOM_CONFIG = Object.freeze({
  label: "Energy Mushroom",
  cost: 50,
  hp: 85,
  energy: 15,
  productionInterval: 12_000
});

export function collectEnergy(currentEnergy, requestedAmount) {
  const energy = Number.isFinite(currentEnergy)
    ? Math.min(MAX_ENERGY, Math.max(0, currentEnergy))
    : 0;
  const amount = Number.isFinite(requestedAmount)
    ? Math.max(0, requestedAmount)
    : 0;
  const collected = Math.min(amount, MAX_ENERGY - energy);

  return {
    energy: energy + collected,
    collected
  };
}

export function isWaveComplete(spawnedCount, waveSize, livingMonsterCount) {
  return spawnedCount >= waveSize && livingMonsterCount === 0;
}

export function isPhaseOneVictory(wave, totalWaves, spawnedCount, waveSize, livingMonsterCount) {
  return wave === totalWaves && isWaveComplete(spawnedCount, waveSize, livingMonsterCount);
}

export function monsterArchetypeFor(wave, spawnIndex) {
  // Alpha Brutes are rare wave leaders: huge, exceptionally durable, and
  // dangerous to plants. Reserve them for the later waves.
  if (wave >= 4 && (spawnIndex + 1) % 10 === 0) return "alpha-brute";
  if (wave >= 5 && (spawnIndex + 1) % 5 === 0) return "stonehide";
  if (wave >= 3 && spawnIndex % 3 === 1) return "dust-skitter";
  return "cave-brute";
}


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
