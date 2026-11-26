import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const scene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");

test("battlefield placement preview follows the calibrated perspective cell polygon", () => {
  assert.match(scene, /this\.input\.on\("pointermove", \(pointer\) => this\.updatePlantingPreview\(pointer\)\)/);
  assert.match(scene, /const polygon = this\.cellPolygon\(col, row\)/);
  assert.match(scene, /if \(!this\.selectedPlant\) return;[\s\S]*?const polygon = this\.cellPolygon\(col, row\)/);
  assert.match(scene, /this\.plantingPreview\.fillPoints\(polygon, true\)/);
  assert.match(scene, /this\.add\.graphics\(\)\.setDepth\(9\.7\)/);
});

test("battlefield hides persistent empty cells and the baked square grid", () => {
  assert.doesNotMatch(scene, /drawBattleCellGlassOverlay|drawBattlefieldGlassCells/);
  assert.match(scene, /this\.load\.image\("farm-battlefield", "\/assets\/backgrounds\/farm-battlefield-clean\.svg"\)/);
  assert.doesNotMatch(scene, /battlefield-grass-overlay|battlefieldGrassOverlay/);
  assert.doesNotMatch(scene, /setDepth\(-4\.9\)/);
  const drawField = scene.match(/  drawField\(\) \{([\s\S]*?)\n  \}/)?.[1] || "";
  assert.doesNotMatch(drawField, /fillPoints|strokePoints|for \(let row = 0; row < LANES/);
  assert.match(scene, /No persistent cell tiles or grid lines/);
  assert.match(scene, /this\.input\.on\("gameout"/);
});

test("occupied plant cells keep their contents but never receive a hover frame", () => {
  assert.match(scene, /const occupied = this\.plants\.some\(\(plant\) => plant\.alive && plant\.col === col && plant\.row === row\)/);
  assert.match(scene, /const canPlant = Boolean\([\s\S]*?this\.energy >= config\.cost[\s\S]*?\)/);
  assert.match(scene, /this\.plantingPreview\.fillPoints\(polygon, true\);\s*\/\/ Occupied plants never receive a cell frame/);
  assert.match(scene, /if \(!occupied\) \{\s*this\.plantingPreview\.lineStyle\(3, stroke, 0\.92\);\s*this\.plantingPreview\.strokePoints\(polygon, true\);\s*\}/);
});
