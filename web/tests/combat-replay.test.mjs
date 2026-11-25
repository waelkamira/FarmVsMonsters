import test from "node:test";
import assert from "node:assert/strict";
import { createCombatEventLog, appendCombatEvent, validateCombatEventLog } from "../game/rules/combatEventLog.mjs";
import { replayCombatEventLog, PHASE_ONE_RULES_VERSION } from "../game/rules/combatReplay.mjs";
import { PHASE_ONE_PLANT_EVENT_TYPES } from "../game/rules/phaseOneCombatContract.mjs";
const INTERVAL = 12000;
function makeLog(actions) { return actions.reduce((log, action) => appendCombatEvent(log, action), createCombatEventLog({ seed: 123, rulesVersion: PHASE_ONE_RULES_VERSION })); }
function ev(tick, type, payload) { return { tick, type, payload }; }

test("combat event log accepts every plant type supported by the battle scene", () => {
 const supported = PHASE_ONE_PLANT_EVENT_TYPES;
 for (const type of supported) {
  const log = makeLog([ev(0, "plant_placed", { type, col: 1, row: 2 }), ev(1, "plant_uprooted", { type, col: 1, row: 2 })]);
  assert.equal(log.events.length, 2);
  assert.equal(validateCombatEventLog(log), true);
  assert.equal(log.events[0].payload.type, type);
 }
 assert.throws(() => makeLog([ev(0, "plant_placed", { type: "unknown plant", col: 1, row: 2 })]), /INVALID_PLANT_EVENT/);
});

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

test("replay validates the five-wave monster roster, archetypes and exact combat stats", () => {
 const log=makeLog([
  ev(0,"monster_spawned",{monsterId:"monster-1",wave:1,spawnIndex:0,row:2,archetype:"monster-01",hp:175,speed:8,localX:238.4115}),
  ev(1000,"monster_spawned",{monsterId:"monster-2",wave:1,spawnIndex:1,row:1,archetype:"monster-01",hp:175,speed:8,localX:238.4115}),
  ev(2000,"monster_spawned",{monsterId:"monster-3",wave:1,spawnIndex:2,row:4,archetype:"monster-01",hp:175,speed:8,localX:238.4115}),
  ev(3000,"monster_spawned",{monsterId:"monster-4",wave:2,spawnIndex:0,row:0,archetype:"monster-01",hp:183,speed:9.35,localX:238.4115})
 ]);
 const result=replayCombatEventLog(log); assert.equal(result.ok,true); assert.equal(result.state.monsters.length,4); assert.equal(result.state.currentWave,2); assert.equal(result.state.spawnedInWave,1);
});
test("replay rejects an unknown retired enemy archetype", () => {
 const log=makeLog([ev(0,"monster_spawned",{monsterId:"monster-1",wave:1,spawnIndex:0,row:2,archetype:"unlisted-monster",hp:36,speed:13.6,localX:238.4115})]);
 assert.equal(replayCombatEventLog(log).reason,"INVALID_MONSTER_ARCHETYPE");
});

test("rejects forged monster identity, wave order, archetype and health", () => {
 const wrongId=makeLog([ev(0,"monster_spawned",{monsterId:"monster-9",wave:1,spawnIndex:0,row:1,archetype:"monster-01",hp:175,speed:8,localX:238.4115})]);
 assert.equal(replayCombatEventLog(wrongId).reason,"INVALID_MONSTER_WAVE_SEQUENCE");
 const wrongType=makeLog([ev(0,"monster_spawned",{monsterId:"monster-1",wave:1,spawnIndex:0,row:1,archetype:"unlisted-monster",hp:175,speed:8,localX:238.4115})]);
 assert.equal(replayCombatEventLog(wrongType).reason,"INVALID_MONSTER_ARCHETYPE");
 const wrongStats=makeLog([ev(0,"monster_spawned",{monsterId:"monster-1",wave:1,spawnIndex:0,row:1,archetype:"monster-01",hp:1,speed:8,localX:238.4115})]);
 assert.equal(replayCombatEventLog(wrongStats).reason,"MONSTER_STATS_MISMATCH");
});
test("replay applies monster bites only after lane movement reaches the radish", () => {
 const plantX = ((2.5 / 8) * 420.823) - (420.823 / 2);
 const biteReach = 0.3158125;
 const stopX = plantX + biteReach;
 const distance = 317;
 const prefix = [
  ev(0,"plant_placed",{type:"radish",col:2,row:1}),
  ev(100,"monster_spawned",{monsterId:"monster-1",wave:1,spawnIndex:0,row:1,archetype:"monster-01",hp:175,speed:8,localX:238.4115}),
  ev(39625,"monster_moved",{monsterId:"monster-1",distance,deltaMs:39625,blockerCol:2,biteReach})
 ];
 const tooEarly=makeLog([...prefix,ev(39626,"monster_bite",{monsterId:"monster-1",plantCol:2,plantRow:1,damage:16}),ev(40775,"monster_bite",{monsterId:"monster-1",plantCol:2,plantRow:1,damage:16})]);
 assert.equal(replayCombatEventLog(tooEarly).reason,"MONSTER_BITE_TOO_EARLY");
 const valid=makeLog([...prefix,ev(40001,"monster_bite",{monsterId:"monster-1",plantCol:2,plantRow:1,damage:16}),ev(41151,"monster_bite",{monsterId:"monster-1",plantCol:2,plantRow:1,damage:16})]);
 const result=replayCombatEventLog(valid); assert.equal(result.ok,true); assert.equal(result.state.plants[0].hp,128);
});

test("rejects malformed monster IDs and out-of-range monster lanes at event-log boundary", () => {
 const base=createCombatEventLog({seed:123,rulesVersion:PHASE_ONE_RULES_VERSION});
 assert.throws(()=>appendCombatEvent(base,ev(0,"monster_spawned",{monsterId:"monster-x",wave:1,spawnIndex:0,row:0,archetype:"monster-01",hp:175,speed:8,localX:238.4115})),/INVALID_COMBAT_EVENT_ORDER_OR_LOG|INVALID_COMBAT_EVENT_PAYLOAD|INVALID_MONSTER_SPAWN_EVENT/);
 assert.throws(()=>appendCombatEvent(base,ev(0,"monster_spawned",{monsterId:"monster-1",wave:1,spawnIndex:0,row:5,archetype:"monster-01",hp:175,speed:8,localX:238.4115})),/INVALID_MONSTER_SPAWN_EVENT/);
});

test("monster movement replay advances along the calibrated lane and clamps at a living radish", () => {
 const plantX = ((2.5 / 8) * 420.823) - (420.823 / 2);
 const biteReach = 0.3158125;
 const stopX = plantX + biteReach;
 const distance = 317;
 const log=makeLog([
  ev(0,"plant_placed",{type:"radish",col:2,row:1}),
  ev(0,"monster_spawned",{monsterId:"monster-1",wave:1,spawnIndex:0,row:1,archetype:"monster-01",hp:175,speed:8,localX:238.4115}),
  ev(39625,"monster_moved",{monsterId:"monster-1",distance,deltaMs:39625,blockerCol:2,biteReach})
 ]);
 const result=replayCombatEventLog(log); assert.equal(result.ok,true); assert.ok(Math.abs(result.state.monsters[0].localX-stopX)<1e-8);
});
test("movement replay rejects forged speed, skipped movement time and an incorrect blocker", () => {
 const base=[ev(0,"plant_placed",{type:"radish",col:2,row:1}),ev(0,"monster_spawned",{monsterId:"monster-1",wave:1,spawnIndex:0,row:1,archetype:"monster-01",hp:175,speed:8,localX:238.4115})];
 const tooFast=makeLog([...base,ev(500,"monster_moved",{monsterId:"monster-1",distance:20,deltaMs:500,blockerCol:2,biteReach:0.25})]);
 assert.equal(replayCombatEventLog(tooFast).reason,"MONSTER_MOVEMENT_TOO_FAST");
 const wrongClock=makeLog([...base,ev(500,"monster_moved",{monsterId:"monster-1",distance:1,deltaMs:499,blockerCol:2,biteReach:0.25})]);
 assert.equal(replayCombatEventLog(wrongClock).reason,"MONSTER_MOVEMENT_CLOCK_MISMATCH");
 const wrongBlocker=makeLog([...base,ev(500,"monster_moved",{monsterId:"monster-1",distance:4,deltaMs:500,blockerCol:1,biteReach:0.25})]);
 assert.equal(replayCombatEventLog(wrongBlocker).reason,"MONSTER_MOVEMENT_BLOCKER_MISMATCH");
});
test("movement replay rejects a claimed distance that tunnels through a radish", () => {
 const through=makeLog([ev(0,"plant_placed",{type:"radish",col:2,row:1}),ev(0,"monster_spawned",{monsterId:"monster-1",wave:1,spawnIndex:0,row:1,archetype:"monster-01",hp:175,speed:8,localX:238.4115}),ev(40000,"monster_moved",{monsterId:"monster-1",distance:320,deltaMs:40000,blockerCol:2,biteReach:0.25})]);
 assert.equal(replayCombatEventLog(through).reason,"MONSTER_MOVEMENT_DISTANCE_MISMATCH");
 const invalid=createCombatEventLog({seed:123,rulesVersion:PHASE_ONE_RULES_VERSION});
 assert.throws(()=>appendCombatEvent(invalid,ev(1,"monster_moved",{monsterId:"monster-1",distance:-1,deltaMs:1,blockerCol:null,biteReach:0})),/INVALID_MONSTER_MOVEMENT_EVENT/);
});
