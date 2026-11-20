import test from "node:test";
import assert from "node:assert/strict";
import { VFXRegistry } from "../game/vfx/VFXRegistry.mjs";
import { createDefaultVFXRegistry } from "../game/vfx/createDefaultVFXRegistry.mjs";
import { getPlantVFXProfile } from "../game/vfx/PlantVFXProfiles.mjs";
import { getProjectileVFXProfile } from "../game/vfx/ProjectileVFXProfiles.mjs";
import { VFXManager } from "../game/vfx/VFXManager.mjs";
import { VFXEventBus } from "../game/vfx/core/VFXEventBus.mjs";
import { createVFXConfig } from "../game/vfx/core/VFXConfig.mjs";

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

test("VFXEventBus supports subscribe, once, unsubscribe, and listener isolation", () => {
  const errors = [];
  const bus = new VFXEventBus({ onListenerError: (error) => errors.push(error) });
  let calls = 0;
  const unsubscribe = bus.on("test:event", () => { calls += 1; });
  bus.once("test:event", () => { throw new Error("isolated"); });
  assert.equal(bus.emit("test:event"), 2);
  assert.equal(bus.emit("test:event"), 1);
  assert.equal(calls, 2);
  assert.equal(errors.length, 1);
  unsubscribe();
  assert.equal(bus.listenerCount(), 0);
  bus.destroy();
  assert.equal(bus.emit("test:event"), 0);
});

test("VFX config validates limits and selects a quality profile", () => {
  const config = createVFXConfig({ quality: "low", limits: { maxActiveBursts: 4 } });
  assert.equal(config.quality, "low");
  assert.equal(config.qualityProfile.maxParticlesPerEffect, 5);
  assert.equal(config.limits.maxActiveBursts, 4);
  assert.throws(() => createVFXConfig({ limits: { maxActiveBursts: -1 } }), /non-negative/);
});

function createMockScene() {
  return {
    textures: { exists: () => true },
    add: {
      image: () => ({
        active: true,
        setScale() {},
        setTint() {},
        setDepth() {},
        destroy() { this.active = false; }
      }),
      container: () => ({
        active: true,
        add() {},
        setDepth() {},
        destroy() { this.active = false; }
      }),
      circle: () => ({})
    },
    tweens: { add: () => {} }
  };
}

test("VFXManager safely ignores unknown effects and enforces active burst cap", () => {
  const manager = new VFXManager(createMockScene(), {
    registry: createDefaultVFXRegistry(),
    limits: { maxActiveBursts: 1 }
  });
  assert.equal(manager.play("not-registered", 10, 10), null);
  assert.ok(manager.play("hazelnut-impact", 10, 10));
  assert.equal(manager.play("mango-impact", 20, 20), null);
  manager.destroy();
  assert.equal(manager.active.size, 0);
});

test("VFXManager accepts event-bus play requests and keeps the legacy play API", () => {
  const bus = new VFXEventBus();
  const manager = new VFXManager(createMockScene(), {
    registry: createDefaultVFXRegistry(),
    eventBus: bus
  });
  const started = [];
  bus.on("vfx:started", (event) => started.push(event));
  assert.equal(manager.dispatch({ effectId: "radish-impact", x: 12, y: 18 }), 1);
  assert.equal(manager.active.size, 1);
  assert.equal(started.length, 1);
  assert.equal(started[0].effectId, "radish-impact");
  bus.emit("vfx:stop-all");
  assert.equal(manager.active.size, 0);
  manager.destroy();
  assert.equal(bus.listenerCount("vfx:play"), 0);
  bus.destroy();
});
