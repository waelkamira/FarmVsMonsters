import test from "node:test";
import assert from "node:assert/strict";
import { VFXRegistry } from "../game/vfx/VFXRegistry.mjs";
import { createDefaultVFXRegistry } from "../game/vfx/createDefaultVFXRegistry.mjs";
import { getPlantVFXProfile } from "../game/vfx/PlantVFXProfiles.mjs";
import { getProjectileVFXProfile } from "../game/vfx/ProjectileVFXProfiles.mjs";
import { VFXManager } from "../game/vfx/VFXManager.mjs";

test("VFXRegistry registers, retrieves, and rejects duplicate effect IDs", () => {
  const registry = new VFXRegistry();
  const definition = { tint: 0xffffff };
  registry.register("test-hit", definition);
  assert.equal(registry.get("test-hit").tint, 0xffffff);
  assert.equal(registry.has("test-hit"), true);
  assert.throws(() => registry.register("test-hit", definition), /already registered/);
});

test("all supported plants have profiles and projectile plants have projectile profiles", () => {
  for (const type of ["radish", "mushroom", "pumpkin", "pineapple", "hazelnut", "mango", "snow-thrower"]) {
    assert.ok(getPlantVFXProfile(type), type);
  }
  for (const type of ["radish", "pineapple", "hazelnut", "mango", "snow-thrower"]) {
    assert.ok(getProjectileVFXProfile(type), type);
  }
  assert.equal(getPlantVFXProfile("unknown"), null);
});

test("default registry contains profile effects without duplicate registration", () => {
  const registry = createDefaultVFXRegistry();
  assert.ok(registry.ids().length >= 20);
  assert.ok(registry.has("hazelnut-impact"));
  assert.ok(registry.has("snow-freeze-impact"));
});

test("VFXManager safely ignores unknown effects and enforces active burst cap", () => {
  const scene = {
    textures: { exists: () => true },
    add: {
      image: () => ({ active: true, setScale() {}, setTint() {}, destroy() { this.active = false; } }),
      container: () => ({ active: true, add() {}, setDepth() {}, destroy() { this.active = false; } }),
      circle: () => ({})
    },
    tweens: { add: () => {} }
  };
  const manager = new VFXManager(scene, { registry: createDefaultVFXRegistry(), limits: { maxActiveBursts: 1 } });
  assert.equal(manager.play("not-registered", 10, 10), null);
  assert.ok(manager.play("hazelnut-impact", 10, 10));
  assert.equal(manager.play("mango-impact", 20, 20), null);
  manager.destroy();
  assert.equal(manager.active.size, 0);
});
