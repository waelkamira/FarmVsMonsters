import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { STAGE_ONE_PLANTS } from "../game/data/stageOnePlants.mjs";
import { PHASE_ONE_PLANTS } from "../game/rules/phaseOneCombatContract.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");

test("Electric Mushroom artwork stays intentionally absent without breaking the runtime loader", () => {
  const plant = STAGE_ONE_PLANTS.find((entry) => entry.id === "electric-mushroom");
  assert.ok(plant?.implemented, "gameplay remains implemented");
  assert.equal(plant.assetPath, null, "removed artwork must not be advertised as a runtime asset");
  assert.equal(plant.artworkStatus, "intentionally-removed");
  assert.equal(plant.energyCost, PHASE_ONE_PLANTS["electric-mushroom"].plantingEnergyCost);
  assert.doesNotMatch(scene, /load\.image\(["']electric-mushroom-level-1["']/);
  assert.match(scene, /type === "electric-mushroom" \? "electric-mushroom-level-1"/);
  assert.match(scene, /const fallback = this\.add\.ellipse/);
});

test("Electric Mushroom animation setup remains optional when no sprite sheet exists", () => {
  assert.match(scene, /if \(this\.textures\.exists\("electric-mushroom-level-1"\) && !this\.anims\.exists\("electric-mushroom-level-1-throw"\)\)/);
  assert.match(scene, /if \(this\.textures\.exists\(texture\)\)/);
});
