import { EFFECT_SHAPES, getEffect, normalizeEffectIds } from "./effectLibrary.mjs";

/**
 * يشغّل تأثيرات المكتبة داخل مشهد Phaser: صورة + صوت.
 *
 * ضمانات:
 *  - تجميلي فقط: لا يلمس HP ولا السرعة ولا الأرقام العشوائية للمحاكاة (يستخدم Math.random).
 *  - أي خطأ هنا يُبتلع ولا يوقف اللعب.
 *  - ميزانية كائنات حسب جودة الجهاز حتى لا يتباطأ الهاتف.
 */

const QUALITY = Object.freeze({
  high: Object.freeze({ maxObjects: 120, particleScale: 1 }),
  medium: Object.freeze({ maxObjects: 64, particleScale: 0.7 }),
  low: Object.freeze({ maxObjects: 28, particleScale: 0.4 })
});

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const TEXTURE_PREFIX = "fx-shape-";
const ADD_BLEND = 1; // Phaser.BlendModes.ADD

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function detectEffectQuality(scene) {
  const os = scene?.sys?.game?.device?.os;
  return os && (os.android || os.iOS || os.iPhone || os.iPad) ? "medium" : "high";
}

export class EffectDirector {
  constructor(scene, { quality = null, getVolume = () => 100, reducedMotion = false, depth = 36 } = {}) {
    this.scene = scene;
    this.quality = QUALITY[quality] ? quality : detectEffectQuality(scene);
    this.limits = QUALITY[this.quality];
    this.getVolume = getVolume;
    this.reducedMotion = Boolean(reducedMotion);
    this.depth = depth;
    this.live = 0;
    this.soundCooldowns = new Map();
    this.lastShakeAt = -Infinity;
    this.auras = new Set();
    this.warned = false;
    this.destroyed = false;
    this.enabled = true;
    this.ensureTextures();
  }

  /** ينشئ ملمس كل شكل جسيم مرة واحدة (أبيض، ليُلوَّن لاحقاً بـ tint). */
  ensureTextures() {
    const scene = this.scene;
    if (!scene?.textures || !scene?.make?.graphics) return;
    for (const [name, commands] of Object.entries(EFFECT_SHAPES)) {
      const key = TEXTURE_PREFIX + name;
      if (scene.textures.exists(key)) continue;
      try {
        const g = scene.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        for (const cmd of commands) {
          if (cmd.t === "circle") g.fillCircle(cmd.x, cmd.y, cmd.r);
          else if (cmd.t === "poly") g.fillPoints(cmd.pts.map(([x, y]) => ({ x, y })), true);
        }
        g.generateTexture(key, 32, 32);
        g.destroy();
      } catch (error) {
        this.#warn("texture", error);
      }
    }
  }

  setQuality(quality) {
    if (!QUALITY[quality]) return;
    this.quality = quality;
    this.limits = QUALITY[quality];
  }

  /**
   * يشغّل تأثيراً واحداً.
   * ctx: { x, y, view?, facing? (1 يمين / -1 يسار), depth? }
   * يعيد true إذا بدأ التشغيل.
   */
  play(effectId, ctx = {}) {
    if (!this.enabled || this.destroyed) return false;
    const effect = typeof effectId === "string" ? getEffect(effectId) : effectId;
    if (!effect || !Number.isFinite(ctx.x) || !Number.isFinite(ctx.y)) return false;
    try {
      this.#playSound(effect);
      for (const layer of effect.layers) {
        if (layer.delay > 0 && this.scene.time?.delayedCall) {
          this.scene.time.delayedCall(layer.delay, () => this.#runLayerSafe(layer, ctx, effect));
        } else {
          this.#runLayerSafe(layer, ctx, effect);
        }
      }
      return true;
    } catch (error) {
      this.#warn(effect.id, error);
      return false;
    }
  }

  /** يشغّل كل التأثيرات المعيّنة التي تطابق نوع الحدث. */
  playAssigned(effectIds, trigger, ctx = {}) {
    const ids = normalizeEffectIds(effectIds);
    let started = 0;
    for (const id of ids) {
      const effect = getEffect(id);
      if (effect && effect.trigger === trigger && this.play(effect, ctx)) started += 1;
    }
    return started;
  }

  /** يبدأ تأثيرات "بشكل مستمر" لكائن. getContext يُعيد null عند زوال الكائن. */
  startAuras(effectIds, getContext) {
    const stops = [];
    for (const id of normalizeEffectIds(effectIds)) {
      const effect = getEffect(id);
      if (effect?.trigger === "aura") stops.push(this.#startAura(effect, getContext));
    }
    return () => stops.forEach((stop) => stop());
  }

  stopAll() {
    for (const stop of [...this.auras]) stop();
  }

  destroy() {
    if (this.destroyed) return;
    this.stopAll();
    this.destroyed = true;
    this.scene = null;
  }

  // ------------------------------------------------------------------ داخلي
  #startAura(effect, getContext) {
    let event = null;
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      this.auras.delete(stop);
      try { event?.remove?.(false); } catch { /* cosmetic */ }
    };
    const interval = Math.max(300, effect.auraIntervalMs || 1000);
    try {
      event = this.scene.time.addEvent({
        delay: interval,
        loop: true,
        startAt: Math.floor(Math.random() * interval),
        callback: () => {
          const ctx = getContext?.();
          if (!ctx || this.destroyed) return stop();
          this.play(effect, ctx);
        }
      });
      this.auras.add(stop);
    } catch (error) {
      this.#warn(effect.id, error);
    }
    return stop;
  }

  #runLayerSafe(layer, ctx, effect) {
    if (this.destroyed || !this.scene) return;
    try {
      this.#runLayer(layer, ctx);
    } catch (error) {
      this.#warn(effect.id, error);
    }
  }

  #runLayer(layer, ctx) {
    switch (layer.type) {
      case "burst": return this.#burst(layer, ctx);
      case "rise": return this.#rise(layer, ctx);
      case "ring": return this.#ring(layer, ctx);
      case "flash": return this.#flash(layer, ctx);
      case "bolt": return this.#bolt(layer, ctx);
      case "tint": return this.#tint(layer, ctx);
      case "shake": return this.#shake(layer);
      case "squash": return this.#squash(layer, ctx);
      case "orbit": return this.#orbit(layer, ctx);
      case "slash": return this.#slash(layer, ctx);
      default: return undefined;
    }
  }

  #reserve(wanted) {
    const free = Math.max(0, this.limits.maxObjects - this.live);
    const granted = Math.min(wanted, free);
    this.live += granted;
    return granted;
  }

  #release(count) {
    this.live = Math.max(0, this.live - count);
  }

  #depth(ctx) {
    return ctx.depth ?? this.depth;
  }

  #makeSprite(shape, x, y, scale, color, additive, depth) {
    const key = TEXTURE_PREFIX + (EFFECT_SHAPES[shape] ? shape : "dot");
    const sprite = this.scene.add.image(x, y, key);
    sprite.setScale(scale).setTint(color).setDepth(depth);
    if (additive) sprite.setBlendMode(ADD_BLEND);
    return sprite;
  }

  #animate(duration, onUpdate, onDone) {
    const state = { t: 0 };
    this.scene.tweens.add({
      targets: state,
      t: 1,
      duration,
      ease: "Linear",
      onUpdate: () => onUpdate(clamp01(state.t)),
      onComplete: onDone
    });
  }

  #burst(layer, ctx) {
    const wanted = Math.max(1, Math.round(layer.count * this.limits.particleScale));
    const count = this.#reserve(wanted);
    if (!count) return;
    const depth = this.#depth(ctx);
    const mirror = ctx.facing === -1;
    const lifeSec = layer.life / 1000;
    const particles = [];
    for (let i = 0; i < count; i += 1) {
      let angle = rand(layer.spread[0], layer.spread[1]) * DEG;
      if (mirror) angle = Math.PI - angle;
      const speed = rand(layer.speed[0], layer.speed[1]);
      const size = rand(layer.size[0], layer.size[1]);
      particles.push({
        sprite: this.#makeSprite(layer.shape, ctx.x, ctx.y, size, pick(layer.colors), layer.additive, depth),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        spin: layer.spin ? rand(-6, 6) : 0
      });
    }
    const grows = layer.shape === "puff";
    this.#animate(layer.life, (t) => {
      const s = t * lifeSec;
      for (const p of particles) {
        if (!p.sprite.active) continue;
        p.sprite.setPosition(ctx.x + p.vx * s, ctx.y + p.vy * s + 0.5 * layer.gravity * s * s);
        p.sprite.setAlpha(1 - t * t);
        p.sprite.setScale(p.size * (grows ? 1 + t * 0.9 : 1 - t * 0.45));
        if (p.spin) p.sprite.rotation = p.spin * s;
      }
    }, () => {
      for (const p of particles) p.sprite.destroy();
      this.#release(count);
    });
  }

  #rise(layer, ctx) {
    const wanted = Math.max(1, Math.round(layer.count * this.limits.particleScale));
    const count = this.#reserve(wanted);
    if (!count) return;
    const depth = this.#depth(ctx);
    const dir = layer.down ? 1 : -1;
    const particles = [];
    for (let i = 0; i < count; i += 1) {
      const size = rand(layer.size[0], layer.size[1]);
      const startX = ctx.x + rand(-layer.spreadX, layer.spreadX);
      const startY = ctx.y + (layer.down ? -34 : rand(-6, 10));
      particles.push({
        sprite: this.#makeSprite(layer.shape, startX, startY, size, pick(layer.colors), layer.additive, depth),
        x0: startX, y0: startY, size,
        speed: rand(layer.speed[0], layer.speed[1]),
        phase: rand(0, TAU)
      });
    }
    const lifeSec = layer.life / 1000;
    this.#animate(layer.life, (t) => {
      const s = t * lifeSec;
      for (const p of particles) {
        if (!p.sprite.active) continue;
        p.sprite.setPosition(p.x0 + Math.sin(p.phase + s * 5) * 6, p.y0 + dir * p.speed * s);
        p.sprite.setAlpha(Math.sin(Math.PI * t) * 0.95);
        p.sprite.setScale(p.size * (1 - t * 0.3));
      }
    }, () => {
      for (const p of particles) p.sprite.destroy();
      this.#release(count);
    });
  }

  #ring(layer, ctx) {
    if (!this.#reserve(1)) return;
    const circle = this.scene.add.circle(ctx.x, ctx.y, layer.radius, 0xffffff, 0)
      .setStrokeStyle(layer.width, layer.color, 1)
      .setDepth(this.#depth(ctx));
    const from = layer.inward ? 1 : 0.2;
    const to = layer.inward ? 0.2 : 1;
    this.#animate(layer.life, (t) => {
      if (!circle.active) return;
      circle.setScale(from + (to - from) * t);
      circle.setAlpha(layer.inward ? t : 1 - t);
    }, () => { circle.destroy(); this.#release(1); });
  }

  #flash(layer, ctx) {
    if (!this.#reserve(1)) return;
    const glow = this.scene.add.circle(ctx.x, ctx.y, layer.radius, layer.color, 0.85)
      .setDepth(this.#depth(ctx))
      .setBlendMode(ADD_BLEND);
    this.#animate(layer.life, (t) => {
      if (!glow.active) return;
      glow.setScale(0.8 + t * 0.9);
      glow.setAlpha(0.85 * (1 - t));
    }, () => { glow.destroy(); this.#release(1); });
  }

  #bolt(layer, ctx) {
    if (!this.#reserve(1)) return;
    const g = this.scene.add.graphics().setDepth(this.#depth(ctx)).setBlendMode(ADD_BLEND);
    const width = layer.width || 3;
    const draw = () => {
      g.clear();
      for (let b = 0; b < layer.count; b += 1) {
        const startX = ctx.x + (layer.fromTop ? rand(-8, 8) : rand(-34, 34));
        const startY = ctx.y - layer.height * (layer.fromTop ? 1 : rand(0.55, 1));
        const endX = ctx.x + rand(-6, 6);
        const endY = ctx.y + 8;
        const segments = layer.fromTop ? 12 : 7;
        const path = [[startX, startY]];
        for (let i = 1; i < segments; i += 1) {
          const k = i / segments;
          path.push([startX + (endX - startX) * k + rand(-14, 14), startY + (endY - startY) * k]);
        }
        path.push([endX, endY]);
        for (const [w, color, alpha] of [[width + 4, layer.color, 0.35], [width, layer.color, 0.9], [Math.max(1, width - 2), 0xffffff, 1]]) {
          g.lineStyle(w, color, alpha);
          g.beginPath();
          g.moveTo(path[0][0], path[0][1]);
          for (let i = 1; i < path.length; i += 1) g.lineTo(path[i][0], path[i][1]);
          g.strokePath();
        }
      }
    };
    draw();
    let redrawn = false;
    this.#animate(layer.life, (t) => {
      if (!g.active) return;
      if (!redrawn && t > 0.4) { redrawn = true; draw(); }
      g.setAlpha(1 - t * t);
    }, () => { g.destroy(); this.#release(1); });
  }

  #tintables(view, depth = 0, out = []) {
    if (!view || depth > 3) return out;
    if (typeof view.setTint === "function") out.push(view);
    if (Array.isArray(view.list)) for (const child of view.list) this.#tintables(child, depth + 1, out);
    return out;
  }

  #tint(layer, ctx) {
    const view = ctx.view;
    if (!view?.active) return;
    const targets = this.#tintables(view);
    if (!targets.length) return;
    const token = (view.__fxTintToken = (view.__fxTintToken || 0) + 1);
    const apply = (on) => {
      for (const obj of targets) {
        if (!obj.active) continue;
        if (!on) { obj.clearTint?.(); continue; }
        if (layer.fill && obj.setTintFill) obj.setTintFill(layer.color); else obj.setTint(layer.color);
      }
    };
    apply(true);
    const slowed = [];
    if (layer.slowAnim) {
      for (const obj of targets) {
        if (obj.anims && Number.isFinite(obj.anims.timeScale)) { slowed.push([obj, obj.anims.timeScale]); obj.anims.timeScale = 0.5; }
      }
    }
    if (layer.flicker && this.scene.time?.addEvent) {
      let on = true;
      const flicker = this.scene.time.addEvent({ delay: 45, loop: true, callback: () => { on = !on; if (view.__fxTintToken === token) apply(on); } });
      this.scene.time.delayedCall(layer.life, () => flicker.remove(false));
    }
    this.scene.time.delayedCall(layer.life, () => {
      for (const [obj, scale] of slowed) if (obj.anims) obj.anims.timeScale = scale;
      if (view.__fxTintToken === token) apply(false);
    });
  }

  #shake(layer) {
    if (this.reducedMotion) return;
    const now = this.scene.time?.now ?? Date.now();
    if (now - this.lastShakeAt < 120) return;
    this.lastShakeAt = now;
    this.scene.cameras?.main?.shake?.(layer.ms, layer.intensity);
  }

  #squash(layer, ctx) {
    const view = ctx.view;
    if (!view?.active || view.getData?.("fxSquashing")) return;
    const sx0 = view.scaleX;
    const sy0 = view.scaleY;
    view.setData?.("fxSquashing", true);
    const done = () => {
      if (view.active) { view.setScale(sx0, sy0); view.setData?.("fxSquashing", false); }
    };
    if (layer.from) {
      view.setScale(sx0 * layer.sx, sy0 * 0.2);
      this.scene.tweens.add({ targets: view, scaleX: sx0, scaleY: sy0, duration: layer.life, ease: "Back.easeOut", onComplete: done });
    } else {
      this.scene.tweens.add({
        targets: view, scaleX: sx0 * layer.sx, scaleY: sy0 * layer.sy,
        duration: Math.max(40, layer.life / 2), yoyo: true, ease: "Quad.easeOut", onComplete: done
      });
    }
  }

  #orbit(layer, ctx) {
    const count = this.#reserve(layer.count);
    if (!count) return;
    const depth = this.#depth(ctx);
    const stars = [];
    for (let i = 0; i < count; i += 1) {
      stars.push({ sprite: this.#makeSprite(layer.shape, ctx.x, ctx.y, 0.55, layer.color, true, depth), base: (i / count) * TAU });
    }
    this.#animate(layer.life, (t) => {
      const fade = t > 0.75 ? (1 - t) / 0.25 : 1;
      for (const s of stars) {
        if (!s.sprite.active) continue;
        const a = s.base + t * TAU * 2.5;
        s.sprite.setPosition(ctx.x + Math.cos(a) * layer.radius, ctx.y - layer.height + Math.sin(a) * layer.radius * 0.35);
        s.sprite.setAlpha(fade);
        s.sprite.rotation = a;
      }
    }, () => {
      for (const s of stars) s.sprite.destroy();
      this.#release(count);
    });
  }

  #slash(layer, ctx) {
    if (!this.#reserve(1)) return;
    const flip = ctx.facing === -1 ? -1 : 1;
    const g = this.scene.add.graphics({ x: ctx.x, y: ctx.y }).setDepth(this.#depth(ctx));
    const radius = layer.size * 0.6;
    g.lineStyle(8, layer.color, 0.45);
    g.beginPath(); g.arc(0, 0, radius, -2.3, -0.5, false); g.strokePath();
    g.lineStyle(4, layer.color, 1);
    g.beginPath(); g.arc(0, 0, radius, -2.2, -0.6, false); g.strokePath();
    g.setRotation(layer.angle * DEG * flip);
    g.setScale(flip, 1);
    this.#animate(layer.life, (t) => {
      if (!g.active) return;
      g.setAlpha(1 - t);
      g.setScale(flip * (0.8 + t * 0.4), 0.8 + t * 0.4);
    }, () => { g.destroy(); this.#release(1); });
  }

  #playSound(effect) {
    const sound = effect.sound;
    const scene = this.scene;
    if (!sound || !scene?.sound || !scene.cache?.audio?.exists?.(sound.key)) return;
    const base = Number(this.getVolume()) || 0;
    if (base <= 0) return;
    const now = scene.time?.now ?? Date.now();
    const last = this.soundCooldowns.get(sound.key) ?? -Infinity;
    if (now - last < (sound.cooldownMs ?? 0)) return;
    this.soundCooldowns.set(sound.key, now);
    try {
      scene.sound.play(sound.key, { volume: clamp01((base / 100) * (sound.volume ?? 1)), rate: rand(0.95, 1.05) });
    } catch (error) {
      this.#warn(sound.key, error);
    }
  }

  #warn(id, error) {
    if (this.warned) return;
    this.warned = true;
    console.warn(`[EffectDirector] cosmetic effect failed (${id}); gameplay is unaffected.`, error);
  }
}

export default EffectDirector;
