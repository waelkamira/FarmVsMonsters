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
  if (wave >= 5 && (spawnIndex + 1) % 5 === 0) return "stonehide";
  if (wave >= 3 && spawnIndex % 3 === 1) return "dust-skitter";
  return "cave-brute";
}
