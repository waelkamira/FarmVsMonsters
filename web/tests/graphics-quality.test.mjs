import test from "node:test";
import assert from "node:assert/strict";
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
