import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { VFXManager } from "../game/vfx/VFXManager.mjs";
import { VFXPerformance } from "../game/vfx/VFXPerformance.mjs";

test("adaptive quality moves down under sustained frame pressure and recovers", () => {
  const monitor = new VFXPerformance({ initialQuality: "ultra", sampleLimit: 15 });
  for (let i = 0; i < 20; i += 1) monitor.sample(34);
  assert.equal(monitor.current, "performance");
  for (let i = 0; i < 200; i += 1) monitor.sample(12);
  assert.equal(monitor.current, "ultra");
});

test("fixed quality mode is respected", () => {
  const monitor = new VFXPerformance({ quality: "performance" });
  for (let i = 0; i < 20; i += 1) monitor.sample(10);
  assert.equal(monitor.current, "performance");
});

test("manager rejects unknown presets and invalid coordinates safely", () => {
  const scene = {
    add: { container() { throw new Error("must not allocate"); } },
    tweens: { add() {} },
    events: new EventEmitter()
  };
  const manager = new VFXManager(scene);
  assert.equal(manager.play("not-a-preset", { x: 1, y: 1 }), null);
  assert.equal(manager.play("impact.plant", { x: NaN, y: 1 }), null);
  manager.destroy();
});

test("manager respects its concurrent effect cap", () => {
  const scene = {
    add: { container() { return { active: true, depth: 1, once() {}, add() {}, destroy() { this.active = false; } }; } },
    tweens: { add() {} },
    events: new EventEmitter()
  };
  const manager = new VFXManager(scene, { quality: "performance" });
  manager.performance.current = "performance";
  for (let index = 0; index < manager.performance.profile.maxConcurrentEffects; index += 1) manager.active.add({});
  assert.equal(manager.play("impact.plant", { x: 10, y: 20 }), null);
  manager.destroy();
});
