import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const gameComponent = readFileSync(resolve(here, "../game/PhaserGame.jsx"), "utf8");
const hud = readFileSync(resolve(here, "../game/scenes/BattleHudButtons.js"), "utf8");
const styles = readFileSync(resolve(here, "../app/globals.css"), "utf8");
const layout = readFileSync(resolve(here, "../app/layout.js"), "utf8");

test("mobile battle detects portrait phones and presents a landscape instruction", () => {
  assert.match(gameComponent, /\(max-width: 700px\) and \(orientation: portrait\)/);
  assert.match(gameComponent, /orientationchange/);
  assert.match(gameComponent, /game-orientation-prompt/);
  assert.match(gameComponent, /أدر جهازك إلى الوضع الأفقي/);
});

test("Phaser rendering uses a capped device-pixel ratio and retains the fixed landscape game space", () => {
  assert.match(gameComponent, /width: 1120/);
  assert.match(gameComponent, /height: 680/);
  assert.match(gameComponent, /mode: Scale\.FIT/);
  assert.match(gameComponent, /resolution: Math\.min\(window\.devicePixelRatio \|\| 1, 2\)/);
});

test("mobile users can request and exit fullscreen from a direct button gesture", () => {
  assert.match(gameComponent, /className="game-fullscreen-button"/);
  assert.match(gameComponent, /requestFullscreen/);
  assert.match(gameComponent, /exitFullscreen/);
  assert.match(gameComponent, /fullscreenchange/);
  assert.match(styles, /\.phaser-host:fullscreen/);
});

test("the mobile HUD has 76px touch hit areas for every primary control", () => {
  assert.match(hud, /BATTLE_HUD_TOUCH_TARGET_SIZE = 76/);
  assert.match(hud, /function setTouchTarget\(/);
  assert.match(hud, /hitAreaCallback/);
  assert.equal((hud.match(/setTouchTarget\(/g) || []).length >= 9, true);
});

test("mobile game canvas disables browser gestures and exposes a device viewport", () => {
  assert.match(styles, /\.phaser-host,\s*\.phaser-host canvas\s*\{[\s\S]*?touch-action: none/);
  assert.match(styles, /@media \(max-width: 900px\) and \(pointer: coarse\)/);
  assert.match(layout, /width: "device-width"/);
  assert.match(layout, /viewportFit: "cover"/);
});
