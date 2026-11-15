import test from "node:test";
import assert from "node:assert/strict";
import { createCombatEventLog, appendCombatEvent } from "../game/rules/combatEventLog.mjs";
import { replayCombatEventLog, PHASE_ONE_RULES_VERSION } from "../game/rules/combatReplay.mjs";
const INTERVAL = 12000;
function makeLog(actions) { return actions.reduce((log, action) => appendCombatEvent(log, action), createCombatEventLog({ seed: 123, rulesVersion: PHASE_ONE_RULES_VERSION })); }
function ev(tick, type, payload) { return { tick, type, payload }; }

test("mushroom produces a 15-energy collectible after its 12-second cycle and it can be collected once", () => {
 const log=makeLog([ev(0,"plant_placed",{type:"mushroom",col:1,row:2}),ev(INTERVAL,"energy_spawned",{sourceCol:1,sourceRow:2,pickupId:"pickup-1",amount:15}),ev(INTERVAL+100,"energy_collected",{pickupId:"pickup-1",amount:15})]);
 const r=replayCombatEventLog(log); assert.equal(r.ok,true); assert.equal(r.state.energy,115); assert.equal(r.state.pickups.length,0); assert.equal(r.state.plants[0].productionCount,1);
});
test("rejects fabricated production, early production, and production from uprooted mushrooms", () => {
 const fabricated=makeLog([ev(12000,"energy_spawned",{sourceCol:0,sourceRow:0,pickupId:"pickup-1",amount:15})]); assert.equal(replayCombatEventLog(fabricated).reason,"ENERGY_SOURCE_MUSHROOM_NOT_ALIVE");
 const early=makeLog([ev(0,"plant_placed",{type:"mushroom",col:0,row:0}),ev(11999,"energy_spawned",{sourceCol:0,sourceRow:0,pickupId:"pickup-1",amount:15})]); assert.equal(replayCombatEventLog(early).reason,"MUSHROOM_PRODUCTION_TOO_EARLY");
 const removed=makeLog([ev(0,"plant_placed",{type:"mushroom",col:0,row:0}),ev(100,"plant_uprooted",{type:"mushroom",col:0,row:0}),ev(12000,"energy_spawned",{sourceCol:0,sourceRow:0,pickupId:"pickup-1",amount:15})]); assert.equal(replayCombatEventLog(removed).reason,"ENERGY_SOURCE_MUSHROOM_NOT_ALIVE");
});
test("rejects skipped production cycles, collection without a pickup, and expired pickups", () => {
 const skipped=makeLog([ev(0,"plant_placed",{type:"mushroom",col:0,row:0}),ev(13000,"energy_collected",{pickupId:"pickup-1",amount:15})]); assert.equal(replayCombatEventLog(skipped).reason,"MISSING_MUSHROOM_PRODUCTION_EVENT");
 const missing=makeLog([ev(100,"energy_collected",{pickupId:"pickup-1",amount:15})]); assert.equal(replayCombatEventLog(missing).reason,"PICKUP_NOT_AVAILABLE");
 const expired=makeLog([ev(0,"plant_placed",{type:"mushroom",col:0,row:0}),ev(12000,"energy_spawned",{sourceCol:0,sourceRow:0,pickupId:"pickup-1",amount:15}),ev(24000,"energy_collected",{pickupId:"pickup-1",amount:15})]); assert.equal(replayCombatEventLog(expired).reason,"PICKUP_EXPIRED");
});
test("derives collection gain from bank and enforces the 300-energy cap", () => {
 const actions=[ev(0,"plant_placed",{type:"radish",col:0,row:0}),ev(0,"plant_placed",{type:"mushroom",col:1,row:0})];
 for(let cycle=1;cycle<=16;cycle++){const tick=cycle*INTERVAL;actions.push(ev(tick,"energy_spawned",{sourceCol:1,sourceRow:0,pickupId:`pickup-${cycle}`,amount:15}),ev(tick+1,"energy_collected",{pickupId:`pickup-${cycle}`,amount:cycle===16?10:15}));}
 const result=replayCombatEventLog(makeLog(actions)); assert.equal(result.ok,true); assert.equal(result.state.energy,300);
 const wrong=makeLog([ev(0,"plant_placed",{type:"mushroom",col:0,row:0}),ev(12000,"energy_spawned",{sourceCol:0,sourceRow:0,pickupId:"pickup-1",amount:15}),ev(12001,"energy_collected",{pickupId:"pickup-1",amount:14})]); assert.equal(replayCombatEventLog(wrong).reason,"INVALID_ENERGY_COLLECTION_AMOUNT");
});
test("full-bank pickup discard consumes the collectible without creating energy", () => {
 const actions=[ev(0,"plant_placed",{type:"radish",col:0,row:0}),ev(0,"plant_placed",{type:"mushroom",col:1,row:0})];
 for(let cycle=1;cycle<=16;cycle++){const tick=cycle*INTERVAL;actions.push(ev(tick,"energy_spawned",{sourceCol:1,sourceRow:0,pickupId:`pickup-${cycle}`,amount:15}));if(cycle<=16)actions.push(ev(tick+1,"energy_collected",{pickupId:`pickup-${cycle}`,amount:cycle===16?10:15}));}
 actions.push(ev(17*INTERVAL,"energy_spawned",{sourceCol:1,sourceRow:0,pickupId:"pickup-17",amount:15}),ev(17*INTERVAL+1,"energy_discarded",{pickupId:"pickup-17"}));
 const result=replayCombatEventLog(makeLog(actions)); assert.equal(result.ok,true); assert.equal(result.state.energy,300); assert.equal(result.state.pickups.length,0);
});
test("manual uprooting preserves full refund and unknown rules versions are rejected", () => {
 const log=makeLog([ev(0,"plant_placed",{type:"radish",col:1,row:2}),ev(10,"plant_uprooted",{type:"radish",col:1,row:2})]);
 assert.equal(replayCombatEventLog(log).state.energy,150);
 assert.equal(replayCombatEventLog({...log,rulesVersion:"future"}).reason,"RULES_VERSION_MISMATCH");
});
