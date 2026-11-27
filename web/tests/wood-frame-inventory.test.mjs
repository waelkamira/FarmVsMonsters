import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const scene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");

test("the uploaded wood frame is loaded and used by a dedicated inventory control", () => {
  assert.match(scene, /inventory-wood-frame", "\/assets\/items\/ui\/ui-inventory-wood-fram\.png"/);
  const hud = readFileSync(new URL("../game/scenes/BattleHudButtons.js", import.meta.url), "utf8");
  assert.match(hud, /function createInventoryControl\(\)/);
  assert.match(hud, /this\.add\.container\(920, 27\)\.setDepth\(52\)/);
  assert.match(scene, /this\.add\.image\(0, 0, "inventory-wood-frame"\)\.setDisplaySize\(570, 620\)/);
  assert.match(scene, /const sheet = \["radish-level-1", "pineapple-level-1", "hazelnut-level-1", "mango-level-1", "snow-thrower-level-1", "electric-mushroom-level-1"\]\.includes\(plant\.image\)/);
  assert.match(scene, /this\.add\.sprite\(x, y - 12, plant\.image, 0\)/);
});

test("all battle action buttons are positioned by the centralized right-column layout", () => {
  const hud = readFileSync(new URL("../game/scenes/BattleHudButtons.js", import.meta.url), "utf8");
  assert.match(scene, /createBattleHudButtons\(this,\s*translate\)/);
  assert.match(hud, /BATTLE_HUD_BUTTONS/);
  for (const key of ["pauseControl", "settingsControl", "speedControl", "audioButton", "collectionMenuControl", "inventoryControl", "quickPlantsButton", "quickAdventuresButton", "quickMonstersButton"]) {
    assert.match(hud, new RegExp(`key: "${key}"`));
  }
  assert.match(hud, /BATTLE_HUD_BUTTON_X = 1080/);
  assert.match(hud, /audioButtonBounds/);
  assert.doesNotMatch(scene, /quickCollectionDock|0x6b4929/);
});

test("inventory shows saved plant unlocks, seed-bar membership, field counts, and live resources", () => {
  assert.match(scene, /unlockedIds = this\.isStudioPlaytest[\s\S]*?loadUnlockedPlantIds\(window\.localStorage\)/);
  assert.match(scene, /farmVsMonsters\.selectedPlants/);
  assert.match(scene, /this\.plants\.filter\(\(item\) => item\.alive && item\.type === plant\.id\)/);
  assert.match(scene, /this\.coins\.toLocaleString\(\)/);
  assert.match(scene, /this\.totalDefeatedMonsters/);
});

test("opening inventory pauses the battle and prevents clicks from reaching battlefield planting", () => {
  assert.match(scene, /this\.gameOver \|\| this\.isPaused \|\| this\.collectionMenuOpen \|\| this\.inventoryOpen/);
  assert.match(scene, /this\.gameOver \|\| this\.storySequenceActive \|\| this\.inventoryOpen/);
  assert.match(scene, /this\.collectionMenuOpen \|\|\r?\n\s*this\.inventoryOpen \|\|/);
  assert.match(scene, /closeInventory\(\)/);
});

test("inventory is a read-only collection view and does not invent item purchase or consumption", () => {
  const inventoryStart = scene.indexOf("  openInventory() {");
  const inventoryEnd = scene.indexOf("  openSettingsMenu() {", inventoryStart);
  assert.ok(inventoryStart >= 0 && inventoryEnd > inventoryStart);
  const inventoryCode = scene.slice(inventoryStart, inventoryEnd);
  assert.doesNotMatch(inventoryCode, /purchasePlant\(|saveCoins\(|this\.coins\s*[-+]=|unlockPlantReward\(/);
});

test("battle plant cards render without outer frame artwork while retaining glass, icon, cost, and interaction", () => {
  assert.doesNotMatch(scene, /seed-card-frame|cardArtworkKey|seedFrame/);
  assert.match(scene, /card\.add\(\[cardGlass, panel, icon, cost, cooldownOverlay, cooldownLabel\]\)/);
  assert.match(scene, /cardGlass\.fillRoundedRect/);
  assert.match(scene, /panel\.setData\("cooldownOverlay"/);
  assert.match(scene, /panel\.on\("pointerdown"/);
});

test("locked seed-card artwork remains available to collection entries", () => {
  assert.match(scene, /seed-card-locked", "\/assets\/items\/ui\/ui-seed-card-locked\.png"/);
  assert.match(scene, /!unlocked && this\.textures\.exists\("seed-card-locked"\)/);
});

test("the battle seed bar renders only equipped plant cards without empty placeholder cards", () => {
  assert.doesNotMatch(scene, /seed-slot-empty/);
  assert.doesNotMatch(scene, /packetSlotCount/);
  assert.doesNotMatch(scene, /Empty slots remain visible/);
  assert.match(scene, /plantOptions\.filter\(\(plant\) => selectedTypes\.includes\(plant\.type\)\)/);
});


test("battlefield fallback does not paint a full-screen green background wash", () => {
  const drawField = scene.match(/drawField\(\)\s*\{([\s\S]*?)\r?\n  \}\r?\n\r?\n  createFarmBackground/);
  assert.ok(drawField, "drawField implementation exists");
  assert.doesNotMatch(drawField[1], /fillGradientStyle\(0xb9d98a|fillRect\(0, 0, 1120, 680\)/);
  assert.match(drawField[1], /fillRoundedRect\(185, 115, 690, 500/);
});
