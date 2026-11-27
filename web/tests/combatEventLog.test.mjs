import test from "node:test";
import assert from "node:assert/strict";
import {
  PHASE_ONE_PLANT_EVENT_TYPES
} from "../game/rules/phaseOneCombatContract.mjs";
import {
  appendCombatEvent,
  createCombatEventLog,
  validateCombatEventLog
} from "../game/rules/combatEventLog.mjs";

test("every canonical plant type supports placement and uproot events", () => {
  for (const plantType of PHASE_ONE_PLANT_EVENT_TYPES) {
    for (const eventType of ["plant_placed", "plant_uprooted"]) {
      const log = appendCombatEvent(
        createCombatEventLog({ seed: 1, rulesVersion: "test" }),
        { tick: 0, type: eventType, payload: { type: plantType, col: 0, row: 0 } }
      );
      assert.equal(log.events[0].payload.type, plantType);
      assert.equal(validateCombatEventLog(log), true);
    }
  }
});

test("plant events reject unknown plant IDs and invalid board cells", () => {
  const base = createCombatEventLog({ seed: 1, rulesVersion: "test" });
  assert.throws(
    () => appendCombatEvent(base, {
      tick: 0,
      type: "plant_placed",
      payload: { type: "Unknown Plant!", col: 0, row: 0 }
    }),
    { message: "INVALID_PLANT_EVENT" }
  );
  assert.throws(
    () => appendCombatEvent(base, {
      tick: 0,
      type: "plant_placed",
      payload: { type: "mango", col: 8, row: 0 }
    }),
    { message: "INVALID_PLANT_EVENT" }
  );
});

test("Studio plant slugs support placement and uproot events without changing built-in IDs", () => {
  const base = createCombatEventLog({ seed: 7, rulesVersion: "studio-test" });
  const placed = appendCombatEvent(base, {
    tick: 0,
    type: "plant_placed",
    payload: { type: "bamboo-level-1", col: 3, row: 2 }
  });
  const uprooted = appendCombatEvent(placed, {
    tick: 1,
    type: "plant_uprooted",
    payload: { type: "bamboo-level-1", col: 3, row: 2 }
  });
  assert.equal(validateCombatEventLog(uprooted), true);
  assert.equal(uprooted.events[0].payload.type, "bamboo-level-1");
});
