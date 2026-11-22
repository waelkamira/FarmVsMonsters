import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const scene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");

test("the uploaded wood frame is loaded and used by a dedicated inventory control", () => {
  assert.match(scene, /inventory-wood-frame", "\/assets\/items\/ui\/ui-inventory-wood-fram\.png"/);
  assert.match(scene, /this\.createInventoryControl\(\)/);
  assert.match(scene, /this\.add\.container\(930, 27\)\.setDepth\(49\)/);
  assert.match(scene, /this\.add\.image\(0, 0, "inventory-wood-frame"\)\.setDisplaySize\(570, 620\)/);
  assert.match(scene, /const sheet = \["radish-level-1", "pineapple-level-1", "hazelnut-level-1", "mango-level-1", "snow-thrower-level-1"\]\.includes\(plant\.image\)/);
  assert.match(scene, /this\.add\.sprite\(x, y - 12, plant\.image, 0\)/);
});

test("inventory shows saved plant unlocks, seed-bar membership, field counts, and live resources", () => {
  assert.match(scene, /unlockedIds = PLAYTEST_ALL_PLANTS \? \[\.\.\.new Set\(\[\.\.\.loadUnlockedPlantIds\(window\.localStorage\), \.\.\.ALL_PLAYTEST_PLANT_IDS\]\)\] : loadUnlockedPlantIds\(window\.localStorage\)/);
  assert.match(scene, /farmVsMonsters\.selectedPlants/);
  assert.match(scene, /this\.plants\.filter\(\(item\) => item\.alive && item\.type === plant\.id\)/);
  assert.match(scene, /this\.coins\.toLocaleString\(\)/);
  assert.match(scene, /this\.totalDefeatedMonsters/);
});

test("opening inventory pauses the battle and prevents clicks from reaching battlefield planting", () => {
  assert.match(scene, /this\.gameOver \|\| this\.isPaused \|\| this\.collectionMenuOpen \|\| this\.inventoryOpen/);
  assert.match(scene, /this\.gameOver \|\| this\.storySequenceActive \|\| this\.inventoryOpen/);
  assert.match(scene, /this\.collectionMenuOpen \|\|\n\s*this\.inventoryOpen \|\|/);
  assert.match(scene, /closeInventory\(\)/);
});

test("inventory is a read-only collection view and does not invent item purchase or consumption", () => {
  const inventoryStart = scene.indexOf("  openInventory() {");
  const inventoryEnd = scene.indexOf("  createPauseControl() {", inventoryStart);
  assert.ok(inventoryStart >= 0 && inventoryEnd > inventoryStart);
  const inventoryCode = scene.slice(inventoryStart, inventoryEnd);
  assert.doesNotMatch(inventoryCode, /purchasePlant\(|saveCoins\(|this\.coins\s*[-+]=|unlockPlantReward\(/);
});

test("the uploaded seed-card frame is loaded and rendered on every battle seed packet", () => {
  assert.match(scene, /seed-card-frame", "\/assets\/items\/ui\/ui-seed-card-fram\.png"/);
  assert.match(scene, /this\.textures\.exists\("seed-card"\)/);
  assert.match(scene, /Math\.min\(86 \/ frameSource\.width, 98 \/ frameSource\.height\)/);
  assert.match(scene, /\.\.\.\(seedFrame \? \[seedFrame\] : \[\]\)/);
  assert.match(scene, /card\.add\(\[halo, packetFrame, packetRim, panel, \.\.\.\(seedFrame \? \[seedFrame\] : \[\]\), icon/);
});


test("the uploaded locked seed-card artwork is used for locked plant cards and collection entries", () => {
  assert.match(scene, /seed-card-locked", "\/assets\/items\/ui\/ui-seed-card-locked\.png"/);
  assert.match(scene, /locked && this\.textures\.exists\("seed-card-locked"\)/);
  assert.match(scene, /cardArtworkKey/);
  assert.match(scene, /!unlocked && this\.textures\.exists\("seed-card-locked"\)/);
});

test("the uploaded empty seed-slot artwork fills unused loadout positions", () => {
  assert.match(scene, /seed-slot-empty", "\/assets\/items\/ui\/ui-seed-slot-empty\.png"/);
  assert.match(scene, /const packetSlotCount = Math\.max\(9, selectedTypes\.length\)/);
  assert.match(scene, /if \(type\) continue/);
  assert.match(scene, /"seed-slot-empty"\)/);
  assert.match(scene, /\.setDepth\(44\)/);
});
