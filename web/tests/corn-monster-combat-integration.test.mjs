import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { CORN_MONSTER_CONFIG } from "../game/rules/phaseOneRules.mjs";
import { PHASE_ONE_PLANTS, PHASE_ONE_PLANT_EVENT_TYPES } from "../game/rules/phaseOneCombatContract.mjs";
import { resolvePlantPlacement } from "../game/rules/combatSimulation.mjs";
import { STAGE_ONE_PLANTS } from "../game/data/stageOnePlants.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const atlas = JSON.parse(readFileSync(resolve(here, "../public/assets/plants/corn_monster.json"), "utf8"));

test("Corn Monster combat config is exposed through the canonical phase-one rules", () => {
  assert.deepEqual(CORN_MONSTER_CONFIG, {
    label: "Corn Monster",
    ...PHASE_ONE_PLANTS["corn-monster"],
    cost: 70
  });
  assert.deepEqual(PHASE_ONE_PLANTS["corn-monster"], {
    projectileDamage: 34,
    projectileSpeed: 300,
    projectileCollisionRadius: 22,
    plantingEnergyCost: 70,
    seedPacketRechargeMs: 10000,
    hp: 140,
    cooldownMs: 1900,
    range: 360
  });
  assert.ok(PHASE_ONE_PLANT_EVENT_TYPES.includes("corn-monster"));
});

test("Corn Monster Atlas and battle integration are complete at the source level", () => {
  assert.ok(existsSync(resolve(here, "../public/assets/plants/corn_monster.png")));
  const frameNames = Object.keys(atlas.frames);
  assert.equal(frameNames.length, 24);
  for (const name of ["idle_00", "idle_07", "attack_00", "attack_06", "attack_09", "hurt_00", "hurt_05"]) {
    assert.ok(frameNames.includes(name), "missing Atlas frame " + name);
  }
  assert.match(scene, /load\.atlas\("corn-monster"/);
  assert.match(scene, /generateFrameNames\("corn-monster"/);
  assert.match(scene, /type: "corn-monster", title: "CORN MONSTER"/);
  assert.match(scene, /plant\.type === "corn-monster" && plant\.view\?\.active/);
  assert.match(scene, /frame\?\.textureFrame !== "attack_06"/);
  assert.match(scene, /plant\.type === "corn-monster" \? CORN_MONSTER_CONFIG/);
  assert.match(scene, /golden kernel with green husk leaves/);
});


test("Corn Monster placement deducts the canonical energy cost and applies its HP", () => {
  const result = resolvePlantPlacement({
    energy: 100,
    plants: [],
    type: "corn-monster",
    col: 2,
    row: 1,
    columns: 8,
    rows: 5
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, "PLANT_PLACED");
  assert.equal(result.energy, 30);
  assert.equal(result.plant.type, "corn-monster");
  assert.equal(result.plant.hp, 140);
});


test("Corn Monster is represented in the Stage 1 plant encyclopedia", () => {
  const entry = STAGE_ONE_PLANTS.find((plant) => plant.id === "corn-monster");
  assert.ok(entry);
  assert.equal(entry.name, "Corn Monster");
  assert.equal(entry.energyCost, 70);
  assert.equal(entry.implemented, true);
  assert.equal(entry.purchasable, false);
});
