import {
  PHASE_ONE_ENERGY,
  PHASE_ONE_PLANTS
} from "./phaseOneCombatContract.mjs";

const PLANT_RULES = Object.freeze({
  radish: PHASE_ONE_PLANTS.radish,
  mushroom: PHASE_ONE_PLANTS.energyMushroom
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

export function selectLaneBlocker({ plants, row, monsterLocalX } = {}) {
  if (!Array.isArray(plants) || !Number.isInteger(row) || !Number.isFinite(monsterLocalX)) {
    throw new RangeError("INVALID_LANE_BLOCKER_QUERY");
  }
  let nearest = null;
  for (const candidate of plants) {
    if (
      !candidate?.plant?.alive ||
      candidate.plant.type !== "radish" ||
      candidate.plant.row !== row ||
      !Number.isFinite(candidate.localX) ||
      candidate.localX >= monsterLocalX
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
