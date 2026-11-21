import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolvePlantPlacement, resolvePlantUproot } from "../game/rules/combatSimulation.mjs";
import { FIRE_PEPPER_CONFIG } from "../game/rules/phaseOneRules.mjs";
import { STAGE_ONE_PLANT_BY_ID } from "../game/data/stageOnePlants.mjs";

const assetPath = fileURLToPath(new URL("../public/assets/plants/Pepper-flamethrower-level-1.png", import.meta.url));
const scenePath = fileURLToPath(new URL("../game/scenes/BattleScene.js", import.meta.url));

test("Fire Pepper source artwork and stage roster are registered", () => {
  assert.equal(existsSync(assetPath), true);
  assert.equal(STAGE_ONE_PLANT_BY_ID["fire-pepper"].implemented, true);
  assert.equal(STAGE_ONE_PLANT_BY_ID["fire-pepper"].assetPath, "/assets/plants/Pepper-flamethrower-level-1.png");
});

test("Fire Pepper placement charges its configured energy exactly once and uprooting refunds it", () => {
  const placement = resolvePlantPlacement({
    energy: 200, plants: [], type: "fire-pepper",
    col: 2, row: 1, columns: 8, rows: 5
  });
  assert.equal(placement.ok, true);
  assert.equal(placement.energy, 70);
  assert.equal(placement.plant.hp, 125);
  const refund = resolvePlantUproot({ energy: placement.energy, plant: placement.plant });
  assert.equal(refund.ok, true);
  assert.equal(refund.energy, 200);
});

test("Fire Pepper is wired to its nine-frame Phaser animation and lane-wide attack", () => {
  const scene = readFileSync(scenePath, "utf8");
  assert.match(scene, /load\.image\("fire-pepper-level-1", "\/assets\/plants\/Pepper-flamethrower-level-1\.png"\)/);
  assert.match(scene, /registerThreeByThreeSheet\("fire-pepper-level-1"\)/);
  assert.match(scene, /fire-pepper-level-1-throw/);
  assert.match(scene, /firePepperLaneBurst\(plant\)/);
  assert.match(scene, /applyMonsterDamage\(monster, FIRE_PEPPER_CONFIG\.projectileDamage, "fire-pepper"\)/);
  assert.equal(FIRE_PEPPER_CONFIG.cost, 130);
  assert.equal(FIRE_PEPPER_CONFIG.projectileDamage, 44);
});
