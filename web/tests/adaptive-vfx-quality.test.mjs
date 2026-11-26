import test from "node:test";
import assert from "node:assert/strict";
import { AdaptiveVFXQuality } from "../game/vfx/core/AdaptiveVFXQuality.mjs";

function createScene() {
  const handlers = new Map();
  return {
    events: {
      on(name, callback) {
        const list = handlers.get(name) || [];
        list.push(callback);
        handlers.set(name, list);
      },
      once(name, callback) {
        const wrapped = (...args) => {
          this.off(name, wrapped);
          callback(...args);
        };
        wrapped.original = callback;
        this.on(name, wrapped);
      },
      off(name, callback) {
        handlers.set(name, (handlers.get(name) || []).filter((item) => item !== callback && item.original !== callback));
      },
      emit(name, ...args) {
        for (const callback of [...(handlers.get(name) || [])]) callback(...args);
      },
      count(name) {
        return (handlers.get(name) || []).length;
      }
    }
  };
}

test("sustained slow frames step quality down one tier at a time", () => {
  const scene = createScene();
  const changes = [];
  const adaptive = new AdaptiveVFXQuality(scene, { quality: "high", onChange: (quality) => changes.push(quality) });
  for (let i = 0; i < 260; i += 1) adaptive.update(32);
  assert.equal(adaptive.quality, "medium");
  assert.deepEqual(changes, ["medium"]);
  for (let i = 0; i < 260; i += 1) adaptive.update(32);
  assert.equal(adaptive.quality, "low");
  assert.deepEqual(changes, ["medium", "low"]);
});

test("stable frame times recover quality gradually without oscillation", () => {
  const adaptive = new AdaptiveVFXQuality(createScene(), { quality: "low" });
  for (let i = 0; i < 1100; i += 1) adaptive.update(16.67);
  assert.equal(adaptive.quality, "medium");
  for (let i = 0; i < 1100; i += 1) adaptive.update(16.67);
  assert.equal(adaptive.quality, "high");
});

test("background-tab spikes and invalid deltas do not change quality", () => {
  const adaptive = new AdaptiveVFXQuality(createScene(), { quality: "high" });
  for (let i = 0; i < 80; i += 1) adaptive.update(250);
  adaptive.update(Number.NaN);
  adaptive.update(-1);
  assert.equal(adaptive.quality, "high");
  assert.equal(adaptive.slowDurationMs, 0);
});

test("quality controller unregisters update and shutdown listeners on destroy", () => {
  const scene = createScene();
  const adaptive = new AdaptiveVFXQuality(scene);
  assert.equal(scene.events.count("update"), 1);
  assert.equal(scene.events.count("shutdown"), 1);
  adaptive.destroy();
  assert.equal(scene.events.count("update"), 0);
  assert.equal(scene.events.count("shutdown"), 0);
  assert.equal(adaptive.update(40), null);
});

test("AmbientFX wires all three cosmetic systems to one adaptive quality controller", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const { dirname, resolve } = await import("node:path");
  const here = dirname(fileURLToPath(import.meta.url));
  const ambient = await readFile(resolve(here, "../game/vfx/effects/AmbientFX.mjs"), "utf8");
  const manager = await readFile(resolve(here, "../game/vfx/VFXManager.mjs"), "utf8");
  assert.match(ambient, /new AdaptiveVFXQuality\(scene/);
  assert.match(ambient, /scene\?\.vfxManager\?\.setQuality/);
  assert.match(ambient, /scene\?\.effectDirector\?\.setQuality/);
  assert.match(ambient, /this\.setQuality\(quality\)/);
  assert.match(manager, /setQuality\(quality\)/);
  assert.match(manager, /this\.qualityProfile\.maxParticlesPerEffect/);
});
