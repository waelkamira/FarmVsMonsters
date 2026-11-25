import { EFFECT_SHAPES } from "./effectLibrary.mjs";

/**
 * معاينة متحركة لتأثير داخل لوحة Canvas في الاستوديو.
 * تقرأ نفس بيانات المكتبة التي يقرؤها محرّك اللعبة، فما تراه هنا يشبه ما سيحدث في المعركة.
 * (تقريب بصري: الشكل النهائي في Phaser قد يختلف قليلاً.)
 */

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const hex = (n) => "#" + (n >>> 0).toString(16).padStart(6, "0").slice(-6);
const mix = (a, b, k) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return `rgb(${Math.round(ar + (br - ar) * k)},${Math.round(ag + (bg - ag) * k)},${Math.round(ab + (bb - ab) * k)})`;
};

// عشوائية ثابتة لكل تشغيل حتى لا تهتز الجسيمات بين الإطارات
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawShape(ctx, shape, x, y, scale, rotation, color, alpha, additive) {
  const commands = EFFECT_SHAPES[shape] || EFFECT_SHAPES.dot;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.globalCompositeOperation = additive ? "lighter" : "source-over";
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.translate(-16, -16);
  ctx.fillStyle = hex(color);
  for (const cmd of commands) {
    ctx.beginPath();
    if (cmd.t === "circle") ctx.arc(cmd.x, cmd.y, cmd.r, 0, TAU);
    else {
      cmd.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.restore();
}

function buildLayerInstance(layer, rnd, cx, cy) {
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const range = ([a, b]) => a + rnd() * (b - a);
  const base = { life: layer.life, delay: layer.delay || 0 };
  switch (layer.type) {
    case "burst": {
      const parts = Array.from({ length: layer.count }, () => {
        const angle = range(layer.spread) * DEG;
        const speed = range(layer.speed);
        return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: range(layer.size), color: pick(layer.colors), spin: layer.spin ? (rnd() - 0.5) * 12 : 0 };
      });
      return { ...base, draw(ctx, t) {
        const s = (t * layer.life) / 1000;
        for (const p of parts) {
          const grow = layer.shape === "puff" ? 1 + t * 0.9 : 1 - t * 0.45;
          drawShape(ctx, layer.shape, cx + p.vx * s * 0.8, cy + (p.vy * s + 0.5 * layer.gravity * s * s) * 0.8, p.size * grow * 0.8, p.spin * s, p.color, 1 - t * t, layer.additive);
        }
      } };
    }
    case "rise": {
      const parts = Array.from({ length: layer.count }, () => ({ x: cx + (rnd() * 2 - 1) * layer.spreadX, y: cy + (layer.down ? -34 : rnd() * 14 - 4), size: range(layer.size), color: pick(layer.colors), speed: range(layer.speed), phase: rnd() * TAU }));
      return { ...base, draw(ctx, t) {
        const s = (t * layer.life) / 1000;
        for (const p of parts) drawShape(ctx, layer.shape, p.x + Math.sin(p.phase + s * 5) * 6, p.y + (layer.down ? 1 : -1) * p.speed * s, p.size * (1 - t * 0.3) * 0.8, 0, p.color, Math.sin(Math.PI * t) * 0.95, layer.additive);
      } };
    }
    case "ring":
      return { ...base, draw(ctx, t) {
        const k = layer.inward ? 1 - 0.8 * t : 0.2 + 0.8 * t;
        ctx.save();
        ctx.globalAlpha = layer.inward ? t : 1 - t;
        ctx.strokeStyle = hex(layer.color);
        ctx.lineWidth = layer.width;
        ctx.beginPath();
        ctx.arc(cx, cy, layer.radius * k * 0.8, 0, TAU);
        ctx.stroke();
        ctx.restore();
      } };
    case "flash":
      return { ...base, draw(ctx, t) {
        const r = layer.radius * (0.8 + t * 0.9) * 0.8;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, hex(layer.color));
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.save();
        ctx.globalAlpha = 0.85 * (1 - t);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.fill();
        ctx.restore();
      } };
    case "bolt": {
      const bolts = Array.from({ length: layer.count }, () => {
        const sx = cx + (layer.fromTop ? (rnd() - 0.5) * 16 : (rnd() - 0.5) * 68);
        const sy = cy - layer.height * (layer.fromTop ? 1 : 0.55 + rnd() * 0.45);
        const segs = layer.fromTop ? 12 : 7;
        const path = [[sx, sy]];
        for (let i = 1; i < segs; i += 1) path.push([sx + (cx - sx) * (i / segs) + (rnd() - 0.5) * 28, sy + (cy + 8 - sy) * (i / segs)]);
        path.push([cx + (rnd() - 0.5) * 12, cy + 8]);
        return path;
      });
      return { ...base, draw(ctx, t) {
        ctx.save();
        ctx.globalAlpha = 1 - t * t;
        ctx.globalCompositeOperation = "lighter";
        ctx.lineJoin = "round";
        for (const path of bolts) {
          for (const [w, color] of [[(layer.width || 3) + 4, hex(layer.color)], [layer.width || 3, hex(layer.color)], [1.5, "#fff"]]) {
            ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath();
            path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
            ctx.stroke();
          }
        }
        ctx.restore();
      } };
    }
    case "orbit":
      return { ...base, draw(ctx, t) {
        const fade = t > 0.75 ? (1 - t) / 0.25 : 1;
        for (let i = 0; i < layer.count; i += 1) {
          const a = (i / layer.count) * TAU + t * TAU * 2.5;
          drawShape(ctx, layer.shape, cx + Math.cos(a) * layer.radius, cy - layer.height + Math.sin(a) * layer.radius * 0.35, 0.5, a, layer.color, fade, true);
        }
      } };
    case "slash":
      return { ...base, draw(ctx, t) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(layer.angle * DEG);
        const k = 0.8 + t * 0.4;
        ctx.scale(k, k);
        ctx.globalAlpha = 1 - t;
        ctx.lineCap = "round";
        ctx.strokeStyle = hex(layer.color);
        ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(0, 0, layer.size * 0.5, -2.3, -0.5); ctx.stroke();
        ctx.restore();
      } };
    default:
      return null; // tint / shake / squash تُعالَج على جسم الهدف
  }
}

function drawTarget(ctx, cx, cy, effect, elapsed) {
  let sx = 1, sy = 1, tintColor = null, tintK = 0, jitter = 0;
  for (const layer of effect.layers) {
    const t = (elapsed - (layer.delay || 0)) / (layer.life || 1);
    if (t < 0 || t > 1) { if (layer.type !== "shake") continue; }
    if (layer.type === "tint") {
      tintColor = layer.color;
      tintK = layer.flicker ? (Math.floor(elapsed / 45) % 2 ? 0.2 : 0.75) : 0.75 * (1 - t * 0.5);
      if (layer.fill) tintK = 1;
    } else if (layer.type === "squash") {
      const k = layer.from ? 1 - t : Math.sin(Math.PI * t);
      sx = 1 + ((layer.from ? layer.sx : layer.sx) - 1) * k;
      sy = layer.from ? 0.2 + 0.8 * t : 1 + (layer.sy - 1) * k;
    } else if (layer.type === "shake" && elapsed < layer.ms) {
      jitter = Math.max(jitter, layer.intensity * 900 * (1 - elapsed / layer.ms));
    }
  }
  const body = tintColor != null ? mix(0x7fcf6a, tintColor, tintK) : "#7fcf6a";
  ctx.save();
  ctx.translate(cx + (Math.random() - 0.5) * jitter, cy + (Math.random() - 0.5) * jitter);
  ctx.scale(sx, sy);
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.beginPath(); ctx.ellipse(0, 30, 26, 7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = body;
  ctx.strokeStyle = "#1c2b1a";
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, 4, 24, 30, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-9, -6, 6, 0, TAU); ctx.arc(9, -6, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = "#1c2b1a";
  ctx.beginPath(); ctx.arc(-8, -5, 2.6, 0, TAU); ctx.arc(10, -5, 2.6, 0, TAU); ctx.fill();
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 8, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.restore();
}

/**
 * ينشئ معاينة. يعيد { start, stop, replay }.
 * options: { loop = true, loopGapMs = 700, seed = 7 }
 */
export function createEffectPreview(canvas, effect, { loop = true, loopGapMs = 700, seed = 7 } = {}) {
  const ctx = canvas.getContext("2d");
  let raf = 0;
  let startedAt = 0;
  let instances = [];
  let total = 0;

  const prepare = (runSeed) => {
    const rnd = seeded(runSeed);
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.58;
    instances = effect.layers.map((layer) => buildLayerInstance(layer, rnd, cx, cy)).filter(Boolean);
    total = Math.max(...effect.layers.map((l) => (l.delay || 0) + (l.life || l.ms || 0)), 400);
  };

  const frame = (now) => {
    if (!startedAt) startedAt = now;
    const elapsed = now - startedAt;
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.58;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, "#2d3d2c");
    bg.addColorStop(1, "#1d2a1c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawTarget(ctx, cx, cy, effect, elapsed);
    for (const inst of instances) {
      const t = (elapsed - inst.delay) / inst.life;
      if (t >= 0 && t <= 1) inst.draw(ctx, t);
    }
    if (elapsed > total + loopGapMs) {
      if (!loop) { raf = 0; return; }
      startedAt = now;
      prepare(Math.floor(Math.random() * 1e6));
    }
    raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      if (raf) return;
      startedAt = 0;
      prepare(seed);
      raf = requestAnimationFrame(frame);
    },
    replay() {
      this.stop();
      this.start();
    },
    stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}

export default createEffectPreview;
