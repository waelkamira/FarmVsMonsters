import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const scene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");

test("battlefield hover preview follows the calibrated perspective cell polygon", () => {
  assert.match(scene, /this\.input\.on\("pointermove", \(pointer\) => this\.updatePlantingPreview\(pointer\)\)/);
  assert.match(scene, /const polygon = this\.cellPolygon\(col, row\)/);
  assert.match(scene, /this\.plantingPreview\.fillPoints\(polygon, true\)/);
  assert.match(scene, /this\.plantingPreview\.strokePoints\(polygon, true\)/);
  assert.match(scene, /this\.add\.graphics\(\)\.setDepth\(9\.7\)/);
});

test("planting preview communicates valid, occupied, and unavailable cells without replacing the authored grid", () => {
  assert.match(scene, /const occupied = this\.plants\.some\(\(plant\) => plant\.alive && plant\.col === col && plant\.row === row\)/);
  assert.match(scene, /const canPlant = Boolean\([\s\S]*?this\.energy >= config\.cost[\s\S]*?\)/);
  assert.match(scene, /const fill = occupied \? 0xe45b4f : canPlant \? 0x9be66b : 0xf3c66b/);
  assert.match(scene, /The background artwork owns the visible soil grid/);
  assert.match(scene, /this\.input\.on\("gameout"/);
});
