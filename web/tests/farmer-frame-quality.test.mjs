import test from "node:test";
import assert from "node:assert/strict";
import { getFarmerSheetReferenceHeight, resolveFarmerSheetScale } from "../game/visuals/farmerFrameQuality.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

test("farmer sheet reference uses the tallest visible pose, independent of frame order", () => {
  assert.equal(getFarmerSheetReferenceHeight([118, 142, 97, 135]), 142);
  assert.equal(getFarmerSheetReferenceHeight([97, 142, 118, 135]), 142);
});

test("farmer animation sheets resolve a stable scale from their tallest pose", () => {
  assert.equal(resolveFarmerSheetScale(180, [120, 150, 135]), 1.2);
  assert.equal(resolveFarmerSheetScale(180, [150, 120, 135]), 1.2);
});

test("invalid or empty frame measurements safely return null", () => {
  assert.equal(getFarmerSheetReferenceHeight([0, -2, Number.NaN, Infinity]), null);
  assert.equal(resolveFarmerSheetScale(180, []), null);
  assert.equal(resolveFarmerSheetScale(0, [100]), null);
});

test("battle scene premeasures all farmer poses before caching a sheet scale", () => {
  const battle = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
  assert.match(battle, /Object\.entries\(texture\.frames \|\| \{\}\)/);
  assert.match(battle, /getFarmerSheetReferenceHeight\(frameHeights\)/);
  assert.match(battle, /resolveFarmerSheetScale\(this\.farmerTargetDisplayHeight, \[referenceHeight\]\)/);
  assert.match(battle, /farmerTextureReferenceHeights/);
});
