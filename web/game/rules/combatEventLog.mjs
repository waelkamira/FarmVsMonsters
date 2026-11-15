const EVENT_TYPES = new Set(["plant_placed", "plant_uprooted", "energy_spawned", "energy_collected", "energy_discarded"]);
const MAX_EVENTS = 10000;

function validCell(payload) {
  return Number.isInteger(payload?.col) && payload.col >= 0 && payload.col < 8 && Number.isInteger(payload?.row) && payload.row >= 0 && payload.row < 5;
}
function validPickupId(value) { return typeof value === "string" && /^mushroom-\d+-\d+-\d+$/.test(value); }
function normalizePayload(type, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("INVALID_COMBAT_EVENT_PAYLOAD");
  if (type === "plant_placed" || type === "plant_uprooted") {
    if (!["radish", "mushroom"].includes(payload.type) || !validCell(payload)) throw new RangeError("INVALID_PLANT_EVENT");
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
