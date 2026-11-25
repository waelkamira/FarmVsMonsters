import test from "node:test";
import assert from "node:assert/strict";
import { ELECTRIC_MUSHROOM_CONFIG } from "../game/rules/phaseOneRules.mjs";
import { PHASE_ONE_PLANT_EVENT_TYPES } from "../game/rules/phaseOneCombatContract.mjs";
import { resolvePlantPlacement, resolvePlantUproot } from "../game/rules/combatSimulation.mjs";
import { getPlantVFXProfile } from "../game/vfx/PlantVFXProfiles.mjs";
import { getProjectileVFXProfile } from "../game/vfx/ProjectileVFXProfiles.mjs";
import { createDefaultVFXRegistry } from "../game/vfx/createDefaultVFXRegistry.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const sceneSource = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../game/scenes/BattleScene.js"), "utf8");

test("Electric Mushroom is a valid, refundable playtest plant", () => {
  const placement = resolvePlantPlacement({
    energy: 100, plants: [], type: "electric-mushroom",
    col: 2, row: 1, columns: 8, rows: 5
  });
  assert.equal(placement.ok, true);
  assert.equal(placement.energy, 100 - ELECTRIC_MUSHROOM_CONFIG.cost);
  assert.equal(placement.plant.hp, ELECTRIC_MUSHROOM_CONFIG.hp);
  assert.ok(PHASE_ONE_PLANT_EVENT_TYPES.includes("electric-mushroom"));

  const uproot = resolvePlantUproot({ energy: placement.energy, plant: placement.plant });
  assert.equal(uproot.ok, true);
  assert.equal(uproot.refund, ELECTRIC_MUSHROOM_CONFIG.cost);
});

test("Electric Mushroom uses its own electric projectile and VFX identity", () => {
  const plant = getPlantVFXProfile("electric-mushroom");
  const projectile = getProjectileVFXProfile("electric-mushroom");
  assert.deepEqual(plant, {
    charge: "electric-charge",
    projectile: "electric-projectile",
    trail: "electric-trail",
    impact: "electric-impact"
  });
  assert.equal(projectile.texture, null);
  assert.equal(projectile.tint, 0x65d9ff);
  assert.equal(projectile.trail, "electric-trail");
  assert.equal(projectile.impact, "electric-impact");

  const registry = createDefaultVFXRegistry();
  for (const effectId of ["electric-charge", "electric-projectile", "electric-trail", "electric-impact"]) {
    assert.ok(registry.has(effectId), effectId);
    assert.equal(registry.get(effectId).tint, 0x65d9ff, effectId);
  }
});

test("Electric Mushroom passes the same seed-card-to-soil planting config lookup as other plants", () => {
  assert.ok(sceneSource.includes("const plantConfigs = {"));
  assert.ok(sceneSource.includes('"electric-mushroom": ELECTRIC_MUSHROOM_CONFIG'));
  assert.ok(sceneSource.includes("const plantConfig = plantConfigs[this.selectedPlant]"));
  assert.ok(sceneSource.includes("if (!plantConfig) {"));
});

test("Electric Mushroom is available in the plant collection and its seed selection feedback", () => {
  assert.match(sceneSource, /id: "electric-mushroom", title: isArabic \? "الفطر الكهربائي" : "Electric Mushroom", image: "electric-mushroom-level-1", config: ELECTRIC_MUSHROOM_CONFIG/);
  assert.match(sceneSource, /"electric-mushroom": "Electric Mushroom chosen\. Fires cyan electric bolts down its lane\."/);
  assert.match(sceneSource, /"electric-mushroom": ELECTRIC_MUSHROOM_CONFIG/);
});

test("Electric projectile hits create a bounded lightning shock reaction", () => {
  assert.match(sceneSource, /createElectricShockEffect\(sourceX, sourceY, target, targetKind = "monster"\)/);
  assert.match(sceneSource, /lightning\.lineStyle\(8, 0x35cfff, 0\.24\)/);
  assert.match(sceneSource, /lightning\.lineStyle\(3, 0xe9fcff, 0\.98\)/);
  assert.match(sceneSource, /delay: 48, repeat: 10, callback: drawBolt/);
  assert.match(sceneSource, /impact\) \{[\s\S]*?createElectricShockEffect\(projectileX, projectileY, hit, "monster"\)/);
  assert.match(sceneSource, /createElectricShockEffect\(studioHeadTarget\.x, studioHeadTarget\.y, shot\.target, "monster"\)/);
  assert.match(sceneSource, /const electricBite = monster\.combatProfile\?\.damageType === "electric"/);
  assert.match(sceneSource, /createElectricShockEffect\([\s\S]*?blocker,[\s\S]*?"plant"/);
});
