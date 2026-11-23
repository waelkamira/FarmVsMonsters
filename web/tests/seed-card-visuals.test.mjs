import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const scene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");

test("seed packet thumbnails use only registered frame zero for sprite sheets", () => {
  assert.match(scene, /const frameZeroExists = Boolean\(texture\.frames\?\.\["0"\]\)/);
  assert.match(scene, /const isSpriteSheet = frameZeroExists &&/);
  assert.match(scene, /const frameName = isSpriteSheet \? "0" : undefined/);
  assert.match(scene, /this\.add\.sprite\(0, -4, imageKey, frameName\)/);
  assert.match(scene, /this\.add\.image\(0, -4, imageKey\)/);
});

test("seed packet cards share a visual identity and preserve live cooldown state", () => {
  assert.match(scene, /const selectionFrame = this\.add\.rectangle/);
  assert.match(scene, /const namePlate = this\.add\.rectangle/);
  assert.match(scene, /const costPlate = this\.add\.rectangle/);
  assert.match(scene, /card\.setData\("cooldownOverlay", cooldownOverlay\)/);
  assert.match(scene, /card\.setData\("cooldownLabel", cooldownLabel\)/);
  assert.match(scene, /card\.setData\("selectionFrame", selectionFrame\)/);
  assert.match(scene, /plantCard\.getData\("selectionFrame"\)/);
});

test("inactive Studio plant previews use the same seed-card renderer without input", () => {
  assert.match(scene, /plant\.image,\s*72,\s*false,\s*false,\s*true/);
  assert.match(scene, /interactive = true, inactive = false/);
  assert.match(scene, /if \(interactive && !locked && !inactive\)/);
});
