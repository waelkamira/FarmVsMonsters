import {
  PHASE_ONE_ENERGY,
  PHASE_ONE_PLANTS,
  PHASE_ONE_WAVE_SIZES,
  getMonsterSpawnIntervalMs
} from "./phaseOneCombatContract.mjs";

const PLANT_RULES = Object.freeze({
  radish: PHASE_ONE_PLANTS.radish,
  mushroom: PHASE_ONE_PLANTS.energyMushroom,
  pumpkin: PHASE_ONE_PLANTS.pumpkin,
  pineapple: PHASE_ONE_PLANTS.pineapple,
  hazelnut: PHASE_ONE_PLANTS.hazelnut,
  mango: PHASE_ONE_PLANTS.mango,
  "snow-thrower": PHASE_ONE_PLANTS.snowThrower
});

function validEnergy(value) {
  return Number.isFinite(value) && value >= 0;
}

export function resolvePlantPlacement({
  energy,
  plants,
  type,
  col,
  row,
  columns,
  rows
} = {}) {
  if (!validEnergy(energy) || !Array.isArray(plants)) {
    return { ok: false, reason: "INVALID_PLACEMENT_STATE" };
  }
  const config = PLANT_RULES[type];
  if (!config) return { ok: false, reason: "UNKNOWN_PLANT_TYPE" };
  if (
    !Number.isInteger(col) || !Number.isInteger(row) ||
    !Number.isInteger(columns) || !Number.isInteger(rows) ||
    columns < 1 || rows < 1 ||
    col < 0 || col >= columns || row < 0 || row >= rows
  ) {
    return { ok: false, reason: "CELL_OUT_OF_BOUNDS" };
  }
  if (plants.some((plant) => plant?.alive && plant.col === col && plant.row === row)) {
    return { ok: false, reason: "CELL_OCCUPIED" };
  }
  if (energy < config.plantingEnergyCost) {
    return { ok: false, reason: "INSUFFICIENT_ENERGY" };
  }

  return {
    ok: true,
    reason: "PLANT_PLACED",
    energy: energy - config.plantingEnergyCost,
    plant: Object.freeze({
      type,
      col,
      row,
      hp: config.hp,
      alive: true,
      energyCost: config.plantingEnergyCost
    })
  };
}

export function resolvePlantUproot({ energy, plant } = {}) {
  if (!validEnergy(energy) || !plant || plant.alive !== true) {
    return { ok: false, reason: "INVALID_UPROOT_STATE" };
  }
  const configuredCost = PLANT_RULES[plant.type]?.plantingEnergyCost;
  if (!Number.isFinite(configuredCost)) {
    return { ok: false, reason: "UNKNOWN_PLANT_TYPE" };
  }
  if (plant.energyCost !== undefined && plant.energyCost !== configuredCost) {
    return { ok: false, reason: "PLANT_COST_MISMATCH" };
  }

  // Preserve the live game rule: manual uprooting refunds the full planting
  // cost, even if that takes energy above the normal pickup cap.
  return {
    ok: true,
    reason: "PLANT_UPROOTED",
    energy: energy + configuredCost,
    refund: configuredCost
  };
}

export function resolveEnergyPickup(energy, requestedAmount) {
  const current = validEnergy(energy)
    ? Math.min(PHASE_ONE_ENERGY.maximum, energy)
    : 0;
  const amount = Number.isFinite(requestedAmount)
    ? Math.max(0, requestedAmount)
    : 0;
  const collected = Math.min(amount, PHASE_ONE_ENERGY.maximum - current);
  return Object.freeze({
    energy: current + collected,
    collected
  });
}

export function applyHitPointsDamage(currentHp, damage) {
  if (
    !Number.isFinite(currentHp) || currentHp < 0 ||
    !Number.isFinite(damage) || damage < 0
  ) {
    throw new RangeError("INVALID_HIT_POINTS_DAMAGE");
  }
  const damageApplied = Math.min(currentHp, damage);
  const hp = Math.max(0, currentHp - damageApplied);
  return Object.freeze({
    hp,
    damageApplied,
    defeated: hp === 0
  });
}

export function resolveMonsterLaneStep({
  localX,
  speed,
  deltaSeconds,
  blockerLocalX = null,
  biteReach = 0
} = {}) {
  if (
    !Number.isFinite(localX) ||
    !Number.isFinite(speed) || speed < 0 ||
    !Number.isFinite(deltaSeconds) || deltaSeconds < 0 ||
    (blockerLocalX !== null && !Number.isFinite(blockerLocalX)) ||
    !Number.isFinite(biteReach) || biteReach < 0
  ) {
    throw new RangeError("INVALID_MONSTER_LANE_STEP");
  }

  const proposedLocalX = localX - speed * deltaSeconds;
  if (blockerLocalX === null) {
    return Object.freeze({ localX: proposedLocalX, stoppedByPlant: false });
  }

  const stopLocalX = blockerLocalX + biteReach;
  const nextLocalX = Math.max(proposedLocalX, stopLocalX);
  return Object.freeze({
    localX: nextLocalX,
    stoppedByPlant: nextLocalX === stopLocalX
  });
}

export function resolveMonsterFreezeStep(remainingMs, deltaMs) {
  if (!Number.isFinite(remainingMs) || remainingMs < 0 ||
      !Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError("INVALID_MONSTER_FREEZE_STEP");
  }
  const nextRemainingMs = Math.max(0, remainingMs - deltaMs);
  return Object.freeze({
    remainingMs: nextRemainingMs,
    isFrozen: nextRemainingMs > 0
  });
}

export function resolveProjectileLaneStep({ localX, speed, deltaSeconds } = {}) {
  if (
    !Number.isFinite(localX) ||
    !Number.isFinite(speed) || speed < 0 ||
    !Number.isFinite(deltaSeconds) || deltaSeconds < 0
  ) {
    throw new RangeError("INVALID_PROJECTILE_LANE_STEP");
  }
  return localX + speed * deltaSeconds;
}

export function selectLaneBlocker({ plants, row, monsterLocalX, maxOvershoot = 0 } = {}) {
  if (!Array.isArray(plants) || !Number.isInteger(row) || !Number.isFinite(monsterLocalX) || !Number.isFinite(maxOvershoot) || maxOvershoot < 0) {
    throw new RangeError("INVALID_LANE_BLOCKER_QUERY");
  }
  let nearest = null;
  for (const candidate of plants) {
    if (
      !candidate?.plant?.alive ||
      candidate.plant.row !== row ||
      !Number.isFinite(candidate.localX) ||
      candidate.localX - monsterLocalX > maxOvershoot
    ) continue;
    if (!nearest || candidate.localX > nearest.localX) nearest = candidate;
  }
  return nearest?.plant ?? null;
}

export function selectProjectileTarget({ monsters, row, localX, collisionRadius } = {}) {
  if (
    !Array.isArray(monsters) || !Number.isInteger(row) ||
    !Number.isFinite(localX) || !Number.isFinite(collisionRadius) || collisionRadius < 0
  ) throw new RangeError("INVALID_PROJECTILE_TARGET_QUERY");

  // Preserve the live game's first-match rule (monster array order).
  return monsters.find((monster) =>
    monster?.alive &&
    monster.row === row &&
    Number.isFinite(monster.localX) &&
    Math.abs(monster.localX - localX) <= collisionRadius * (monster.widthScale || 1)
  ) ?? null;
}

export function selectFarmerMeleeTarget({ monsters, row, farmerX, reach } = {}) {
  if (
    !Array.isArray(monsters) || !Number.isInteger(row) ||
    !Number.isFinite(farmerX) || !Number.isFinite(reach) || reach < 0
  ) throw new RangeError("INVALID_MELEE_TARGET_QUERY");

  let target = null;
  let nearestDistance = Infinity;
  for (const monster of monsters) {
    if (!monster?.alive || monster.row !== row || !Number.isFinite(monster.x)) continue;
    const distance = Math.abs(monster.x - farmerX);
    if (distance > reach || distance >= nearestDistance) continue;
    target = monster;
    nearestDistance = distance;
  }
  return target;
}

export function selectDragonFireballTarget(plants) {
  if (!Array.isArray(plants)) throw new TypeError("INVALID_DRAGON_TARGET_LIST");
  let weakest = null;
  for (const plant of plants) {
    if (!plant?.alive || !Number.isFinite(plant.hp)) continue;
    if (!weakest || plant.hp < weakest.hp) weakest = plant;
  }
  return weakest;
}

export function advanceCooldown(remainingMs, deltaMs) {
  if (!Number.isFinite(remainingMs) || !Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError("INVALID_COOLDOWN_STEP");
  }
  return remainingMs - deltaMs;
}

export function resolveBiteAttack({ cooldownMs, deltaMs, intervalMs } = {}) {
  if (
    !Number.isFinite(cooldownMs) ||
    !Number.isFinite(deltaMs) || deltaMs < 0 ||
    !Number.isFinite(intervalMs) || intervalMs <= 0
  ) throw new RangeError("INVALID_BITE_ATTACK_TIMING");
  const remainingMs = advanceCooldown(cooldownMs, deltaMs);
  const shouldAttack = remainingMs <= 0;
  return Object.freeze({
    shouldAttack,
    cooldownMs: shouldAttack ? intervalMs : remainingMs
  });
}

export function resolveDustSkitterMotionStep({
  isJumping,
  jumpCooldownMs,
  jumpElapsedMs,
  jumpDurationMs,
  deltaMs,
  jumpSpeedMultiplier,
  jumpVisualHeight,
  visualScale,
  nextJumpDurationMs,
  nextJumpResetCooldownMs,
  burstCooldownMs,
  burstRemainingMs,
  burstDurationMs,
  burstSpeedMultiplier,
  nextBurstCooldownMs,
  enableJump = true
} = {}) {
  const finite = [
    deltaMs, burstCooldownMs, burstRemainingMs, burstDurationMs, burstSpeedMultiplier,
    ...(enableJump ? [jumpCooldownMs, jumpElapsedMs, jumpSpeedMultiplier, jumpVisualHeight, visualScale] : [])
  ].every(Number.isFinite);
  if (
    typeof isJumping !== "boolean" || typeof enableJump !== "boolean" || !finite || deltaMs < 0 ||
    (enableJump && (jumpSpeedMultiplier <= 0 || visualScale < 0)) ||
    burstDurationMs < 0 || burstSpeedMultiplier <= 0 ||
    (isJumping && (!Number.isFinite(jumpDurationMs) || jumpDurationMs <= 0))
  ) throw new RangeError("INVALID_DUST_SKITTER_STEP");

  let jumping = isJumping;
  let jumpElapsed = jumpElapsedMs;
  let jumpDuration = jumpDurationMs;
  let jumpCooldown = jumpCooldownMs;
  let jumpStarted = false;
  let jumpLanded = false;
  let jumpOffset = 0;
  let movementMultiplier = 1;
  if (!enableJump) {
    jumping = false;
    jumpElapsed = 0;
    jumpOffset = 0;
  }

  if (enableJump) {
    jumpCooldown = advanceCooldown(jumpCooldown, deltaMs);
    if (!jumping && jumpCooldown <= 0) {
      if (!Number.isFinite(nextJumpDurationMs) || nextJumpDurationMs <= 0) {
        throw new RangeError("MISSING_DUST_SKITTER_JUMP_DURATION");
      }
      jumping = true;
      jumpElapsed = 0;
      jumpDuration = nextJumpDurationMs;
      jumpStarted = true;
    }
  
    if (jumping) {
      jumpElapsed += deltaMs;
      const progress = Math.max(0, Math.min(1, jumpElapsed / jumpDuration));
      jumpOffset = -Math.sin(progress * Math.PI) * jumpVisualHeight * visualScale;
      movementMultiplier *= jumpSpeedMultiplier;
      if (progress >= 1) {
        jumping = false;
        jumpElapsed = 0;
        if (!Number.isFinite(nextJumpResetCooldownMs) || nextJumpResetCooldownMs < 0) {
          throw new RangeError("MISSING_DUST_SKITTER_JUMP_RESET");
        }
        jumpCooldown = nextJumpResetCooldownMs;
        jumpLanded = true;
        jumpOffset = 0;
      }
    }
  
  }
  let burstCooldown = advanceCooldown(burstCooldownMs, deltaMs);
  let burstRemaining = burstRemainingMs;
  let burstStarted = false;
  if (burstCooldown <= 0 && burstRemaining <= 0) {
    if (!Number.isFinite(nextBurstCooldownMs) || nextBurstCooldownMs < 0) {
      throw new RangeError("MISSING_DUST_SKITTER_BURST_RESET");
    }
    burstRemaining = burstDurationMs;
    burstCooldown = nextBurstCooldownMs;
    burstStarted = true;
  }
  if (burstRemaining > 0) {
    burstRemaining = Math.max(0, burstRemaining - deltaMs);
    movementMultiplier *= burstSpeedMultiplier;
  }

  return Object.freeze({
    isJumping: jumping,
    jumpCooldownMs: jumpCooldown,
    jumpElapsedMs: jumpElapsed,
    jumpDurationMs: jumpDuration,
    jumpOffset,
    jumpStarted,
    jumpLanded,
    burstCooldownMs: burstCooldown,
    burstRemainingMs: burstRemaining,
    burstStarted,
    movementMultiplier
  });
}

export function resolveMonsterArchetype(wave, spawnIndex) {
  if (
    !Number.isInteger(wave) || wave < 1 || wave > PHASE_ONE_WAVE_SIZES.length ||
    !Number.isInteger(spawnIndex) || spawnIndex < 0 ||
    spawnIndex >= PHASE_ONE_WAVE_SIZES.reduce((sum, count) => sum + count, 0)
  ) throw new RangeError("INVALID_MONSTER_SPAWN_INDEX");

  // Stage 1 teaches one enemy at a time. The first three waves contain
  // only the baseline cave brute; wave 4 demonstrates one fast scout, and
  // wave 5 introduces one armoured stonehide. Alpha brutes are reserved
  // for a later campaign stage.
  if (wave === 5 && spawnIndex === PHASE_ONE_WAVE_SIZES[4] - 1) return "stonehide";
  if (wave === 4 && spawnIndex === PHASE_ONE_WAVE_SIZES[3] - 1) return "dust-skitter";
  return "cave-brute";
}

export function resolveWaveSpawnStep({
  wave,
  totalWaves = PHASE_ONE_WAVE_SIZES.length,
  waveSize,
  spawnedThisWave,
  intermissionMs,
  spawnTimerMs,
  deltaMs
} = {}) {
  if (
    !Number.isInteger(totalWaves) || totalWaves !== PHASE_ONE_WAVE_SIZES.length ||
    !Number.isInteger(wave) || wave < 1 || wave > totalWaves ||
    !Number.isInteger(waveSize) || waveSize !== PHASE_ONE_WAVE_SIZES[wave - 1] ||
    !Number.isInteger(spawnedThisWave) || spawnedThisWave < 0 || spawnedThisWave > waveSize ||
    !Number.isFinite(intermissionMs) || intermissionMs < 0 ||
    !Number.isFinite(spawnTimerMs) ||
    !Number.isFinite(deltaMs) || deltaMs < 0
  ) throw new RangeError("INVALID_WAVE_SPAWN_STATE");

  const nextIntermissionMs = intermissionMs > 0
    ? Math.max(0, intermissionMs - deltaMs)
    : 0;
  let nextSpawnTimerMs = spawnTimerMs;
  let nextSpawnedThisWave = spawnedThisWave;
  let shouldSpawn = false;

  if (nextIntermissionMs <= 0 && wave <= totalWaves && spawnedThisWave < waveSize) {
    nextSpawnTimerMs -= deltaMs;
    if (nextSpawnTimerMs <= 0) {
      shouldSpawn = true;
      nextSpawnedThisWave += 1;
      nextSpawnTimerMs = getMonsterSpawnIntervalMs(wave);
    }
  }

  return Object.freeze({
    shouldSpawn,
    spawnedThisWave: nextSpawnedThisWave,
    intermissionMs: nextIntermissionMs,
    spawnTimerMs: nextSpawnTimerMs,
    remainingIntermissionSecond: Math.ceil(nextIntermissionMs / 1000)
  });
}
