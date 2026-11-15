import { resolvePlantPlacement, resolvePlantUproot, resolveEnergyPickup } from "./combatSimulation.mjs";
import { PHASE_ONE_ENERGY, PHASE_ONE_PLANTS, PHASE_ONE_COMBAT_CONTRACT_VERSION } from "./phaseOneCombatContract.mjs";
import { validateCombatEventLog } from "./combatEventLog.mjs";

export const PHASE_ONE_RULES_VERSION = `phase-one-v${PHASE_ONE_COMBAT_CONTRACT_VERSION}`;

export function createCombatReplayState() {
  return Object.freeze({ energy: PHASE_ONE_ENERGY.initial, plants: Object.freeze([]), appliedEvents: 0, lastTick: 0 });
}

function fail(state, reason, event = null) {
  return Object.freeze({ ok: false, reason, state, eventSequence: event?.sequence ?? null });
}

export function applyCombatReplayEvent(state, event) {
  if (!state || !Array.isArray(state.plants) || !Number.isFinite(state.energy) ||
      !event || !Number.isSafeInteger(event.sequence) || event.sequence !== state.appliedEvents ||
      !Number.isSafeInteger(event.tick) || event.tick < state.lastTick) {
    return fail(state, "INVALID_REPLAY_STATE_OR_ORDER", event);
  }

  if (event.type === "plant_placed") {
    const result = resolvePlantPlacement({ energy: state.energy, plants: state.plants, type: event.payload?.type, col: event.payload?.col, row: event.payload?.row, columns: 8, rows: 5 });
    if (!result.ok) return fail(state, result.reason, event);
    return Object.freeze({ ok: true, state: Object.freeze({
      energy: result.energy,
      plants: Object.freeze([...state.plants, result.plant]),
      appliedEvents: state.appliedEvents + 1,
      lastTick: event.tick
    }) });
  }

  if (event.type === "plant_uprooted") {
    const index = state.plants.findIndex((plant) => plant.alive && plant.type === event.payload?.type && plant.col === event.payload?.col && plant.row === event.payload?.row);
    if (index < 0) return fail(state, "PLANT_NOT_AVAILABLE_TO_UPROOT", event);
    const plant = state.plants[index];
    const result = resolvePlantUproot({ energy: state.energy, plant });
    if (!result.ok) return fail(state, result.reason, event);
    const plants = state.plants.slice();
    plants[index] = Object.freeze({ ...plant, alive: false });
    return Object.freeze({ ok: true, state: Object.freeze({ energy: result.energy, plants: Object.freeze(plants), appliedEvents: state.appliedEvents + 1, lastTick: event.tick }) });
  }

  if (event.type === "energy_collected") {
    const amount = event.payload?.amount;
    // Current phase-one energy pickups are mushroom drops of 15 energy.
    // The event log cannot yet prove that a pickup existed in the world, so
    // only the legal pickup denomination is accepted by this provisional reducer.
    if (!Number.isSafeInteger(amount) || amount !== PHASE_ONE_PLANTS.energyMushroom.energyPerPickup) {
      return fail(state, "UNVERIFIABLE_ENERGY_PICKUP_AMOUNT", event);
    }
    const result = resolveEnergyPickup(state.energy, amount);
    if (result.collected !== amount) return fail(state, "ENERGY_PICKUP_EXCEEDS_CAP", event);
    return Object.freeze({ ok: true, state: Object.freeze({ energy: result.energy, plants: state.plants, appliedEvents: state.appliedEvents + 1, lastTick: event.tick }) });
  }

  return fail(state, "UNSUPPORTED_REPLAY_EVENT", event);
}

export function replayCombatEventLog(log, { maxDurationMs = Number.MAX_SAFE_INTEGER } = {}) {
  if (!validateCombatEventLog(log)) return fail(createCombatReplayState(), "INVALID_EVENT_LOG");
  if (log.rulesVersion !== PHASE_ONE_RULES_VERSION) return fail(createCombatReplayState(), "RULES_VERSION_MISMATCH");
  if (!Number.isSafeInteger(maxDurationMs) || maxDurationMs < 0 || log.lastTick > maxDurationMs) return fail(createCombatReplayState(), "REPLAY_DURATION_EXCEEDED");
  let state = createCombatReplayState();
  for (const event of log.events) {
    const result = applyCombatReplayEvent(state, event);
    if (!result.ok) return result;
    state = result.state;
  }
  return Object.freeze({ ok: true, state, seed: log.seed, rulesVersion: log.rulesVersion });
}
