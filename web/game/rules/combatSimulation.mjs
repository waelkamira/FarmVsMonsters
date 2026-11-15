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
