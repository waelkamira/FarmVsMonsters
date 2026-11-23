import test from "node:test";
import assert from "node:assert/strict";
import { createCombatEventLog, appendCombatEvent, validateCombatEventLog } from "../game/rules/combatEventLog.mjs";

test("combat event log assigns contiguous sequence numbers and preserves tick order", () => {
  let log = createCombatEventLog({ seed: 42, rulesVersion: "phase-one-v1" });
  log = appendCombatEvent(log, { tick: 100, type: "plant_placed", payload: { type: "radish", col: 2, row: 1 } });
  log = appendCombatEvent(log, { tick: 100, type: "energy_collected", payload: { pickupId: "pickup-1", amount: 25 } });
  log = appendCombatEvent(log, { tick: 120, type: "plant_uprooted", payload: { type: "radish", col: 2, row: 1 } });
  assert.deepEqual(log.events.map(({ sequence }) => sequence), [0, 1, 2]);
  assert.equal(validateCombatEventLog(log), true);
});

test("combat event log rejects backwards ticks, invalid coordinates, and invalid energy", () => {
  const log = createCombatEventLog({ seed: 1, rulesVersion: "phase-one-v1" });
  assert.throws(() => appendCombatEvent(log, { tick: 1, type: "plant_placed", payload: { type: "radish", col: 8, row: 0 } }), /INVALID_PLANT_EVENT/);
  assert.throws(() => appendCombatEvent(log, { tick: 1, type: "energy_collected", payload: { pickupId: "pickup-1", amount: 0 } }), /INVALID_ENERGY_COLLECTION_EVENT/);
  const next = appendCombatEvent(log, { tick: 10, type: "energy_collected", payload: { pickupId: "pickup-1", amount: 5 } });
  assert.throws(() => appendCombatEvent(next, { tick: 9, type: "energy_collected", payload: { pickupId: "pickup-1", amount: 5 } }), /INVALID_COMBAT_EVENT_ORDER_OR_LOG/);
});

test("event log validation detects tampered sequences and payloads", () => {
  let log = createCombatEventLog({ seed: 9, rulesVersion: "phase-one-v1" });
  log = appendCombatEvent(log, { tick: 0, type: "plant_placed", payload: { type: "mushroom", col: 0, row: 4 } });
  assert.equal(validateCombatEventLog(log), true);
  const tampered = { ...log, events: [{ ...log.events[0], sequence: 4 }] };
  assert.equal(validateCombatEventLog(tampered), false);
});


test("combat event log accepts placement and uprooting for all six configured plant types", () => {
  for (const type of ["radish", "mushroom", "pumpkin", "pineapple", "hazelnut", "mango"]) {
    let log = createCombatEventLog({ seed: 7, rulesVersion: "phase-one-v1" });
    log = appendCombatEvent(log, { tick: 1, type: "plant_placed", payload: { type, col: 3, row: 2 } });
    log = appendCombatEvent(log, { tick: 2, type: "plant_uprooted", payload: { type, col: 3, row: 2 } });
    assert.equal(validateCombatEventLog(log), true, type);
    assert.deepEqual(log.events.map((event) => event.payload.type), [type, type]);
  }
});
