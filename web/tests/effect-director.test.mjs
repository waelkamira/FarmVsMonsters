import test from "node:test";
import assert from "node:assert/strict";
import { EffectDirector } from "../game/vfx/effects/EffectDirector.mjs";
import { EFFECT_LIBRARY, EFFECT_SHAPES, getEffect } from "../game/vfx/effects/effectLibrary.mjs";

function makeObject(tracker) {
  const obj = {
    active: true, scaleX: 1, scaleY: 1, rotation: 0, list: [],
    setScale(x, y) { obj.scaleX = x; obj.scaleY = y ?? x; return obj; },
    setTint() { obj.tinted = true; return obj; }, setTintFill() { obj.tinted = true; return obj; },
    clearTint() { obj.tinted = false; return obj; },
    setDepth() { return obj; }, setBlendMode() { return obj; }, setAlpha() { return obj; },
    setPosition() { return obj; }, setRotation() { return obj; }, setStrokeStyle() { return obj; },
    setData(k, v) { obj.data = { ...(obj.data || {}), [k]: v }; return obj; }, getData(k) { return obj.data?.[k]; },
    destroy() { obj.active = false; tracker.destroyed += 1; },
    clear() {}, lineStyle() {}, beginPath() {}, moveTo() {}, lineTo() {}, strokePath() {}, arc() {}
  };
  tracker.created += 1;
  return obj;
}

function makeScene({ deferTweens = false, sounds = true, failImages = false } = {}) {
  const tracker = { created: 0, destroyed: 0, played: [], shakes: 0, pending: [], events: [] };
  const textures = new Set();
  const scene = {
    tracker,
    time: {
      now: 0,
      delayedCall: (ms, fn) => { fn(); return { remove() {} }; },
      addEvent: (cfg) => { const ev = { cfg, removed: false, remove() { ev.removed = true; } }; tracker.events.push(ev); return ev; }
    },
    textures: { exists: (k) => textures.has(k) },
    make: { graphics: () => ({ fillStyle() {}, fillCircle() {}, fillPoints() {}, generateTexture: (k) => textures.add(k), destroy() {} }) },
    add: {
      image: () => { if (failImages) throw new Error("boom"); return makeObject(tracker); },
      circle: () => makeObject(tracker),
      graphics: () => makeObject(tracker)
    },
    tweens: {
      add: (cfg) => {
        const run = () => {
          if (cfg.targets && typeof cfg.t === "number" && !Array.isArray(cfg.targets)) cfg.targets.t = 1;
          cfg.onUpdate?.(); cfg.onComplete?.();
        };
        if (deferTweens) tracker.pending.push(run); else run();
        return {};
      }
    },
    cameras: { main: { shake: () => { tracker.shakes += 1; } } },
    cache: { audio: { exists: () => sounds } },
    sound: { play: (key, cfg) => tracker.played.push({ key, ...cfg }) }
  };
  return scene;
}

test("textures for every particle shape are generated once", () => {
  const scene = makeScene();
  new EffectDirector(scene, { quality: "high" });
  new EffectDirector(scene, { quality: "high" });
  for (const name of Object.keys(EFFECT_SHAPES)) assert.ok(scene.textures.exists("fx-shape-" + name), name);
});

test("every library effect plays without throwing and releases all objects", () => {
  for (const effect of EFFECT_LIBRARY) {
    const scene = makeScene();
    const director = new EffectDirector(scene, { quality: "high" });
    const view = makeObject(scene.tracker);
    assert.equal(director.play(effect.id, { x: 100, y: 100, view }), true, effect.id);
    assert.equal(director.live, 0, `${effect.id} leaked budget`);
    assert.equal(view.scaleX, 1, `${effect.id} left the view scaled`);
    assert.equal(view.tinted ?? false, false, `${effect.id} left the view tinted`);
  }
});

test("each effect plays its own sound once, with a volume derived from the effects slider", () => {
  const scene = makeScene();
  const director = new EffectDirector(scene, { quality: "high", getVolume: () => 50 });
  director.play("electric-shock", { x: 10, y: 10 });
  assert.equal(scene.tracker.played.length, 1);
  assert.equal(scene.tracker.played[0].key, "fx-electric-shock");
  assert.ok(scene.tracker.played[0].volume > 0 && scene.tracker.played[0].volume <= 0.5);
  assert.ok(scene.tracker.played[0].rate >= 0.95 && scene.tracker.played[0].rate <= 1.05);
});

test("sound respects cooldown, muted volume and missing audio", () => {
  const scene = makeScene();
  const director = new EffectDirector(scene, { getVolume: () => 100 });
  director.play("slash", { x: 1, y: 1 });
  director.play("slash", { x: 1, y: 1 });
  assert.equal(scene.tracker.played.length, 1, "cooldown");
  scene.time.now = 10_000;
  director.play("slash", { x: 1, y: 1 });
  assert.equal(scene.tracker.played.length, 2);

  const muted = makeScene();
  new EffectDirector(muted, { getVolume: () => 0 }).play("freeze", { x: 1, y: 1 });
  assert.equal(muted.tracker.played.length, 0);

  const silent = makeScene({ sounds: false });
  assert.equal(new EffectDirector(silent).play("freeze", { x: 1, y: 1 }), true);
  assert.equal(silent.tracker.played.length, 0);
});

test("the object budget is enforced per quality level", () => {
  const caps = { high: 120, medium: 64, low: 28 };
  for (const [quality, cap] of Object.entries(caps)) {
    const scene = makeScene({ deferTweens: true });
    const director = new EffectDirector(scene, { quality });
    for (let i = 0; i < 80; i += 1) director.play("explosion", { x: 5, y: 5 });
    assert.ok(director.live <= cap, `${quality}: ${director.live} > ${cap}`);
    assert.ok(scene.tracker.created - 0 >= 1);
    scene.tracker.pending.forEach((run) => run());
    assert.equal(director.live, 0, `${quality} not released`);
  }
});

test("a failing renderer never throws into gameplay", () => {
  const scene = makeScene({ failImages: true });
  const director = new EffectDirector(scene);
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.doesNotThrow(() => director.play("explosion", { x: 1, y: 1 }));
    assert.doesNotThrow(() => director.play("freeze", { x: Number.NaN, y: 1 }));
    assert.equal(director.play("does-not-exist", { x: 1, y: 1 }), false);
  } finally {
    console.warn = originalWarn;
  }
});

test("playAssigned only plays effects whose trigger matches", () => {
  const scene = makeScene();
  const director = new EffectDirector(scene);
  assert.equal(director.playAssigned(["freeze", "recoil-pop", "poof-vanish"], "hit", { x: 1, y: 1 }), 1);
  assert.equal(director.playAssigned(["freeze", "recoil-pop"], "fire", { x: 1, y: 1 }), 1);
  assert.equal(director.playAssigned(["freeze"], "death", { x: 1, y: 1 }), 0);
});

test("camera shake can be disabled for reduced-motion players", () => {
  const normal = makeScene();
  new EffectDirector(normal).play("explosion", { x: 1, y: 1 });
  assert.equal(normal.tracker.shakes, 1);
  const calm = makeScene();
  new EffectDirector(calm, { reducedMotion: true }).play("explosion", { x: 1, y: 1 });
  assert.equal(calm.tracker.shakes, 0);
});

test("auras repeat while the owner lives and stop when it disappears", () => {
  const scene = makeScene();
  const director = new EffectDirector(scene);
  let alive = true;
  const stop = director.startAuras(["fire-aura", "freeze"], () => (alive ? { x: 5, y: 5 } : null));
  assert.equal(scene.tracker.events.length, 1, "only aura-type effects start timers");
  const event = scene.tracker.events[0];
  event.cfg.callback();
  assert.ok(scene.tracker.created > 0);
  alive = false;
  event.cfg.callback();
  assert.equal(event.removed, true);
  stop();
});

test("tint restores the view and flicker timers do not outlive the effect", () => {
  const scene = makeScene();
  const director = new EffectDirector(scene);
  const view = makeObject(scene.tracker);
  director.play(getEffect("electric-shock"), { x: 1, y: 1, view });
  assert.equal(view.tinted, false);
  assert.ok(scene.tracker.events.every((e) => e.removed || e.cfg.loop !== true));
});
