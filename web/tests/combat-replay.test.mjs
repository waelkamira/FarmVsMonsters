import test from "node:test";
import assert from "node:assert/strict";
import { createCombatEventLog, appendCombatEvent } from "../game/rules/combatEventLog.mjs";
import { replayCombatEventLog, PHASE_ONE_RULES_VERSION } from "../game/rules/combatReplay.mjs";

function makeLog(actions) {
  return actions.reduce((log, action, index) => appendCombatEvent(log, { tick: index * 100, ...action }), createCombatEventLog({ seed: 123, rulesVersion: PHASE_ONE_RULES_VERSION }));
}

test("replay validates legal plant placement, uproot refund, and energy collection", () => {
  const log = makeLog([
    { type: "plant_placed", payload: { type: "radish", col: 1, row: 2 } },
    { type: "plant_uprooted", payload: { type: "radish", col: 1, row: 2 } },
    { type: "energy_collected", payload: { amount: 15 } }
  ]);
  const result = replayCombatEventLog(log);
  assert.equal(result.ok, true);
  assert.equal(result.state.energy, 165);
  assert.equal(result.state.plants[0].alive, false);
});

test("replay rejects unaffordable planting and duplicate occupied cells", () => {
  const unaffordable = makeLog([
    { type: "plant_placed", payload: { type: "radish", col: 0, row: 0 } },
    { type: "plant_placed", payload: { type: "radish", col: 1, row: 0 } },
    { type: "plant_placed", payload: { type: "radish", col: 2, row: 0 } },
    { type: "plant_placed", payload: { type: "radish", col: 3, row: 0 } },
    { type: "plant_placed", payload: { type: "radish", col: 4, row: 0 } }
  ]);
  assert.equal(replayCombatEventLog(unaffordable).reason, "INSUFFICIENT_ENERGY");
  const occupied = makeLog([
    { type: "plant_placed", payload: { type: "mushroom", col: 0, row: 0 } },
    { type: "plant_placed", payload: { type: "radish", col: 0, row: 0 } }
  ]);
  assert.equal(replayCombatEventLog(occupied).reason, "CELL_OCCUPIED");
});

test("replay rejects uprooting missing plants and fabricated energy denominations", () => {
  const missing = makeLog([{ type: "plant_uprooted", payload: { type: "radish", col: 0, row: 0 } }]);
  assert.equal(replayCombatEventLog(missing).reason, "PLANT_NOT_AVAILABLE_TO_UPROOT");
  const fabricated = makeLog([{ type: "energy_collected", payload: { amount: 300 } }]);
  assert.equal(replayCombatEventLog(fabricated).reason, "UNVERIFIABLE_ENERGY_PICKUP_AMOUNT");
});

test("replay rejects unknown rules versions and event logs beyond the declared duration", () => {
  const valid = makeLog([{ type: "energy_collected", payload: { amount: 15 } }]);
  assert.equal(replayCombatEventLog({ ...valid, rulesVersion: "future-rules" }).reason, "RULES_VERSION_MISMATCH");
  assert.equal(replayCombatEventLog(valid, { maxDurationMs: 50 }).reason, "REPLAY_DURATION_EXCEEDED");
});
