import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const scene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
const start = scene.indexOf("  createPlantCard(");
const end = scene.indexOf("\n  createCaveman()", start);
const card = scene.slice(start, end);

test("seed packets use the uploaded ornamental frame and logo-compatible layered styling", () => {
  assert.match(scene, /seed-card-frame", "\/assets\/items\/ui\/ui-seed-card-fram\.png"/);
  assert.match(card, /this\.textures\.exists\("seed-card-frame"\)/);
  assert.match(card, /Math\.min\(86 \/ frameSource\.width, 98 \/ frameSource\.height\)/);
  assert.match(card, /namePlate = this\.add\.rectangle\(0, -34, 64, 15, 0x355d2b/);
  assert.match(card, /costPlate = this\.add\.rectangle\(0, 31, 54, 17, 0x4b6f2c/);
  assert.match(card, /setStrokeStyle\(selected \? 3 : 1\.5, selected \? 0xffd76a/);
});

test("seed-card sprite-sheet thumbnails resolve and render frame zero only", () => {
  assert.match(card, /const frameZeroExists = Boolean\(texture\.frames\?\.\["0"\]\)/);
  assert.match(card, /const isSpriteSheet = frameZeroExists && \(/);
  assert.match(card, /const frame = isSpriteSheet \? texture\.get\("0"\) : texture\.get\(\)/);
  assert.match(card, /this\.add\.sprite\(0, -4, imageKey, frameName\)/);
});

test("inactive Studio plant previews reuse the same card component without becoming clickable", () => {
  assert.match(scene, /inactivePlants\.slice\(0, inactivePreviewCount\)\.forEach/);
  assert.match(scene, /plant\.image,\s*72,\s*false,\s*false,\s*true/);
  assert.match(card, /if \(interactive && !locked && !inactive\) panel\.setInteractive/);
});

test("unused seed-bank positions receive the uploaded empty-slot artwork", () => {
  assert.match(scene, /seed-slot-empty", "\/assets\/items\/ui\/ui-seed-slot-empty\.png"/);
  assert.match(scene, /const emptySlotCount = Math\.max\(0, inactiveSlots - inactivePreviewCount\)/);
  assert.match(scene, /this\.textures\.exists\("seed-slot-empty"\)/);
  assert.match(scene, /this\.add\.image\(0, 0, "seed-slot-empty"\)/);
});

test("cooldown overlay references remain available to the HUD refresh loop", () => {
  assert.match(card, /panel\.setData\("cooldownOverlay", cooldownOverlay\)/);
  assert.match(card, /panel\.setData\("cooldownLabel", cooldownLabel\)/);
  assert.match(scene, /panel\.getData\("cooldownOverlay"\)/);
});

test("BattleScene parses as valid JavaScript after the seed-card changes", () => {
  execFileSync(process.execPath, ["--check", new URL("../game/scenes/BattleScene.js", import.meta.url)]);
});
