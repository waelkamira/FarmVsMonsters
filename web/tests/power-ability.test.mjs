import test from "node:test";
import assert from "node:assert/strict";
import { canUsePlantPower, createPowerBurstSchedule, POWER_ABILITY_COST, POWER_BURST_SHOTS, POWER_BURST_INTERVAL_MS } from "../game/rules/powerAbility.mjs";
import { readFile } from "node:fs/promises";

test("plant power costs 50 energy and launches ten shots at 90ms intervals", () => {
  assert.equal(POWER_ABILITY_COST, 50);
  assert.equal(POWER_BURST_SHOTS, 10);
  assert.equal(POWER_BURST_INTERVAL_MS, 90);
  assert.deepEqual(createPowerBurstSchedule(), [0,90,180,270,360,450,540,630,720,810]);
});

test("power ability accepts living ranged plants and rejects blockers, producers and dead plants", () => {
  assert.equal(canUsePlantPower({ type: "corn-monster", alive: true }, 50), true);
  assert.equal(canUsePlantPower({ type: "mushroom", alive: true }, 100), false);
  assert.equal(canUsePlantPower({ type: "pumpkin", alive: true }, 100), false);
  assert.equal(canUsePlantPower({ type: "hazelnut", alive: false }, 100), false);
  assert.equal(canUsePlantPower({ type: "custom", alive: true, studioPlant: { combat: { mode: "projectile" } } }, 50), true);
  assert.equal(canUsePlantPower({ type: "custom", alive: true, studioPlant: { combat: { mode: "melee" } } }, 100), false);
  assert.equal(canUsePlantPower({ type: "mango", alive: true }, 49), false);
});

test("BattleScene arms the power button and routes the next board click to the chosen plant", async () => {
  const battle = await readFile(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  assert.match(battle, /⚡ طاقة 50/);
  assert.match(battle, /if \(this\.powerModeArmed\)/);
  assert.match(battle, /this\.activatePlantPower\(targetPlant\)/);
  assert.match(battle, /this\.energy -= POWER_ABILITY_COST/);
  assert.match(battle, /createPowerBurstSchedule\(\)\.forEach/);
  assert.match(battle, /this\.fireThornProjectile\(plant, target\)/);
});
