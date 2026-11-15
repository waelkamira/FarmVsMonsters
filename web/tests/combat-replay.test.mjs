import test from "node:test";
import assert from "node:assert/strict";
import { createCombatEventLog, appendCombatEvent } from "../game/rules/combatEventLog.mjs";
import { replayCombatEventLog, PHASE_ONE_RULES_VERSION } from "../game/rules/combatReplay.mjs";
const INTERVAL = 12000;
function makeLog(actions) { return actions.reduce((log, action) => appendCombatEvent(log, action), createCombatEventLog({ seed: 123, rulesVersion: PHASE_ONE_RULES_VERSION })); }
function ev(tick, type, payload) { return { tick, type, payload }; }

test("mushroom produces a 15-energy collectible after its 12-second cycle and it can be collected once", () => {
 const log=makeLog([ev(0,"plant_placed",{type:"mushroom",col:1,row:2}),ev(INTERVAL,"energy_spawned",{sourceCol:1,sourceRow:2,pickupId:"mushroom-1-2-1",amount:15}),ev(INTERVAL+100,"energy_collected",{pickupId:"mushroom-1-2-1",amount:15})]);
 const r=replayCombatEventLog(log); assert.equal(r.ok,true); assert.equal(r.state.energy,115); assert.equal(r.state.pickups.length,0); assert.equal(r.state.plants[0].productionCount,1);
});
test("rejects fabricated production, early production, and production from uprooted mushrooms", () => {
 const fabricated=makeLog([ev(12000,"energy_spawned",{sourceCol:0,sourceRow:0,pickupId:"mushroom-0-0-1",amount:15})]); assert.equal(replayCombatEventLog(fabricated).reason,"ENERGY_SOURCE_MUSHROOM_NOT_ALIVE");
 const early=makeLog([ev(0,"plant_placed",{type:"mushroom",col:0,row:0}),ev(11999,"energy_spawned",{sourceCol:0,sourceRow:0,pickupId:"mushroom-0-0-1",amount:15})]); assert.equal(replayCombatEventLog(early).reason,"MUSHROOM_PRODUCTION_TOO_EARLY");
 const removed=makeLog([ev(0,"plant_placed",{type:"mushroom",col:0,row:0}),ev(100,"plant_uprooted",{type:"mushroom",col:0,row:0}),ev(12000,"energy_spawned",{sourceCol:0,sourceRow:0,pickupId:"mushroom-0-0-1",amount:15})]); assert.equal(replayCombatEventLog(removed).reason,"MISSING_MUSHROOM_PRODUCTION_EVENT");
});
test("rejects collection without a spawned pickup, duplicate collection, and expired pickups", () => {
 const missing=makeLog([ev(100,"energy_collected",{pickupId:"mushroom-0-0-1",amount:15})]); assert.equal(replayCombatEventLog(missing).reason,"PICKUP_NOT_AVAILABLE");
 const duplicate=makeLog([ev(0,"plant_placed",{type:"mushroom",col:0,row:0}),ev(12000,"energy_spawned",{sourceCol:0,sourceRow:0,pickupId:"mushroom-0-0-1",amount:15}),ev(12001,"energy_collected",{pickupId:"mushroom-0-0-1",amount:15}),ev(12002,"energy_collected",{pickupId:"mushroom-0-0-1",amount:15})]); assert.equal(replayCombatEventLog(duplicate).reason,"PICKUP_NOT_AVAILABLE");
 const expired=makeLog([ev(0,"plant_placed",{type:"mushroom",col:0,row:0}),ev(12000,"energy_spawned",{sourceCol:0,sourceRow:0,pickupId:"mushroom-0-0-1",amount:15}),ev(24000,"energy_collected",{pickupId:"mushroom-0-0-1",amount:15})]); assert.equal(replayCombatEventLog(expired).reason,"PICKUP_EXPIRED");
});
test("enforces exact collected gain at the 300 energy cap and records full-bank discard", () => {
 const setup=[ev(0,"plant_placed",{type:"mushroom",col:0,row:0})];
 // Two mushrooms produce sequentially; collection gain is derived from the bank, not trusted from the client.
 const partial=makeLog([...setup,ev(12000,"energy_spawned",{sourceCol:0,sourceRow:0,pickupId:"mushroom-0-0-1",amount:15}),ev(12100,"energy_collected",{pickupId:"mushroom-0-0-1",amount:15})]);
 assert.equal(replayCombatEventLog(partial).ok,true);
 const wrong=makeLog([...setup,ev(12000,"energy_spawned",{sourceCol:0,sourceRow:0,pickupId:"mushroom-0-0-1",amount:15}),ev(12100,"energy_collected",{pickupId:"mushroom-0-0-1",amount:14})]); assert.equal(replayCombatEventLog(wrong).reason,"INVALID_ENERGY_COLLECTION_AMOUNT");
});
test("keeps existing player-action replay checks and rejects unknown rules versions", () => {
 const log=makeLog([ev(0,"plant_placed",{type:"radish",col:1,row:2}),ev(10,"plant_uprooted",{type:"radish",col:1,row:2})]);
 assert.equal(replayCombatEventLog(log).state.energy,150);
 assert.equal(replayCombatEventLog({...log,rulesVersion:"future"}).reason,"RULES_VERSION_MISMATCH");
});
