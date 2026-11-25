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
  assert.match(scene, /unlockedIds = PLAYTEST_ALL_PLANTS[\s\S]*?loadUnlockedPlantIds\(window\.localStorage\)/);
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
  const inventoryEnd = scene.indexOf("  openSettingsMenu() {", inventoryStart);
  assert.ok(inventoryStart >= 0 && inventoryEnd > inventoryStart);
  const inventoryCode = scene.slice(inventoryStart, inventoryEnd);
  assert.doesNotMatch(inventoryCode, /purchasePlant\(|saveCoins\(|this\.coins\s*[-+]=|unlockPlantReward\(/);
});

test("the uploaded seed-card frame is loaded and rendered on every battle seed packet", () => {
  assert.match(scene, /seed-card-frame", "\/assets\/items\/ui\/ui-seed-card-fram\.png"/);
  assert.match(scene, /this\.textures\.exists\("seed-card-frame"\)/);
  assert.match(scene, /Math\.min\(86 \/ source\.width, 98 \/ source\.height\)/);
  assert.match(scene, /card\.add\(\[\.\.\.\(seedFrame \? \[seedFrame\] : \[\]\), cardGlass, panel, icon, cost/);
});


test("the uploaded locked seed-card artwork is used for locked plant cards and collection entries", () => {
  assert.match(scene, /seed-card-locked", "\/assets\/items\/ui\/ui-seed-card-locked\.png"/);
  assert.match(scene, /locked && this\.textures\.exists\("seed-card-locked"\)/);
  assert.match(scene, /cardArtworkKey/);
  assert.match(scene, /!unlocked && this\.textures\.exists\("seed-card-locked"\)/);
});

test("the uploaded empty seed-slot artwork fills unused loadout positions", () => {
  assert.match(scene, /seed-slot-empty", "\/assets\/items\/ui\/ui-seed-slot-empty\.png"/);
  assert.match(scene, /const packetSlotCount = MAX_SEED_PACKETS/);
  assert.match(scene, /for \(let slotIndex = selectedTypes\.length; slotIndex < packetSlotCount; slotIndex \+= 1\)/);
  assert.match(scene, /"seed-slot-empty"\)/);
  assert.match(scene, /\.setDepth\(44\)/);
});
