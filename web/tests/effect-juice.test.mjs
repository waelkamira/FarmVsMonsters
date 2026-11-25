import test from "node:test";
import assert from "node:assert/strict";
import { EffectDirector } from "../game/vfx/effects/EffectDirector.mjs";
import { EFFECT_LIBRARY, getEffect } from "../game/vfx/effects/effectLibrary.mjs";

function makeObject(tracker, extra = {}) {
  const obj = {
    active: true, x: 100, y: 100, angle: 0, scaleX: 1, scaleY: 1, rotation: 0, alpha: 1, list: [], depth: 0,
    setScale(x, y) { obj.scaleX = x; obj.scaleY = y ?? x; return obj; },
    setTint(c) { obj.tint = c; obj.tintHistory = [...(obj.tintHistory || []), c]; obj.tinted = true; return obj; },
    setTintFill(c) { obj.setTint(c); return obj; }, clearTint() { obj.tinted = false; return obj; },
    setDepth(d) { obj.depth = d; return obj; }, setBlendMode() { return obj; }, setAlpha(a) { obj.alpha = a; return obj; },
    setPosition(x, y) { obj.x = x; obj.y = y; return obj; }, setRotation(r) { obj.rotation = r; return obj; },
    setOrigin() { return obj; }, setStrokeStyle() { return obj; },
    setData(k, v) { obj.data = { ...(obj.data || {}), [k]: v }; return obj; }, getData(k) { return obj.data?.[k]; },
    destroy() { obj.active = false; tracker.destroyed += 1; },
    clear() { tracker.clears += 1; }, lineStyle() {}, beginPath() {}, moveTo() {}, lineTo() {}, strokePath() {}, arc() {},
    ...extra
  };
  tracker.created += 1;
  tracker.objects.push(obj);
  return obj;
}

/** مشهد وهمي: التحريكات تُنفَّذ فوراً، أو تُؤجَّل ليتحكم الاختبار بالتقدم (step) والإنهاء (finish). */
function makeScene({ defer = false, textApi = true } = {}) {
  const tracker = { created: 0, destroyed: 0, clears: 0, objects: [], steppers: [], events: [], shakes: 0, texts: [] };
  const textures = new Set();
  const scene = {
    tracker,
    time: { now: 0, delayedCall: (ms, fn) => { fn(); return { remove() {} }; }, addEvent: (cfg) => { const ev = { cfg, removed: false, remove() { ev.removed = true; } }; tracker.events.push(ev); return ev; } },
    textures: { exists: (k) => textures.has(k) },
    make: { graphics: () => ({ fillStyle() {}, fillCircle() {}, fillPoints() {}, fillRect() {}, generateTexture: (k) => textures.add(k), destroy() {} }) },
    add: {
      image: () => makeObject(tracker), circle: () => makeObject(tracker), graphics: () => makeObject(tracker),
      ...(textApi ? { text: (x, y, label) => { const o = makeObject(tracker, { x, y, label }); tracker.texts.push(o); return o; } } : {})
    },
    tweens: {
      add: (cfg) => {
        const holder = Array.isArray(cfg.targets) ? cfg.targets[0] : cfg.targets;
        const isCounter = holder && typeof cfg.t === "number";
        const apply = () => { if (!isCounter) for (const key of ["x", "y", "scaleX", "scaleY", "alpha"]) if (typeof cfg[key] === "number") holder[key] = cfg[key]; };
        const step = (v) => { if (isCounter) holder.t = v; cfg.onUpdate?.(); };
        const finish = () => { if (isCounter) holder.t = 1; cfg.onUpdate?.(); apply(); cfg.onComplete?.(); };
        if (defer) tracker.steppers.push({ step, finish }); else finish();
        return {};
      }
    },
    cameras: { main: { shake: () => { tracker.shakes += 1; } } },
    cache: { audio: { exists: () => false } }, sound: { play() {} }
  };
  return scene;
}

test("every effect, including the 7 new ones, restores scale, angle and position and leaks nothing", () => {
  assert.ok(EFFECT_LIBRARY.length >= 33);
  for (const effect of EFFECT_LIBRARY) {
    const scene = makeScene();
    const director = new EffectDirector(scene, { quality: "high" });
    const view = makeObject(scene.tracker);
    assert.equal(director.play(effect.id, { x: 100, y: 100, view }), true, effect.id);
    assert.equal(director.live, 0, `${effect.id} leaked budget`);
    assert.equal(view.scaleX, 1, `${effect.id} scaleX`);
    assert.equal(view.scaleY, 1, `${effect.id} scaleY`);
    assert.ok(Math.abs(view.angle) < 1e-9, `${effect.id} angle`);
    assert.ok(Math.abs(view.x - 100) < 1e-9 && Math.abs(view.y - 100) < 1e-9, `${effect.id} position`);
    assert.equal(view.tinted ?? false, false, `${effect.id} tint`);
  }
});

test("wobble swings within ±12 degrees and returns exactly to the original angle", () => {
  const scene = makeScene({ defer: true });
  const director = new EffectDirector(scene);
  const view = makeObject(scene.tracker, { angle: 5 });
  director.play({ id: "t", trigger: "hit", sound: null, layers: [{ type: "wobble", amp: 12, cycles: 3, life: 420 }] }, { x: 1, y: 1, view });
  const seen = [];
  for (const v of [0.04, 0.12, 0.2, 0.38, 0.6, 0.85]) { scene.tracker.steppers[0].step(v); seen.push(view.angle - 5); }
  assert.ok(Math.max(...seen.map(Math.abs)) <= 12 + 1e-9);
  assert.ok(Math.max(...seen.map(Math.abs)) > 3, "it actually wobbles");
  scene.tracker.steppers[0].finish();
  assert.equal(view.angle, 5);
  assert.equal(view.getData("fxWobbling"), false);
});

test("hop rises 18px in place and lands on the exact starting point, even if the game moves the view meanwhile", () => {
  const scene = makeScene({ defer: true });
  const director = new EffectDirector(scene);
  const view = makeObject(scene.tracker);
  director.play({ id: "t", trigger: "hit", sound: null, layers: [{ type: "hop", height: 18, life: 260 }] }, { x: 1, y: 1, view });
  scene.tracker.steppers[0].step(0.5);
  assert.ok(Math.abs(view.y - 82) < 1e-9, `peak should be 18px up, got ${view.y}`);
  view.x += 7; // اللعبة تحرّك الكائن أفقياً أثناء القفزة
  scene.tracker.steppers[0].finish();
  assert.ok(Math.abs(view.y - 100) < 1e-9);
  assert.equal(view.x, 107, "hop must not touch x");
});

test("jitter shakes horizontally and cancels out completely", () => {
  const scene = makeScene({ defer: true });
  const director = new EffectDirector(scene);
  const view = makeObject(scene.tracker);
  director.play({ id: "t", trigger: "hit", sound: null, layers: [{ type: "jitter", px: 3, life: 320 }] }, { x: 1, y: 1, view });
  const xs = new Set();
  for (const v of [0.05, 0.2, 0.35, 0.5, 0.65]) { scene.tracker.steppers[0].step(v); xs.add(Math.round(view.x - 100)); }
  assert.ok(xs.size > 1 && [...xs].every((d) => Math.abs(d) <= 3), `offsets ${[...xs]}`);
  scene.tracker.steppers[0].finish();
  assert.ok(Math.abs(view.x - 100) < 1e-9);
});

test("speedLines draws radiating lines and cleans up", () => {
  const scene = makeScene({ defer: true });
  const director = new EffectDirector(scene);
  director.play({ id: "t", trigger: "hit", sound: null, layers: [{ type: "speedLines", count: 10, color: 0xffffff, inner: 14, outer: 74, life: 240, width: 3 }] }, { x: 50, y: 50 });
  assert.equal(director.live, 1);
  scene.tracker.steppers[0].step(0.3);
  assert.ok(scene.tracker.clears >= 1);
  scene.tracker.steppers[0].finish();
  assert.equal(director.live, 0);
  assert.equal(scene.tracker.objects[0].active, false);
});

test("reduced motion disables wobble, hop, jitter, speed lines and shake", () => {
  const scene = makeScene({ defer: true });
  const director = new EffectDirector(scene, { reducedMotion: true });
  const view = makeObject(scene.tracker);
  const before = scene.tracker.created;
  director.play({ id: "t", trigger: "hit", sound: null, layers: [
    { type: "wobble", amp: 12, cycles: 3, life: 420 }, { type: "hop", height: 18, life: 260 },
    { type: "jitter", px: 3, life: 300 }, { type: "speedLines", count: 8, color: 1, inner: 1, outer: 9, life: 200, width: 2 },
    { type: "shake", ms: 100, intensity: 0.01 }
  ] }, { x: 1, y: 1, view });
  assert.equal(scene.tracker.steppers.length, 0);
  assert.equal(scene.tracker.created, before);
  assert.equal(scene.tracker.shakes, 0);
});

test("detachPart flies in an arc with spin, fades to alpha 0 and is destroyed", () => {
  const scene = makeScene({ defer: true });
  const director = new EffectDirector(scene);
  assert.equal(director.detachPart({ x: 200, y: 300, shape: "shard", color: 0x999999, vx: 100, vy: -250, gravity: 600, spin: 6, life: 900 }), true);
  assert.equal(director.live, 1);
  const part = scene.tracker.objects[0];
  scene.tracker.steppers[0].step(0.2);
  const early = { x: part.x, y: part.y, r: part.rotation };
  scene.tracker.steppers[0].step(0.5);
  assert.ok(part.x > early.x, "moves forward");
  assert.ok(part.rotation > early.r, "keeps spinning");
  assert.ok(part.y < 300 + 1, "rises first (arc)");
  scene.tracker.steppers[0].step(0.9);
  assert.ok(part.alpha < 1 && part.alpha > 0, "fading");
  scene.tracker.steppers[0].finish();
  assert.equal(part.active, false);
  assert.equal(director.live, 0);
});

test("detachPart mirrors for facing -1, respects the budget and rejects bad input", () => {
  const scene = makeScene({ defer: true });
  const director = new EffectDirector(scene, { quality: "low" });
  director.detachPart({ x: 100, y: 100, shape: "shard", vx: 100, vy: -100, gravity: 0, life: 1000, facing: -1 });
  scene.tracker.steppers[0].step(0.5);
  assert.ok(scene.tracker.objects[0].x < 100);
  for (let i = 0; i < 60; i += 1) director.detachPart({ x: 1, y: 1 });
  assert.ok(director.live <= 28);
  assert.equal(director.detachPart({ x: Number.NaN, y: 1 }), false);
});

test("floatingText pops with Back.easeOut, rises, fades, truncates and is destroyed", () => {
  const scene = makeScene({ defer: true });
  const director = new EffectDirector(scene);
  assert.equal(director.floatingText("+1234567890123456", { x: 10, y: 200 }), true);
  const label = scene.tracker.texts[0];
  assert.equal(label.label.length, 12);
  assert.equal(label.scaleX, 0.4);
  assert.equal(director.live, 1);
  scene.tracker.steppers[0].finish();            // مرحلة القفز والتكبير
  assert.ok(label.y < 200 && label.scaleX > 1);
  assert.equal(scene.tracker.steppers.length, 2); // ثم مرحلة التلاشي
  scene.tracker.steppers[1].finish();
  assert.equal(label.active, false);
  assert.equal(director.live, 0);
  assert.equal(makeScene({ textApi: false }) && new EffectDirector(makeScene({ textApi: false })).floatingText("x", { x: 1, y: 1 }), false);
});

test("electric shock regenerates its bolts every 50ms while flickering white and blue", () => {
  const scene = makeScene({ defer: true });
  const director = new EffectDirector(scene);
  const view = makeObject(scene.tracker);
  director.play(getEffect("electric-shock"), { x: 100, y: 100, view });
  const boltStepper = scene.tracker.steppers.find((s) => s);
  const clearsAtStart = scene.tracker.clears;
  for (const v of [0.05, 0.15, 0.3, 0.5, 0.7, 0.9]) scene.tracker.steppers.forEach((s) => s.step(v));
  assert.ok(scene.tracker.clears - clearsAtStart >= 4, `bolts were redrawn ${scene.tracker.clears - clearsAtStart} times`);
  const flicker = scene.tracker.events.find((e) => e.cfg.loop && e.cfg.delay === 45);
  assert.ok(flicker, "flicker timer exists");
  for (let i = 0; i < 4; i += 1) flicker.cfg.callback();
  assert.ok(view.tintHistory.includes(0xffffff) && view.tintHistory.includes(0x6fe3ff));
  assert.ok(boltStepper);
  scene.tracker.steppers.forEach((s) => s.finish());
  assert.equal(director.live, 0);
  assert.ok(Math.abs(view.x - 100) < 1e-9, "jitter cancelled");
});
