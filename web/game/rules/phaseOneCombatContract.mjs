// Versioned, renderer-independent combat contract for Stage 1.
// Keep gameplay values here so a future trusted server simulator and the Phaser
// client consume the same rules instead of maintaining separate balance tables.
export const PHASE_ONE_COMBAT_CONTRACT_VERSION = 1;

// Stage 1 is a guided onboarding campaign: 30 ordinary monsters in five readable waves.
export const PHASE_ONE_WAVE_SIZES = Object.freeze([3, 5, 6, 7, 9]);
export const PHASE_ONE_BOARD = Object.freeze({ columns: 8, rows: 5, laneWidth: 420.823, spawnLocalX: 238.4115, homeLocalX: -300 });
export function getPlantLaneLocalX(col) {
  if (!Number.isInteger(col) || col < 0 || col >= PHASE_ONE_BOARD.columns) throw new RangeError("INVALID_PLANT_COLUMN");
  return ((col + 0.5) / PHASE_ONE_BOARD.columns) * PHASE_ONE_BOARD.laneWidth - PHASE_ONE_BOARD.laneWidth / 2;
}
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
    projectileSpeed: 320,
    projectileCollisionRadius: 24,
    plantingEnergyCost: 35,
    seedPacketRechargeMs: 5000,
    hp: 160,
    cooldownMs: 1450,
    range: 360
  }),
  energyMushroom: Object.freeze({
    plantingEnergyCost: 50,
    seedPacketRechargeMs: 8000,
    hp: 85,
    energyPerPickup: 15,
    productionIntervalMs: 12000,
    pickupTtlMs: 12000
  }),
  // Temporary playtest values; tune after hands-on balancing.

  pumpkin: Object.freeze({
    plantingEnergyCost: 75, seedPacketRechargeMs: 20000, hp: 520
  }),

  // Temporary pineapple prototype values for the first visual/combat playtest.
  pineapple: Object.freeze({
    projectileDamage: 42, projectileSpeed: 270, projectileCollisionRadius: 24,
    plantingEnergyCost: 70, seedPacketRechargeMs: 10000, hp: 140, cooldownMs: 2100, range: 360
  }),
  // Initial Hazelnut Level 1 playtest values; tune after hands-on testing.
  hazelnut: Object.freeze({
    projectileDamage: 38, projectileSpeed: 285, projectileCollisionRadius: 24,
    plantingEnergyCost: 65, seedPacketRechargeMs: 9000, hp: 130, cooldownMs: 1950, range: 360
  }),
  // Initial Mango Level 1 playtest values; tune after hands-on balancing.
  mango: Object.freeze({
    projectileDamage: 40, projectileSpeed: 275, projectileCollisionRadius: 24,
    plantingEnergyCost: 70, seedPacketRechargeMs: 12000, hp: 130, cooldownMs: 2100, range: 360
  }),
  snowThrower: Object.freeze({
    freezeProjectile: true, projectileSpeed: 300, projectileCollisionRadius: 28,
    freezeDurationMs: 2600, plantingEnergyCost: 90, seedPacketRechargeMs: 18000, hp: 150,
    cooldownMs: 3600, range: 360
  }),
  // Electric Mushroom is a visual/combat playtest prototype; tune after hands-on VFX review.
  "electric-mushroom": Object.freeze({
    projectileDamage: 22, projectileSpeed: 350, projectileCollisionRadius: 26,
    plantingEnergyCost: 80, seedPacketRechargeMs: 11000, hp: 115,
    cooldownMs: 1850, range: 360
  }),
});

// Event-log plant IDs are derived from the canonical plant rules so adding a
// configured plant automatically makes its placement/uproot events valid.
// The energy-producing mushroom uses the gameplay/event ID "mushroom".
export const PHASE_ONE_PLANT_EVENT_TYPES = Object.freeze(
  Object.keys(PHASE_ONE_PLANTS).map((type) => type === "energyMushroom" ? "mushroom" : type === "snowThrower" ? "snow-thrower" : type)
);

export const PHASE_ONE_FARMER = Object.freeze({
  clubDamage: 42,
  clubReachPx: 112
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

export const PHASE_ONE_MONSTER_SCALING = Object.freeze({
  baseHp: 65,
  hpPerWave: 4,
  baseSpeed: 8,
  speedPerWave: 1.35,
  maxBaseSpeed: 30
});

export const PHASE_ONE_MONSTERS = Object.freeze({
  "monster-01": Object.freeze({
    hitsToDefeat: 7, speedMultiplier: 1, maxSpeed: 30, plantDamage: 16,
    attackIntervalMs: 1150, incomingDamageMultiplier: 1, widthScale: 1,
    heightScale: 1, wobbleDurationMs: 520
  })
});

export function getMonsterCombatStats(archetype, wave) {
  const profile = PHASE_ONE_MONSTERS[archetype];
  if (!profile || !Number.isInteger(wave) || wave < 1 || wave > 10) {
    throw new RangeError("INVALID_MONSTER_COMBAT_INPUT");
  }

  const hp = profile.hitsToDefeat
    ? PHASE_ONE_PLANTS.radish.projectileDamage * profile.hitsToDefeat + (wave - 1) * 8
    : Math.round((PHASE_ONE_MONSTER_SCALING.baseHp + Math.floor(wave * PHASE_ONE_MONSTER_SCALING.hpPerWave)) * profile.hpMultiplier);
  const baseSpeed = Math.min(PHASE_ONE_MONSTER_SCALING.maxBaseSpeed, PHASE_ONE_MONSTER_SCALING.baseSpeed + (wave - 1) * PHASE_ONE_MONSTER_SCALING.speedPerWave);

  return Object.freeze({
    ...profile,
    hp,
    maxHp: hp,
    speed: Math.min(profile.maxSpeed, baseSpeed * profile.speedMultiplier)
  });
}

export function getMonsterIncomingDamageMultiplier() {
  return PHASE_ONE_MONSTERS["monster-01"].incomingDamageMultiplier;
}
