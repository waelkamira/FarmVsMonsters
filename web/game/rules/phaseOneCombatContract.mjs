// Versioned, renderer-independent combat contract for Stage 1.
// Keep gameplay values here so a future trusted server simulator and the Phaser
// client consume the same rules instead of maintaining separate balance tables.
export const PHASE_ONE_COMBAT_CONTRACT_VERSION = 1;

export const PHASE_ONE_WAVE_SIZES = Object.freeze([3, 5, 6, 7, 9]);
export const PHASE_ONE_ENERGY = Object.freeze({ initial: 150, maximum: 300 });

export const PHASE_ONE_TIMING = Object.freeze({
  firstMonsterSpawnDelayMs: 1800,
  nextWaveSpawnDelayMs: 1600,
  waveIntermissionMs: 5000,
  minimumMonsterSpawnIntervalMs: 2300,
  monsterSpawnIntervalBaseMs: 5200,
  monsterSpawnIntervalWaveReductionMs: 120
});

export function getMonsterSpawnIntervalMs(wave) {
  if (!Number.isInteger(wave) || wave < 1 || wave > PHASE_ONE_WAVE_SIZES.length) {
    throw new RangeError("INVALID_WAVE_NUMBER");
  }
  return Math.max(
    PHASE_ONE_TIMING.minimumMonsterSpawnIntervalMs,
    PHASE_ONE_TIMING.monsterSpawnIntervalBaseMs - wave * PHASE_ONE_TIMING.monsterSpawnIntervalWaveReductionMs
  );
}

export const PHASE_ONE_REWARDS = Object.freeze({
  ordinaryMonsterDefeatCoins: 8
});

export const PHASE_ONE_PLANTS = Object.freeze({
  radish: Object.freeze({
    projectileDamage: 25,
    plantingEnergyCost: 35,
    hp: 160,
    cooldownMs: 1450,
    range: 360
  }),
  energyMushroom: Object.freeze({
    plantingEnergyCost: 50,
    hp: 85,
    energyPerPickup: 15,
    productionIntervalMs: 12000,
    pickupTtlMs: 12000
  })
});

export const PHASE_ONE_DRAGON = Object.freeze({
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

export const PHASE_ONE_MONSTERS = Object.freeze({
  "cave-brute": Object.freeze({
    hitsToDefeat: 7,
    speedMultiplier: 1,
    maxSpeed: 30,
    plantDamage: 16,
    attackIntervalMs: 1150,
    incomingDamageMultiplier: 1,
    widthScale: 1,
    heightScale: 1,
    wobbleDurationMs: 520
  }),
  "dust-skitter": Object.freeze({
    hpMultiplier: 0.52,
    speedMultiplier: 1.7,
    maxSpeed: 36,
    plantDamage: 8,
    attackIntervalMs: 850,
    incomingDamageMultiplier: 1,
    widthScale: 0.62,
    heightScale: 0.68,
    wobbleDurationMs: 350,
    burstDurationMs: 420,
    initialBurstCooldownMinMs: 1500,
    initialBurstCooldownMaxMs: 2300,
    burstSpeedMultiplier: 1.65,
    jumpSpeedMultiplier: 1.12,
    burstCooldownMinMs: 3000,
    burstCooldownMaxMs: 3900,
    jumpDurationMinMs: 480,
    jumpDurationMaxMs: 620,
    jumpCooldownMinMs: 1100,
    jumpCooldownMaxMs: 2600,
    jumpResetCooldownMinMs: 2100,
    jumpResetCooldownMaxMs: 3400
  }),
  "stonehide": Object.freeze({
    hpMultiplier: 2.2,
    speedMultiplier: 0.62,
    maxSpeed: 19,
    plantDamage: 23,
    attackIntervalMs: 1450,
    incomingDamageMultiplier: 0.7,
    bracedIncomingDamageMultiplier: 0.55,
    widthScale: 1.35,
    heightScale: 1.3,
    wobbleDurationMs: 760
  }),
  "alpha-brute": Object.freeze({
    hitsToDefeat: 14,
    speedMultiplier: 0.48,
    maxSpeed: 15,
    plantDamage: 32,
    attackIntervalMs: 1350,
    incomingDamageMultiplier: 0.85,
    widthScale: 2,
    heightScale: 2,
    wobbleDurationMs: 900
  })
});

export function getMonsterCombatStats(archetype, wave) {
  const profile = PHASE_ONE_MONSTERS[archetype];
  if (!profile || !Number.isInteger(wave) || wave < 1 || wave > 10) {
    throw new RangeError("INVALID_MONSTER_COMBAT_INPUT");
  }

  const hp = profile.hitsToDefeat
    ? PHASE_ONE_PLANTS.radish.projectileDamage * profile.hitsToDefeat
    : Math.round((65 + Math.floor(wave * 4)) * profile.hpMultiplier);
  const baseSpeed = Math.min(30, 8 + (wave - 1) * 1.35);

  return Object.freeze({
    ...profile,
    hp,
    maxHp: hp,
    speed: Math.min(profile.maxSpeed, baseSpeed * profile.speedMultiplier)
  });
}

export function getStonehideIncomingDamageMultiplier(isBraced) {
  const profile = PHASE_ONE_MONSTERS["stonehide"];
  return isBraced
    ? profile.incomingDamageMultiplier * profile.bracedIncomingDamageMultiplier
    : profile.incomingDamageMultiplier;
}
