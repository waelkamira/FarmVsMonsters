import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");

test("battle HUD tracks defeated monsters rather than only spawned monsters", () => {
  assert.match(scene, /const defeated = Math\.min\(this\.waveDefeatedMonsters \|\| 0, this\.waveSize\)/);
  assert.match(scene, /DEFEATED " \+ defeated \+ "\/" \+ this\.waveSize/);
});

test("wave announcements cover the opening wave and every wave transition", () => {
  assert.match(scene, /this\.showWaveAnnouncement\(1\)/);
  assert.match(scene, /this\.showWaveAnnouncement\(this\.wave\)/);
  assert.match(scene, /showWaveAnnouncement\(wave\)/);
});

test("late Stage 1 waves receive distinct danger warnings", () => {
  assert.match(scene, /const majorWave = wave >= 4/);
  assert.match(scene, /FAST SCOUT JOINS/);
  assert.match(scene, /ARMOURED BRUTE INCOMING/);
  assert.match(scene, /تحذير: وحش سريع/);
  assert.match(scene, /تحذير: المدرع الثقيل/);
});

test("wave announcement uses one reusable Phaser container with a bounded tween", () => {
  assert.match(scene, /this\.waveBanner = this\.add\.container\(560, 150\)/);
  assert.match(scene, /this\.tweens\.killTweensOf\(this\.waveBanner\)/);
  assert.match(scene, /duration: 260/);
  assert.match(scene, /hold: 1450/);
});
