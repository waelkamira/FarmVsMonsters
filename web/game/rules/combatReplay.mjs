import { resolvePlantPlacement, resolvePlantUproot, resolveEnergyPickup } from "./combatSimulation.mjs";
import { PHASE_ONE_ENERGY, PHASE_ONE_PLANTS, PHASE_ONE_COMBAT_CONTRACT_VERSION } from "./phaseOneCombatContract.mjs";
import { MUSHROOM_PICKUP_TTL_MS } from "./phaseOneRules.mjs";
import { validateCombatEventLog } from "./combatEventLog.mjs";

export const PHASE_ONE_RULES_VERSION = `phase-one-v${PHASE_ONE_COMBAT_CONTRACT_VERSION}`;
const MUSHROOM_INTERVAL = PHASE_ONE_PLANTS.energyMushroom.productionIntervalMs;
const MUSHROOM_VALUE = PHASE_ONE_PLANTS.energyMushroom.energyPerPickup;
export function createCombatReplayState() {
  return Object.freeze({ energy: PHASE_ONE_ENERGY.initial, plants: Object.freeze([]), pickups: Object.freeze([]), appliedEvents: 0, lastTick: 0 });
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
    if (payload.amount !== MUSHROOM_VALUE) return fail(state, "INVALID_MUSHROOM_ENERGY_VALUE", event);
    const expectedId = `mushroom-${plant.col}-${plant.row}-${plant.productionCount + 1}`;
    if (payload.pickupId !== expectedId || state.pickups.some((pickup) => pickup.id === payload.pickupId)) return fail(state, "INVALID_OR_DUPLICATE_PICKUP_ID", event);
    const plants = state.plants.slice();
    plants[index] = Object.freeze({ ...plant, productionCount: plant.productionCount + 1, nextProductionAt: plant.nextProductionAt + MUSHROOM_INTERVAL });
    const pickup = Object.freeze({ id: expectedId, sourceCol: plant.col, sourceRow: plant.row, amount: MUSHROOM_VALUE, spawnedAt: event.tick, expiresAt: event.tick + MUSHROOM_PICKUP_TTL_MS });
    return nextState(state, event, { plants: Object.freeze(plants), pickups: Object.freeze([...state.pickups, pickup]) });
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
