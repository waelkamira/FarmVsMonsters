import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  getPauseMenuControlIndex,
  isPauseMenuActivationKey
} from "../game/services/pauseMenuNavigation.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pauseScene = readFileSync(resolve(here, "../game/scenes/PauseScene.js"), "utf8");

const pauseControls = [
  { id: "resume", row: 0, column: 0 },
  { id: "restart", row: 1, column: 0 },
  { id: "settings", row: 2, column: 0 },
  { id: "main-menu", row: 3, column: 0 }
];

const settingsControls = [
  { id: "music-down", row: 0, column: 0 },
  { id: "music-up", row: 0, column: 1 },
  { id: "effects-down", row: 1, column: 0 },
  { id: "effects-up", row: 1, column: 1 },
  { id: "projectile-down", row: 2, column: 0 },
  { id: "projectile-up", row: 2, column: 1 },
  { id: "back", row: 3, column: 0 }
];

test("pause menu arrows follow the vertical action order and wrap at both ends", () => {
  assert.equal(getPauseMenuControlIndex(pauseControls, 0, "ArrowDown"), 1);
  assert.equal(getPauseMenuControlIndex(pauseControls, 2, "ArrowDown"), 3);
  assert.equal(getPauseMenuControlIndex(pauseControls, 0, "ArrowUp"), 3);
  assert.equal(getPauseMenuControlIndex(pauseControls, 3, "ArrowUp"), 2);
});

test("settings arrows move horizontally within a volume row and vertically by nearest column", () => {
  assert.equal(getPauseMenuControlIndex(settingsControls, 0, "ArrowRight"), 1);
  assert.equal(getPauseMenuControlIndex(settingsControls, 1, "ArrowLeft"), 0);
  assert.equal(getPauseMenuControlIndex(settingsControls, 1, "ArrowDown"), 3);
  assert.equal(getPauseMenuControlIndex(settingsControls, 4, "ArrowDown"), 6);
  assert.equal(getPauseMenuControlIndex(settingsControls, 6, "ArrowUp"), 4);
  assert.equal(getPauseMenuControlIndex(settingsControls, 6, "ArrowDown"), 0);
});

test("Home and End select the first and last controls; invalid movement is safe", () => {
  assert.equal(getPauseMenuControlIndex(settingsControls, 4, "Home"), 0);
  assert.equal(getPauseMenuControlIndex(settingsControls, 0, "End"), 6);
  assert.equal(getPauseMenuControlIndex(settingsControls, -1, "ArrowDown"), 1);
  assert.equal(getPauseMenuControlIndex(settingsControls, 2, "Tab"), 2);
  assert.equal(getPauseMenuControlIndex([], 0, "ArrowDown"), -1);
});

test("Enter and Space activate controls while unrelated keys do not", () => {
  assert.equal(isPauseMenuActivationKey("Enter", "Enter"), true);
  assert.equal(isPauseMenuActivationKey(" ", "Space"), true);
  assert.equal(isPauseMenuActivationKey("Spacebar", "Space"), true);
  assert.equal(isPauseMenuActivationKey("Escape", "Escape"), false);
});

test("PauseScene registers all menu actions, shows a focus ring, and removes keyboard listeners", () => {
  assert.match(pauseScene, /this\.input\.keyboard\.on\("keydown", this\.handleMenuKey, this\)/);
  assert.match(pauseScene, /this\.input\.keyboard\.off\("keydown", this\.handleMenuKey, this\)/);
  assert.match(pauseScene, /setStrokeStyle\(3, GLASS\.gold, 1\)[\s\S]*?setVisible\(false\)/);
  assert.match(pauseScene, /this\.registerKeyboardControl\([\s\S]*?ringWidth: 68/);
  assert.match(pauseScene, /this\.registerKeyboardControl\([\s\S]*?ringWidth: 264/);
  assert.match(pauseScene, /control\.action\(\)/);
  assert.match(pauseScene, /this\.drawCurrentMenu\(focusId\)/);
  assert.doesNotMatch(pauseScene, /bg\.on\("pointerdown", action\)/);
});
