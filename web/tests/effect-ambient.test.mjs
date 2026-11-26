import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { AmbientFX, atmosphereForStage } from "../game/vfx/effects/AmbientFX.mjs";

function makeSprite(tracker, kind) {
  const s = {
    kind, active: true, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, alpha: 1, depth: 0, blend: 0,
    setDepth(d) { s.depth = d; return s; }, setTint(c) { s.tint = c; return s; }, setBlendMode(b) { s.blend = b; return s; },
    setScale(x, y) { s.scaleX = x; s.scaleY = y ?? x; return s; }, setAlpha(a) { s.alpha = a; return s; },
    setRotation(r) { s.rotation = r; return s; }, setPosition(x, y) { s.x = x; s.y = y; return s; },
    destroy() { s.active = false; tracker.destroyed += 1; }
  };
  tracker.sprites.push(s);
  return s;
}

function makeScene() {
  const tracker = { sprites: [], destroyed: 0, flashes: 0, timers: [], delayed: [], pendingTweens: [] };
  const handlers = new Map();
  const textures = new Set();
  return {
    tracker, scale: { width: 1120, height: 680 },
    events: { on: (n, f) => handlers.set(n, [...(handlers.get(n) || []), f]), off: (n, f) => handlers.set(n, (handlers.get(n) || []).filter((x) => x !== f)), emit: (n, ...a) => (handlers.get(n) || []).forEach((f) => f(...a)), count: (n) => (handlers.get(n) || []).length },
    textures: { exists: (k) => textures.has(k) },
    make: { graphics: () => ({ fillStyle() {}, fillCircle() {}, fillPoints() {}, fillRect() {}, generateTexture: (k) => textures.add(k), destroy() {} }) },
    add: {
      image: (x, y, key) => { const s = makeSprite(tracker, key); s.x = x; s.y = y; return s; },
      rectangle: (x, y, w, h, color, alpha) => { const s = makeSprite(tracker, "rect"); s.x = x; s.y = y; s.color = color; s.alpha = alpha; return s; }
    },
    time: {
      now: 0,
      addEvent: (cfg) => { const ev = { cfg, removed: false, remove() { ev.removed = true; } }; tracker.timers.push(ev); return ev; },
      delayedCall: (ms, fn) => { const d = { ms, fn, removed: false, remove() { d.removed = true; } }; tracker.delayed.push(d); return d; }
    },
    tweens: { add: (cfg) => { tracker.pendingTweens.push(cfg); return {}; } },
    cameras: { main: { flash: () => { tracker.flashes += 1; } } }
  };
}
const live = (scene) => scene.tracker.sprites.filter((s) => s.active);
const kinds = (scene, kind) => live(scene).filter((s) => s.kind === kind);
const CAPS = { high: 120, medium: 64, low: 28 };

test("stages map to day, sunset and stormy night", () => {
  for (const [stage, expected] of [[1, "day"], [2, "day"], [3, "sunset"], [4, "sunset"], [5, "night"], [12, "night"], [undefined, "day"]]) {
    assert.equal(atmosphereForStage(stage), expected, String(stage));
  }
});

test("day: warm light, sun motes and green leaves, no rain, under the combat VFX layer", () => {
  const scene = makeScene();
  const fx = new AmbientFX(scene, { quality: "high" });
  assert.equal(fx.applyStageAtmosphere(1), "day");
  assert.ok(kinds(scene, "fx-shape-dot").length > 0, "motes");
  const glow = kinds(scene, "fx-ambient-soft-glow")[0];
  assert.ok(glow, "cached soft light pool");
  assert.equal(glow.tint, 0xffe2a8);
  assert.equal(glow.depth, 33.9, "lighting remains below combat VFX and HUD");
  assert.equal(kinds(scene, "fx-ambient-rain").length, 0);
  assert.ok(scene.tracker.timers.some((t) => t.cfg.loop && !t.removed), "breeze timer");
  const filter = kinds(scene, "rect")[0];
  assert.equal(filter.blend, 0);
  assert.ok(filter.alpha > 0 && filter.alpha < 0.2);
  for (const s of live(scene).filter((x) => x.kind !== "rect" && x.kind !== "fx-ambient-soft-glow")) assert.equal(s.depth, 34);
  assert.ok(34 < 36, "below combat effects");
  assert.ok(live(scene).every((s) => s.depth <= 34));
});

test("sunset: MULTIPLY orange filter with autumn leaves", () => {
  const scene = makeScene();
  const fx = new AmbientFX(scene, { quality: "high" });
  fx.applyStageAtmosphere(3);
  const filter = kinds(scene, "rect")[0];
  assert.equal(filter.blend, 2);
  assert.equal(filter.color, 0xffb27a);
  scene.tracker.timers[0].cfg.callback();
  const tints = kinds(scene, "fx-shape-leaf").map((l) => l.tint);
  assert.ok(tints.length > 0 && tints.every((c) => [0xff8a3d, 0xd9482b, 0xe8b04a].includes(c)));
});

test("night: blue MULTIPLY filter, slanted rain and distant lightning that flashes the camera", () => {
  const scene = makeScene();
  const fx = new AmbientFX(scene, { quality: "high" });
  fx.applyStageAtmosphere(5);
  assert.equal(kinds(scene, "rect")[0].blend, 2);
  assert.equal(kinds(scene, "rect")[0].color, 0x5a6fa8);
  assert.equal(kinds(scene, "fx-ambient-soft-glow")[0].tint, 0x9bbcff);
  const rain = kinds(scene, "fx-ambient-rain");
  assert.equal(rain.length, 36);
  assert.ok(rain.every((d) => d.rotation > 0), "slanted");
  assert.equal(scene.tracker.timers.length, 0, "no leaf breeze at night");
  const strike = scene.tracker.delayed.find((d) => !d.removed);
  assert.ok(strike && strike.ms >= 5000 && strike.ms <= 10000);
  strike.fn();
  assert.equal(scene.tracker.flashes, 1);
});

test("final wave escalation thickens rain, speeds up lightning and darkens the sky (any stage, only once)", () => {
  const night = makeScene();
  const nightFx = new AmbientFX(night, { quality: "high" });
  nightFx.applyStageAtmosphere(6);
  const before = kinds(night, "fx-ambient-rain").length;
  assert.equal(nightFx.escalateFinalWave(), true);
  assert.ok(kinds(night, "fx-ambient-rain").length > before);
  const strike = night.tracker.delayed.filter((d) => !d.removed).at(-1);
  assert.ok(strike.ms <= 5500, "faster lightning");
  assert.equal(nightFx.escalateFinalWave(), false, "idempotent");
  assert.ok(night.tracker.pendingTweens.some((t) => t.alpha === 0.14), "storm shade fades in");

  const day = makeScene();
  const dayFx = new AmbientFX(day, { quality: "high" });
  dayFx.applyStageAtmosphere(1);
  assert.equal(kinds(day, "fx-ambient-rain").length, 0);
  dayFx.escalateFinalWave();
  assert.ok(kinds(day, "fx-ambient-rain").length > 0, "day storm");
  assert.ok(day.tracker.delayed.some((d) => !d.removed), "lightning scheduled");
});

test("ambient objects never exceed the per-quality budget, even escalated and spammed", () => {
  for (const [quality, cap] of Object.entries(CAPS)) {
    const scene = makeScene();
    const fx = new AmbientFX(scene, { quality });
    fx.applyStageAtmosphere(5);
    fx.escalateFinalWave();
    for (let i = 0; i < 40; i += 1) scene.tracker.timers.forEach((t) => t.cfg.callback());
    const monster = {};
    for (let i = 0; i < 200; i += 1) fx.spawnFootstepDust({ id: i }, 400, 300, 700);
    assert.ok(fx.activeCount <= cap, `${quality}: ${fx.activeCount} > ${cap}`);
  }
});

test("footstep dust appears every 650ms while walking, never touches the monster, and is removed after fading", () => {
  const scene = makeScene();
  const fx = new AmbientFX(scene, { quality: "high" });
  const monster = { id: "m1", localX: 5 };
  const keysBefore = JSON.stringify(monster);
  let spawned = 0;
  for (let ms = 0; ms < 3000; ms += 16) if (fx.spawnFootstepDust(monster, 600, 300, 16)) spawned += 1;
  assert.ok(spawned >= 3 && spawned <= 5, `spawned ${spawned} in 3s`);
  assert.equal(JSON.stringify(monster), keysBefore, "monster record is untouched (replay-safe)");
  assert.ok(scene.tracker.pendingTweens.length >= 1);
  scene.tracker.pendingTweens.forEach((t) => t.onComplete());
  assert.equal(fx.dust.size, 0);
  assert.equal(kinds(scene, "fx-shape-puff").length, 0);
});

test("reduced motion removes rain, leaves, lightning and dust and keeps only a few static motes", () => {
  const scene = makeScene();
  const fx = new AmbientFX(scene, { quality: "high", reducedMotion: true });
  fx.applyStageAtmosphere(5);
  fx.escalateFinalWave();
  assert.equal(kinds(scene, "fx-ambient-rain").length, 0);
  assert.equal(scene.tracker.delayed.filter((d) => !d.removed).length, 0);
  assert.ok(kinds(scene, "fx-shape-dot").length <= 3);
  assert.equal(fx.spawnFootstepDust({}, 1, 1, 5000), false);
  const day = makeScene();
  const dayFx = new AmbientFX(day, { reducedMotion: true, quality: "high" });
  dayFx.applyStageAtmosphere(1);
  assert.equal(day.tracker.timers.length, 0, "no leaf breeze");
  assert.equal(day.tracker.flashes, 0);
});

test("the update loop drifts motes, moves leaves right-to-left, removes off-screen leaves and wraps rain", () => {
  const scene = makeScene();
  const fx = new AmbientFX(scene, { quality: "high" });
  fx.applyStageAtmosphere(1);
  scene.tracker.timers[0].cfg.callback();
  const leaf = kinds(scene, "fx-shape-leaf")[0];
  const startX = leaf.x;
  const mote = kinds(scene, "fx-shape-dot")[0];
  const moteStart = { x: mote.x, y: mote.y };
  scene.time.now = 2500;
  scene.events.emit("update", 2500, 16);
  assert.ok(leaf.x < startX, "leaf moved left");
  assert.ok(mote.x !== moteStart.x || mote.y !== moteStart.y, "mote drifted");
  for (let i = 0; i < 400 && leaf.active; i += 1) scene.events.emit("update", 0, 50);
  assert.equal(leaf.active, false, "off-screen leaf destroyed");

  const night = makeScene();
  const nightFx = new AmbientFX(night, { quality: "high" });
  nightFx.applyStageAtmosphere(5);
  const drop = kinds(night, "fx-ambient-rain")[0];
  drop.y = 9999;
  night.events.emit("update", 0, 16);
  assert.ok(drop.y < 0, "drop wrapped to the top");
});

test("re-applying atmosphere never leaks, and destroy removes the listener and every object", () => {
  const scene = makeScene();
  const fx = new AmbientFX(scene, { quality: "high" });
  fx.applyStageAtmosphere(1);
  const first = live(scene).length;
  fx.applyStageAtmosphere(1);
  assert.equal(live(scene).length, first, "no leak on re-apply");
  fx.applyStageAtmosphere(5);
  assert.equal(kinds(scene, "fx-shape-leaf").length, 0, "old leaves cleared");
  assert.equal(scene.events.count("update"), 2, "ambient and adaptive-quality listeners are active");
  fx.destroy();
  assert.equal(scene.events.count("update"), 0);
  assert.equal(live(scene).length, 0);
  assert.equal(fx.activeCount, 0);
  assert.equal(kinds(scene, "fx-ambient-soft-glow").length, 0, "light pool destroyed");
  assert.doesNotThrow(() => fx.destroy());
  assert.equal(fx.spawnFootstepDust({}, 1, 1, 9999), false);
});

test("unavailable canvas texture generation skips the glow but keeps stage ambience running", () => {
  const scene = makeScene();
  scene.make.graphics = () => { throw new Error("canvas unavailable"); };
  const fx = new AmbientFX(scene, { quality: "high" });
  assert.equal(fx.applyStageAtmosphere(1), "day");
  assert.equal(kinds(scene, "fx-ambient-soft-glow").length, 0);
  assert.ok(kinds(scene, "fx-shape-dot").length > 0, "ordinary ambient motes still render");
  fx.destroy();
});

test("a failing renderer never throws into gameplay", () => {
  const scene = makeScene();
  scene.add.image = () => { throw new Error("boom"); };
  const fx = new AmbientFX(scene, { quality: "high" });
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.doesNotThrow(() => fx.applyStageAtmosphere(5));
    assert.doesNotThrow(() => fx.escalateFinalWave());
  } finally {
    console.warn = warn;
  }
});

test("BattleScene wires AmbientFX to stage atmosphere, walking dust and the final wave", () => {
  const src = fs.readFileSync("game/scenes/BattleScene.js", "utf8");
  assert.match(src, /new AmbientFX\(this/);
  assert.match(src, /applyStageAtmosphere\(this\.stageNumber\)/);
  assert.match(src, /spawnFootstepDust\(monster/);
  assert.match(src, /this\.wave === this\.totalWaves\) this\.ambientFx\?\.escalateFinalWave\(\)/);
  assert.match(src, /ambientFx\?\.destroy\(\)/);
});


test("BattleScene adds lightweight contact shadows beneath built-in and Studio plants and monsters", () => {
  const src = fs.readFileSync("game/scenes/BattleScene.js", "utf8");
  assert.match(src, /addGroundContactShadow\(view, 82 \* profile\.widthScale, 24 \* profile\.heightScale, 0\.24\)/);
  assert.match(src, /addGroundContactShadow\(container, Math\.min\(92 \* perspective \* sizeFactor, 132\)/);
  assert.match(src, /addGroundContactShadow\(plant, \(shadowWidths\[type\] \|\| 48\) \* 0\.9 \* pineapplePerspectiveScale, 18 \* pineapplePerspectiveScale, 0\.2\)/);
  assert.match(src, /addGroundContactShadow\(plant, 48, 15, 0\.19\)/);
  assert.match(src, /addGroundContactShadow\(plant, 44 \* perspectiveScale, 13 \* perspectiveScale, 0\.2\)/);
  assert.match(src, /addGroundContactShadow\(this\.caveman, 92, 20, 0\.18\)/);
  assert.match(src, /const shadow = this\.add\.ellipse\(0, -1, width, height, 0x20180f, alpha\)/);
  assert.match(src, /view\.add\(shadow\)/);
  assert.match(src, /catch \{\s+return null;\s+\}\s+\}/);
});
