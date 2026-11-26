import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { detectVFXQuality, createVFXConfig } from "../game/vfx/core/VFXConfig.mjs";
import { detectEffectQuality } from "../game/vfx/effects/EffectDirector.mjs";

const desktop = { sys: { game: { device: { os: {} } } } };
const android = { sys: { game: { device: { os: { android: true } } } } };

test("weak hardware selects the low VFX budget on desktop and mobile", () => {
  assert.equal(detectVFXQuality(desktop, { deviceMemory: 2, hardwareConcurrency: 8 }), "low");
  assert.equal(detectVFXQuality(android, { deviceMemory: 8, hardwareConcurrency: 4 }), "low");
});

test("capable mobile hardware can use high quality while unknown mobile stays balanced", () => {
  assert.equal(detectVFXQuality(android, { deviceMemory: 8, hardwareConcurrency: 8 }), "high");
  assert.equal(detectVFXQuality(android, {}), "medium");
});

test("desktop hardware hints select medium when capabilities are limited", () => {
  assert.equal(detectVFXQuality(desktop, { deviceMemory: 4, hardwareConcurrency: 8 }), "medium");
  assert.equal(detectVFXQuality(desktop, {}), "high");
});

test("the legacy effect director detector delegates to the shared quality policy", () => {
  assert.equal(detectEffectQuality(android, {}), "medium");
  assert.equal(detectEffectQuality(desktop, {}), "high");
  assert.equal(detectEffectQuality(desktop, { hardwareConcurrency: 2 }), "low");
});

test("the shared quality is reflected in the existing VFX particle profile", () => {
  assert.equal(createVFXConfig({ quality: "low" }).qualityProfile.maxParticlesPerEffect, 5);
  assert.equal(createVFXConfig({ quality: "medium" }).qualityProfile.maxParticlesPerEffect, 9);
  assert.equal(createVFXConfig({ quality: "high" }).qualityProfile.maxParticlesPerEffect, 16);
});

test("BattleScene passes one selected quality to all three VFX systems", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const battle = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
  assert.match(battle, /this\.graphicsQuality = detectEffectQuality\(this\)/);
  assert.match(battle, /config: \{ quality: this\.graphicsQuality \}/);
  assert.match(battle, /new EffectDirector\(this, \{\s*quality: this\.graphicsQuality/);
  assert.match(battle, /new AmbientFX\(this, \{\s*quality: this\.graphicsQuality/);
});

import { detectBrowserVFXQuality, getGameRenderResolution } from "../game/vfx/core/VFXConfig.mjs";

test("browser and battle scene quality detection share hardware tiers", () => {
  assert.equal(detectBrowserVFXQuality({ userAgent: "Mozilla/5.0 (Windows NT 10.0)" }), "high");
  assert.equal(detectBrowserVFXQuality({ userAgent: "Mozilla/5.0 (Linux; Android 13; Mobile)" }), "medium");
  assert.equal(detectBrowserVFXQuality({ userAgentData: { mobile: true }, deviceMemory: 8, hardwareConcurrency: 8 }), "high");
  assert.equal(detectBrowserVFXQuality({ userAgentData: { mobile: true }, deviceMemory: 2, hardwareConcurrency: 8 }), "low");
});

test("render resolution uses a bounded device-aware pixel ratio", () => {
  assert.equal(getGameRenderResolution(3, "high"), 2.5);
  assert.equal(getGameRenderResolution(3, "medium"), 1.75);
  assert.equal(getGameRenderResolution(3, "low"), 1.25);
  assert.equal(getGameRenderResolution(1.5, "high"), 1.5);
  assert.equal(getGameRenderResolution(undefined, "high"), 1);
  assert.equal(getGameRenderResolution(0.5, "medium"), 1);
});
