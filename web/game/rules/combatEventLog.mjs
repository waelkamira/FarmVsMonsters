import { PHASE_ONE_PLANT_EVENT_TYPES } from "./phaseOneCombatContract.mjs";

const PLANT_EVENT_TYPES = new Set(PHASE_ONE_PLANT_EVENT_TYPES);
const EVENT_TYPES = new Set(["plant_placed", "plant_uprooted", "energy_spawned", "energy_collected", "energy_discarded", "monster_spawned", "monster_bite", "monster_moved"]);
const MAX_EVENTS = 10000;

function validCell(payload) {
  return Number.isInteger(payload?.col) && payload.col >= 0 && payload.col < 8 && Number.isInteger(payload?.row) && payload.row >= 0 && payload.row < 5;
}
function validPlantType(value) {
  return PLANT_EVENT_TYPES.has(value);
}
function validPickupId(value) { return typeof value === "string" && /^pickup-\d+$/.test(value); }
function normalizePayload(type, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("INVALID_COMBAT_EVENT_PAYLOAD");
  if (type === "plant_placed" || type === "plant_uprooted") {
    if (!validPlantType(payload.type) || !validCell(payload)) throw new RangeError("INVALID_PLANT_EVENT");
    return Object.freeze({ type: payload.type, col: payload.col, row: payload.row });
  }
  if (type === "energy_spawned") {
    if (!validCell({ col: payload.sourceCol, row: payload.sourceRow }) || !validPickupId(payload.pickupId) || !Number.isSafeInteger(payload.amount) || payload.amount <= 0) throw new RangeError("INVALID_ENERGY_SPAWN_EVENT");
    return Object.freeze({ sourceCol: payload.sourceCol, sourceRow: payload.sourceRow, pickupId: payload.pickupId, amount: payload.amount });
  }
  if (type === "energy_collected") {
    if (!validPickupId(payload.pickupId) || !Number.isSafeInteger(payload.amount) || payload.amount <= 0) throw new RangeError("INVALID_ENERGY_COLLECTION_EVENT");
    return Object.freeze({ pickupId: payload.pickupId, amount: payload.amount });
  }
  if (type === "monster_spawned") {
    if (typeof payload.monsterId !== "string" || !/^monster-\d+$/.test(payload.monsterId) || !Number.isInteger(payload.wave) || payload.wave < 1 || payload.wave > 5 || !Number.isInteger(payload.spawnIndex) || payload.spawnIndex < 0 || !Number.isInteger(payload.row) || payload.row < 0 || payload.row >= 5 || typeof payload.archetype !== "string" || !Number.isFinite(payload.hp) || payload.hp <= 0 || !Number.isFinite(payload.speed) || payload.speed <= 0 || !Number.isFinite(payload.localX)) throw new RangeError("INVALID_MONSTER_SPAWN_EVENT");
    return Object.freeze({ monsterId: payload.monsterId, wave: payload.wave, spawnIndex: payload.spawnIndex, row: payload.row, archetype: payload.archetype, hp: payload.hp, speed: payload.speed, localX: payload.localX });
  }
  if (type === "monster_moved") {
    if (typeof payload.monsterId !== "string" || !/^monster-\d+$/.test(payload.monsterId) || !Number.isFinite(payload.distance) || payload.distance < 0 || !Number.isInteger(payload.deltaMs) || payload.deltaMs < 0 || !(payload.blockerCol === null || (Number.isInteger(payload.blockerCol) && payload.blockerCol >= 0 && payload.blockerCol < 8)) || !Number.isFinite(payload.biteReach) || payload.biteReach < 0 || payload.biteReach > 1.5) throw new RangeError("INVALID_MONSTER_MOVEMENT_EVENT");
    return Object.freeze({ monsterId: payload.monsterId, distance: payload.distance, deltaMs: payload.deltaMs, blockerCol: payload.blockerCol, biteReach: payload.biteReach });
  }
  if (type === "monster_bite") {
    if (typeof payload.monsterId !== "string" || !/^monster-\d+$/.test(payload.monsterId) || !validCell({ col: payload.plantCol, row: payload.plantRow }) || !Number.isFinite(payload.damage) || payload.damage <= 0) throw new RangeError("INVALID_MONSTER_BITE_EVENT");
    return Object.freeze({ monsterId: payload.monsterId, plantCol: payload.plantCol, plantRow: payload.plantRow, damage: payload.damage });
  }
  if (type === "energy_discarded") {
    if (!validPickupId(payload.pickupId)) throw new RangeError("INVALID_ENERGY_DISCARD_EVENT");
    return Object.freeze({ pickupId: payload.pickupId });
  }
  throw new TypeError("UNKNOWN_COMBAT_EVENT");
}
export function createCombatEventLog({ seed, rulesVersion } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || typeof rulesVersion !== "string" || !rulesVersion.trim()) throw new TypeError("INVALID_COMBAT_EVENT_LOG_HEADER");
  return Object.freeze({ schemaVersion: 1, seed: seed >>> 0, rulesVersion: rulesVersion.trim(), nextSequence: 0, lastTick: 0, events: Object.freeze([]) });
}
export function appendCombatEvent(log, event) {
  if (!log || log.schemaVersion !== 1 || !Array.isArray(log.events) || log.events.length >= MAX_EVENTS || !event || !Number.isSafeInteger(event.tick) || event.tick < log.lastTick || !EVENT_TYPES.has(event.type)) throw new RangeError("INVALID_COMBAT_EVENT_ORDER_OR_LOG");
  const normalized = Object.freeze({ sequence: log.nextSequence, tick: event.tick, type: event.type, payload: normalizePayload(event.type, event.payload) });
  return Object.freeze({ ...log, nextSequence: log.nextSequence + 1, lastTick: event.tick, events: Object.freeze([...log.events, normalized]) });
}
export function validateCombatEventLog(log) {
  if (!log || log.schemaVersion !== 1 || !Number.isInteger(log.seed) || log.seed < 0 || log.seed > 0xffffffff || typeof log.rulesVersion !== "string" || !log.rulesVersion.trim() || !Array.isArray(log.events) || log.events.length > MAX_EVENTS) return false;
  let lastTick = 0;
  for (let index = 0; index < log.events.length; index += 1) {
    const event = log.events[index];
    if (event?.sequence !== index || !Number.isSafeInteger(event.tick) || event.tick < lastTick || !EVENT_TYPES.has(event.type)) return false;
    try { normalizePayload(event.type, event.payload); } catch { return false; }
    lastTick = event.tick;
  }
  return log.nextSequence === log.events.length && log.lastTick === lastTick;
}
