import { resolvePlantPlacement, resolvePlantUproot, resolveEnergyPickup, resolveMonsterLaneStep } from "./combatSimulation.mjs";
import { PHASE_ONE_ENERGY, PHASE_ONE_PLANTS, PHASE_ONE_COMBAT_CONTRACT_VERSION, PHASE_ONE_WAVE_SIZES, PHASE_ONE_BOARD, getPlantLaneLocalX, getMonsterCombatStats } from "./phaseOneCombatContract.mjs";
import { resolveMonsterArchetype } from "./combatSimulation.mjs";
import { validateCombatEventLog } from "./combatEventLog.mjs";

export const PHASE_ONE_RULES_VERSION = `phase-one-v${PHASE_ONE_COMBAT_CONTRACT_VERSION}`;
const MUSHROOM_INTERVAL = PHASE_ONE_PLANTS.energyMushroom.productionIntervalMs;
const MUSHROOM_VALUE = PHASE_ONE_PLANTS.energyMushroom.energyPerPickup;
const MUSHROOM_PICKUP_TTL_MS = PHASE_ONE_PLANTS.energyMushroom.pickupTtlMs;
export function createCombatReplayState() {
  return Object.freeze({ energy: PHASE_ONE_ENERGY.initial, plants: Object.freeze([]), pickups: Object.freeze([]), monsters: Object.freeze([]), nextMonsterSequence: 1, currentWave: 1, spawnedInWave: 0, nextPickupSequence: 1, appliedEvents: 0, lastTick: 0 });
}
function fail(state, reason, event = null) { return Object.freeze({ ok: false, reason, state, eventSequence: event?.sequence ?? null }); }
function overdueMushroom(state, tick, exceptPlant = null) {
  return state.plants.find((plant) => plant.alive && plant.type === "mushroom" && plant !== exceptPlant && plant.nextProductionAt < tick);
}
function nextState(state, event, patch) {
  return Object.freeze({ ok: true, state: Object.freeze({ ...state, ...patch, appliedEvents: state.appliedEvents + 1, lastTick: event.tick }) });
}
export function applyCombatReplayEvent(state, event) {
  if (!state || !Array.isArray(state.plants) || !Array.isArray(state.pickups) || !Number.isFinite(state.energy) || !event || !Number.isSafeInteger(event.sequence) || event.sequence !== state.appliedEvents || !Number.isSafeInteger(event.tick) || event.tick < state.lastTick) return fail(state, "INVALID_REPLAY_STATE_OR_ORDER", event);
  if (overdueMushroom(state, event.tick) && event.type !== "energy_spawned") return fail(state, "MISSING_MUSHROOM_PRODUCTION_EVENT", event);
  if (event.type === "plant_placed") {
    const result = resolvePlantPlacement({ energy: state.energy, plants: state.plants, type: event.payload?.type, col: event.payload?.col, row: event.payload?.row, columns: 8, rows: 5 });
    if (!result.ok) return fail(state, result.reason, event);
    const plant = Object.freeze({ ...result.plant, productionCount: 0, nextProductionAt: event.payload.type === "mushroom" ? event.tick + MUSHROOM_INTERVAL : null });
    return nextState(state, event, { energy: result.energy, plants: Object.freeze([...state.plants, plant]) });
  }
  if (event.type === "plant_uprooted") {
    const index = state.plants.findIndex((plant) => plant.alive && plant.type === event.payload?.type && plant.col === event.payload?.col && plant.row === event.payload?.row);
    if (index < 0) return fail(state, "PLANT_NOT_AVAILABLE_TO_UPROOT", event);
    const plant = state.plants[index];
    const result = resolvePlantUproot({ energy: state.energy, plant });
    if (!result.ok) return fail(state, result.reason, event);
    const plants = state.plants.slice(); plants[index] = Object.freeze({ ...plant, alive: false });
    return nextState(state, event, { energy: result.energy, plants: Object.freeze(plants) });
  }
  if (event.type === "energy_spawned") {
    const payload = event.payload ?? {};
    const index = state.plants.findIndex((plant) => plant.alive && plant.type === "mushroom" && plant.col === payload.sourceCol && plant.row === payload.sourceRow);
    if (index < 0) return fail(state, "ENERGY_SOURCE_MUSHROOM_NOT_ALIVE", event);
    const plant = state.plants[index];
    if (event.tick < plant.nextProductionAt) return fail(state, "MUSHROOM_PRODUCTION_TOO_EARLY", event);
    const firstDueIndex = state.plants.findIndex((candidate) => candidate.alive && candidate.type === "mushroom" && candidate.nextProductionAt <= event.tick);
    if (firstDueIndex !== index) return fail(state, "MUSHROOM_PRODUCTION_ORDER_MISMATCH", event);
    if (payload.amount !== MUSHROOM_VALUE) return fail(state, "INVALID_MUSHROOM_ENERGY_VALUE", event);
    const expectedId = `pickup-${state.nextPickupSequence}`;
    if (payload.pickupId !== expectedId || state.pickups.some((pickup) => pickup.id === payload.pickupId)) return fail(state, "INVALID_OR_DUPLICATE_PICKUP_ID", event);
    const plants = state.plants.slice();
    plants[index] = Object.freeze({ ...plant, productionCount: plant.productionCount + 1, nextProductionAt: plant.nextProductionAt + MUSHROOM_INTERVAL });
    const pickup = Object.freeze({ id: expectedId, sourceCol: plant.col, sourceRow: plant.row, amount: MUSHROOM_VALUE, spawnedAt: event.tick, expiresAt: event.tick + MUSHROOM_PICKUP_TTL_MS });
    return nextState(state, event, { plants: Object.freeze(plants), pickups: Object.freeze([...state.pickups, pickup]), nextPickupSequence: state.nextPickupSequence + 1 });
  }
  if (event.type === "monster_spawned") {
    const payload = event.payload ?? {};
    const waveSize = PHASE_ONE_WAVE_SIZES[state.currentWave - 1];
    if (payload.monsterId !== `monster-${state.nextMonsterSequence}` || payload.wave !== state.currentWave || payload.spawnIndex !== state.spawnedInWave || payload.spawnIndex >= waveSize) return fail(state, "INVALID_MONSTER_WAVE_SEQUENCE", event);
    const expectedArchetype = resolveMonsterArchetype(payload.wave, payload.spawnIndex);\n    if (payload.archetype !== expectedArchetype) return fail(state, "INVALID_MONSTER_ARCHETYPE", event);
    let profile;
    try { profile = getMonsterCombatStats(payload.archetype, payload.wave); } catch { return fail(state, "INVALID_MONSTER_PROFILE", event); }
    if (payload.hp !== profile.hp || payload.speed !== profile.speed || payload.localX !== PHASE_ONE_BOARD.spawnLocalX) return fail(state, "MONSTER_STATS_MISMATCH", event);
    const monster = Object.freeze({ id: payload.monsterId, wave: payload.wave, spawnIndex: payload.spawnIndex, row: payload.row, archetype: payload.archetype, hp: profile.hp, maxHp: profile.hp, speed: profile.speed, plantDamage: profile.plantDamage, attackIntervalMs: profile.attackIntervalMs, lastBiteAt: null, localX: payload.localX, lastMovementTick: event.tick, biteReach: 0, alive: true });
    const spawnedInWave = state.spawnedInWave + 1;
    const waveFinished = spawnedInWave === waveSize;
    return nextState(state, event, { monsters: Object.freeze([...state.monsters, monster]), nextMonsterSequence: state.nextMonsterSequence + 1, currentWave: waveFinished ? state.currentWave + 1 : state.currentWave, spawnedInWave: waveFinished ? 0 : spawnedInWave });
  }
  if (event.type === "monster_moved") {
    const payload = event.payload ?? {};
    const index = state.monsters.findIndex((monster) => monster.id === payload.monsterId && monster.alive);
    if (index < 0) return fail(state, "MONSTER_NOT_ALIVE", event);
    const monster = state.monsters[index];
    const elapsed = event.tick - monster.lastMovementTick;
    if (payload.deltaMs !== elapsed) return fail(state, "MONSTER_MOVEMENT_CLOCK_MISMATCH", event);
    const blocker = state.plants.filter((plant) => plant.alive && plant.type === "radish" && plant.row === monster.row && getPlantLaneLocalX(plant.col) < monster.localX).sort((a,b) => getPlantLaneLocalX(b.col) - getPlantLaneLocalX(a.col))[0] ?? null;
    if ((blocker?.col ?? null) !== payload.blockerCol) return fail(state, "MONSTER_MOVEMENT_BLOCKER_MISMATCH", event);
    if (!blocker && payload.biteReach !== 0) return fail(state, "INVALID_MONSTER_BITE_REACH", event);
    const maxSpeed = monster.speed * (monster.archetype === "dust-skitter" ? 1.848 : 1);
    const seconds = elapsed / 1000;
    const effectiveSpeed = seconds > 0 ? payload.distance / seconds : 0;
    if (effectiveSpeed > maxSpeed + 0.05) return fail(state, "MONSTER_MOVEMENT_TOO_FAST", event);
    const blockerLocalX = blocker ? getPlantLaneLocalX(blocker.col) : null;
    const expected = resolveMonsterLaneStep({ localX: monster.localX, speed: effectiveSpeed, deltaSeconds: seconds, blockerLocalX, biteReach: payload.biteReach });
    const expectedAtBaseSpeed = resolveMonsterLaneStep({ localX: monster.localX, speed: monster.speed, deltaSeconds: seconds, blockerLocalX, biteReach: payload.biteReach });
    const resolvedDistance = Math.max(0, monster.localX - expected.localX);
    if (Math.abs(resolvedDistance - payload.distance) > 0.05) return fail(state, "MONSTER_MOVEMENT_DISTANCE_MISMATCH", event);
    if (monster.archetype === "dust-skitter") {
      if (effectiveSpeed > 0 && effectiveSpeed < monster.speed - 0.05) return fail(state, "MONSTER_MOVEMENT_TOO_SLOW", event);
    } else if (Math.abs(expected.localX - expectedAtBaseSpeed.localX) > 0.1) {
      return fail(state, "MONSTER_MOVEMENT_SPEED_MISMATCH", event);
    }
    const monsters = state.monsters.slice();
    monsters[index] = Object.freeze({ ...monster, localX: expected.localX, lastMovementTick: event.tick, biteReach: payload.biteReach });
    return nextState(state, event, { monsters: Object.freeze(monsters) });
  }
  if (event.type === "monster_bite") {
    const payload = event.payload ?? {};
    const monsterIndex = state.monsters.findIndex((monster) => monster.id === payload.monsterId && monster.alive);
    const plantIndex = state.plants.findIndex((plant) => plant.alive && plant.type === "radish" && plant.col === payload.plantCol && plant.row === payload.plantRow);
    if (monsterIndex < 0) return fail(state, "MONSTER_NOT_ALIVE", event);
    if (plantIndex < 0) return fail(state, "BITE_TARGET_NOT_ALIVE_RADISH", event);
    const monster = state.monsters[monsterIndex];
    if (monster.row !== payload.plantRow || payload.damage !== monster.plantDamage || monster.localX > getPlantLaneLocalX(state.plants[plantIndex].col) + monster.biteReach) return fail(state, "INVALID_MONSTER_BITE_TARGET_OR_DAMAGE", event);
    if (monster.lastBiteAt !== null && event.tick - monster.lastBiteAt < monster.attackIntervalMs) return fail(state, "MONSTER_BITE_TOO_EARLY", event);
    const plants = state.plants.slice();
    const plant = plants[plantIndex];
    const damage = Math.min(plant.hp, monster.plantDamage);
    plants[plantIndex] = Object.freeze({ ...plant, hp: plant.hp - damage, alive: plant.hp - damage > 0 });
    const monsters = state.monsters.slice();
    monsters[monsterIndex] = Object.freeze({ ...monster, lastBiteAt: event.tick });
    return nextState(state, event, { plants: Object.freeze(plants), monsters: Object.freeze(monsters) });
  }
  if (event.type === "energy_collected" || event.type === "energy_discarded") {
    const pickup = state.pickups.find((item) => item.id === event.payload?.pickupId);
    if (!pickup) return fail(state, "PICKUP_NOT_AVAILABLE", event);
    if (event.tick >= pickup.expiresAt) return fail(state, "PICKUP_EXPIRED", event);
    if (event.type === "energy_discarded") {
      if (state.energy < PHASE_ONE_ENERGY.maximum) return fail(state, "CANNOT_DISCARD_COLLECTIBLE_BEFORE_ENERGY_CAP", event);
      return nextState(state, event, { pickups: Object.freeze(state.pickups.filter((item) => item.id !== pickup.id)) });
    }
    const collection = resolveEnergyPickup(state.energy, pickup.amount);
    if (collection.collected <= 0 || event.payload.amount !== collection.collected) return fail(state, "INVALID_ENERGY_COLLECTION_AMOUNT", event);
    return nextState(state, event, { energy: collection.energy, pickups: Object.freeze(state.pickups.filter((item) => item.id !== pickup.id)) });
  }
  return fail(state, "UNSUPPORTED_REPLAY_EVENT", event);
}
export function replayCombatEventLog(log, { maxDurationMs = Number.MAX_SAFE_INTEGER } = {}) {
  if (!validateCombatEventLog(log)) return fail(createCombatReplayState(), "INVALID_EVENT_LOG");
  if (log.rulesVersion !== PHASE_ONE_RULES_VERSION) return fail(createCombatReplayState(), "RULES_VERSION_MISMATCH");
  if (!Number.isSafeInteger(maxDurationMs) || maxDurationMs < 0 || log.lastTick > maxDurationMs) return fail(createCombatReplayState(), "REPLAY_DURATION_EXCEEDED");
  let state = createCombatReplayState();
  for (const event of log.events) { const result = applyCombatReplayEvent(state, event); if (!result.ok) return result; state = result.state; }
  return Object.freeze({ ok: true, state, seed: log.seed, rulesVersion: log.rulesVersion });
}
