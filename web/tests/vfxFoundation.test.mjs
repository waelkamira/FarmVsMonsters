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

test("VFXEventBus isolates failures thrown by its listener-error handler", () => {
  const bus = new VFXEventBus({
    onListenerError: () => { throw new Error("error-handler-failed"); }
  });
  let laterListenerCalled = false;
  bus.on("test:error-handler", () => { throw new Error("listener-failed"); });
  bus.on("test:error-handler", () => { laterListenerCalled = true; });

  assert.equal(bus.emit("test:error-handler"), 2);
  assert.equal(laterListenerCalled, true);
  assert.equal(bus.lastErrors.length, 2);
  assert.equal(bus.lastErrors[0].source, "listener");
  assert.equal(bus.lastErrors[1].source, "onListenerError");
});

test("VFX config validates limits and selects a quality profile", () => {
  const config = createVFXConfig({ quality: "low", limits: { maxActiveBursts: 4 } });
  assert.equal(config.quality, "low");
  assert.equal(config.qualityProfile.maxParticlesPerEffect, 5);
  assert.equal(config.limits.maxActiveBursts, 4);
  assert.throws(() => createVFXConfig({ limits: { maxActiveBursts: -1 } }), /non-negative/);
});

function createMockScene() {
  const tweens = [];
  const scene = {
    tweenRecords: tweens,
    textures: { exists: () => true },
    add: {
      image: () => ({
        active: true,
        visible: true,
        destroyed: false,
        setPosition(x, y) { this.x = x; this.y = y; },
        setActive(value) { this.active = value; },
        setVisible(value) { this.visible = value; },
        setAlpha(value) { this.alpha = value; },
        setScale(value) { this.scale = value; },
        setTint(value) { this.tint = value; },
        clearTint() { this.tint = null; },
        setDepth(value) { this.depth = value; },
        destroy() { this.active = false; this.destroyed = true; }
      }),
      container: () => ({
        active: true,
        visible: true,
        list: [],
        add(child) { this.list.push(child); },
        setPosition(x, y) { this.x = x; this.y = y; },
        setActive(value) { this.active = value; },
        setVisible(value) { this.visible = value; },
        setAlpha(value) { this.alpha = value; },
        setScale(value) { this.scale = value; },
        setDepth(value) { this.depth = value; },
        destroy() { this.active = false; this.destroyed = true; }
      }),
      circle: (x, y, radius, color, alpha) => ({
        x, y, radius, color, alpha,
        setActive(value) { this.active = value; },
        setVisible(value) { this.visible = value; },
        setAlpha(value) { this.alpha = value; },
        setScale(value) { this.scale = value; },
        setFillStyle(fillColor, fillAlpha) { this.color = fillColor; this.alpha = fillAlpha; }
      })
    },
  };
  scene.tweens = {
    add(config) {
      const tween = {
        config,
        stopped: false,
        stop() { this.stopped = true; }
      };
      tweens.push(tween);
      return tween;
    }
  };
  return scene;
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


test("VFXManager stops tracked tweens when stopAll or destroy is called", () => {
  const scene = createMockScene();
  const manager = new VFXManager(scene, { registry: createDefaultVFXRegistry() });

  const first = manager.play("radish-impact", 10, 10);
  const second = manager.play("mango-impact", 20, 20);
  assert.ok(first);
  assert.ok(second);
  assert.equal(scene.tweenRecords.length, 2);
  assert.equal(manager.activeTweens.size, 2);

  manager.stopAll();
  assert.equal(scene.tweenRecords.every((tween) => tween.stopped), true);
  assert.equal(manager.active.size, 0);
  assert.equal(manager.activeTweens.size, 0);

  const third = manager.play("radish-impact", 30, 30);
  assert.ok(third);
  const thirdTween = scene.tweenRecords[2];
  manager.destroy();
  assert.equal(thirdTween.stopped, true);
  assert.equal(manager.active.size, 0);
  assert.equal(manager.activeTweens.size, 0);
});

test("VFXManager completion releases the visual without stopping a completed tween", () => {
  const scene = createMockScene();
  const manager = new VFXManager(scene, { registry: createDefaultVFXRegistry() });
  const visual = manager.play("radish-impact", 10, 10);
  const tween = scene.tweenRecords[0];

  tween.config.onComplete();

  assert.equal(manager.active.has(visual), false);
  assert.equal(manager.activeTweens.has(visual), false);
  assert.equal(tween.stopped, false);
  manager.destroy();
});


test("VFXObjectPool reuses keyed objects and resets them on acquire and release", async () => {
  const { VFXObjectPool } = await import("../game/vfx/core/VFXObjectPool.mjs");
  const pool = new VFXObjectPool({ maxPerKey: 2, maxTotal: 3 });
  let created = 0;
  const factory = () => ({ id: ++created, state: "new" });
  const reset = (item) => { item.state = "ready"; };

  const first = pool.acquire("spark", factory, reset);
  assert.equal(first.id, 1);
  assert.equal(pool.release("spark", first, { reset }), true);
  assert.equal(first.state, "ready");

  const reused = pool.acquire("spark", factory, reset);
  assert.equal(reused, first);
  assert.equal(created, 1);
  assert.equal(pool.getStats().idle, 0);
  pool.destroy();
});

test("VFXObjectPool enforces per-key and total idle caps and destroys overflow", async () => {
  const { VFXObjectPool } = await import("../game/vfx/core/VFXObjectPool.mjs");
  const pool = new VFXObjectPool({ maxPerKey: 1, maxTotal: 1 });
  const destroyed = [];
  const make = (id) => ({ id, destroy() { destroyed.push(id); } });

  assert.equal(pool.release("spark", make(1)), true);
  assert.equal(pool.release("spark", make(2)), false);
  assert.equal(pool.release("burst", make(3)), false);
  assert.deepEqual(destroyed, [2, 3]);
  assert.deepEqual(pool.getStats(), {
    keys: 1, idle: 1, maxPerKey: 1, maxTotal: 1, destroyed: false
  });
  pool.clear();
  assert.deepEqual(destroyed, [2, 3, 1]);
  assert.equal(pool.getStats().idle, 0);
  pool.destroy();
});

test("VFXObjectPool isolates reset and destroy failures and rejects work after destroy", async () => {
  const { VFXObjectPool } = await import("../game/vfx/core/VFXObjectPool.mjs");
  const errors = [];
  const pool = new VFXObjectPool({ onError: (error, details) => errors.push(details.phase) });
  const item = { destroy() { throw new Error("destroy-failed"); } };

  assert.equal(pool.release("spark", item, {
    reset() { throw new Error("reset-failed"); }
  }), false);
  assert.deepEqual(errors, ["release-reset", "destroy"]);
  pool.destroy();
  assert.equal(pool.acquire("spark", () => ({})), null);
  assert.equal(pool.release("spark", {}), false);
});


test("VFXManager reuses pooled texture visuals after completion and destroys idle visuals on teardown", () => {
  const scene = createMockScene();
  const manager = new VFXManager(scene, { registry: createDefaultVFXRegistry() });
  const first = manager.play("radish-projectile", 10, 10);
  const firstTween = scene.tweenRecords[0];
  assert.ok(first);
  assert.equal(first.visible, true);
  firstTween.config.onComplete();

  assert.equal(first.destroyed, false);
  assert.equal(first.visible, false);
  assert.equal(first.active, false);
  assert.equal(manager.pool.getStats().idle, 1);

  const second = manager.play("radish-projectile", 30, 40);
  assert.equal(second, first);
  assert.equal(second.x, 30);
  assert.equal(second.y, 40);
  assert.equal(second.visible, true);
  assert.equal(second.active, true);
  assert.equal(manager.pool.getStats().idle, 0);

  manager.destroy();
  assert.equal(second.destroyed, true);
  assert.equal(manager.pool.getStats().destroyed, true);
});

test("VFXManager pools procedural container visuals and resets their children before reuse", () => {
  const scene = createMockScene();
  const manager = new VFXManager(scene, { registry: createDefaultVFXRegistry() });
  const first = manager.play("radish-impact", 10, 10, { tint: 0xff0000, count: 4 });
  const firstTween = scene.tweenRecords[0];

  assert.ok(first);
  assert.equal(first.list.length, 4);
  assert.equal(first.visible, true);
  firstTween.config.onComplete();

  assert.equal(first.visible, false);
  assert.equal(first.active, false);
  assert.equal(first.list.every((child) => child.visible === false && child.active === false), true);
  assert.equal(manager.pool.getStats().idle, 1);

  const second = manager.play("radish-impact", 30, 40, { tint: 0x00ff00, count: 4 });
  assert.equal(second, first);
  assert.equal(second.x, 30);
  assert.equal(second.y, 40);
  assert.equal(second.visible, true);
  assert.equal(second.list.every((child) => child.visible === true && child.active === true && child.color === 0x00ff00), true);

  manager.destroy();
  assert.equal(second.destroyed, true);
});
