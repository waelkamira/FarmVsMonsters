import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const scene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");

test("inventory uses the uploaded wood frame as its container backdrop", () => {
  assert.ok(scene.includes('this.load.image("inventory-wood-frame", "/assets/items/ui/ui-inventory-wood-fram.png")'));
  assert.ok(scene.includes('this.textures.exists("inventory-wood-frame")'));
  assert.ok(scene.includes('this.add.image(0, 0, "inventory-wood-frame").setDisplaySize(570, 620)'));
});

test("only unlocked and selected plants become active seed cards", () => {
  assert.ok(scene.includes("PLAYTEST_ALL_PLANTS"));
  assert.ok(scene.includes("loadUnlockedPlantIds(window.localStorage)"));
  assert.ok(scene.includes("ALL_PLAYTEST_PLANT_IDS"));
  assert.ok(scene.includes("selectedTypes.includes(plant.type)"));
});

test("seed-card artwork and locked card state use the supplied textures", () => {
  assert.ok(scene.includes('this.load.image("seed-card", "/assets/items/ui/ui-seed-card.png")'));
  assert.ok(scene.includes('this.load.image("seed-card-locked", "/assets/items/ui/ui-seed-card-locked.png")'));
  assert.ok(scene.includes("this.textures.exists(cardArtworkKey)"));
  assert.ok(scene.includes("Math.min(88 / source.width, 101.2 / source.height)"));
  assert.ok(scene.includes("card.add([...(seedFrame ? [seedFrame] : []), panel, icon, cost, cooldownOverlay, cooldownLabel])"));
});

test("unused loadout positions show inactive plants and uploaded empty-slot art", () => {
  assert.ok(scene.includes("const packetSlotCount = Math.max(9, selectedTypes.length)"));
  assert.ok(scene.includes("const inactiveSlots = Math.max(0, packetSlotCount - selectedTypes.length)"));
  assert.ok(scene.includes("inactivePlants.slice(0, inactiveSlots)"));
  assert.ok(scene.includes("const emptySlotCount = Math.max(0, inactiveSlots - inactivePlants.length)"));
  assert.ok(scene.includes('this.textures.exists("seed-slot-empty")'));
  assert.ok(scene.includes("this.add.container(x, 72).setDepth(45)"));
});
