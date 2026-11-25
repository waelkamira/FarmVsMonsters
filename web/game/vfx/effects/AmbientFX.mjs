import { detectEffectQuality, ensureEffectTextures } from "./EffectDirector.mjs";

/**
 * بيئة وطقس ديناميكيان: ذرات ضوء، أوراق متطايرة، غبار أقدام، وأجواء حسب المرحلة
 * (نهار ← غروب ← ليل عاصف مع مطر وبرق) وتصعيد في الموجة الأخيرة.
 *
 * - تجميلي 100%: لا يلمس المحاكاة ولا يستخدم عشوائيتها (Math.random فقط).
 * - طبقة العرض 34: فوق الكائنات وتحت تأثيرات القتال (36) والواجهة (42+).
 * - ميزانية كائنات مستقلة حسب جودة الجهاز، وتقليل الحركة يعطّل المطر والبرق والأوراق والغبار.
 * - أي خطأ يُبتلع ولا يوقف اللعب.
 */

const AMBIENT_DEPTH = 34;
const MULTIPLY_BLEND = 2; // Phaser.BlendModes.MULTIPLY
const ADD_BLEND = 1;
const TAU = Math.PI * 2;
const FOOTSTEP_INTERVAL_MS = 650;

// السقف الكلي لكل جودة = مجموع الأجزاء (يبقى تحت سقف التأثيرات 120 / 64 / 28)
const LIMITS = Object.freeze({
  high: Object.freeze({ motes: 18, leaves: 8, rain: 60, dust: 16 }),
  medium: Object.freeze({ motes: 10, leaves: 5, rain: 34, dust: 10 }),
  low: Object.freeze({ motes: 4, leaves: 2, rain: 16, dust: 4 })
});

const PRESETS = Object.freeze({
  day: Object.freeze({
    id: "day", filter: { color: 0xffe2a8, alpha: 0.07, blend: 0 },
    motes: 0xffe08a, leaves: [0x7bd35a, 0x55b84a, 0xa6e57a], rain: false, lightning: false
  }),
  sunset: Object.freeze({
    id: "sunset", filter: { color: 0xffb27a, alpha: 1, blend: MULTIPLY_BLEND },
    motes: 0xffb347, leaves: [0xff8a3d, 0xd9482b, 0xe8b04a], rain: false, lightning: false
  }),
  night: Object.freeze({
    id: "night", filter: { color: 0x5a6fa8, alpha: 1, blend: MULTIPLY_BLEND },
    motes: 0x9fb8ff, leaves: [], rain: true, lightning: true
  })
});

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** 1-2 نهار، 3-4 غروب، 5+ ليل عاصف. */
export function atmosphereForStage(stageNumber) {
  const n = Number(stageNumber) || 1;
  if (n <= 2) return "day";
  if (n <= 4) return "sunset";
  return "night";
}

export class AmbientFX {
  constructor(scene, { quality = null, reducedMotion = false, depth = AMBIENT_DEPTH, width = null, height = null } = {}) {
    this.scene = scene;
    this.quality = LIMITS[quality] ? quality : detectEffectQuality(scene);
    this.limits = LIMITS[this.quality];
    this.reducedMotion = Boolean(reducedMotion);
    this.depth = depth;
    this.width = width ?? scene?.scale?.width ?? 1120;
    this.height = height ?? scene?.scale?.height ?? 680;
    this.preset = null;
    this.escalated = false;
    this.motes = [];
    this.leaves = [];
    this.drops = [];
    this.dust = new Set();
    this.dustTimers = new WeakMap();
    this.filter = null;
    this.stormShade = null;
    this.timers = [];
    this.breezeTimer = null;
    this.lightningTimer = null;
    this.warned = false;
    this.destroyed = false;
    this.onUpdate = (_time, delta) => this.#update(Number(delta) || 16);
    scene?.events?.on?.("update", this.onUpdate);
    ensureEffectTextures(scene, (id, error) => this.#warn(id, error));
  }

  // ------------------------------------------------------------ واجهة عامة
  /** يطبّق أجواء المرحلة (يستبدل أي أجواء سابقة). */
  applyStageAtmosphere(stageNumber) {
    return this.#guard("applyStageAtmosphere", () => {
      const preset = PRESETS[atmosphereForStage(stageNumber)];
      this.#clearAtmosphere();
      this.preset = preset;
      this.#setFilter(preset.filter);
      this.startSunMotes(preset.motes);
      if (preset.leaves.length) this.startBreeze(preset.leaves);
      if (preset.rain && !this.reducedMotion) this.#fillRain(Math.round(this.limits.rain * 0.6));
      if (preset.lightning) this.#scheduleLightning();
      return preset.id;
    });
  }

  /** نقاط ضوء سابحة بنعومة لإعطاء عمق بصري. */
  startSunMotes(color = 0xffe08a) {
    return this.#guard("startSunMotes", () => {
      for (const m of this.motes) m.sprite.destroy();
      this.motes = [];
      const count = this.reducedMotion ? Math.min(3, this.limits.motes) : this.limits.motes;
      for (let i = 0; i < count; i += 1) {
        const sprite = this.scene.add.image(rand(0, this.width), rand(40, this.height - 60), "fx-shape-dot")
          .setDepth(this.depth).setTint(color).setBlendMode(ADD_BLEND)
          .setScale(rand(0.12, 0.3)).setAlpha(rand(0.15, 0.45));
        this.motes.push({ sprite, baseX: sprite.x, baseY: sprite.y, phase: rand(0, TAU), speed: rand(0.25, 0.6), drift: rand(8, 22), pulse: rand(0.6, 1.4) });
      }
      return count;
    });
  }

  /** أوراق تعبر الشاشة من اليمين لليسار بحركة موجية ودوران. */
  startBreeze(palette = [0x7bd35a]) {
    return this.#guard("startBreeze", () => {
      this.#stopBreeze();
      if (this.reducedMotion || !palette.length) return false;
      this.breezePalette = palette;
      this.breezeTimer = this.scene.time.addEvent({
        delay: 1700,
        loop: true,
        callback: () => this.#spawnLeaf()
      });
      this.#spawnLeaf();
      return true;
    });
  }

  /** نفثة غبار خلف وحش يمشي، كل 650ms كحد أدنى. تُستدعى كل إطار؛ المؤقت داخلي. */
  spawnFootstepDust(monster, x, y, deltaMs = 16) {
    if (this.destroyed || this.reducedMotion || !monster || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    const elapsed = (this.dustTimers.get(monster) ?? FOOTSTEP_INTERVAL_MS * Math.random()) + deltaMs;
    if (elapsed < FOOTSTEP_INTERVAL_MS) {
      this.dustTimers.set(monster, elapsed);
      return false;
    }
    this.dustTimers.set(monster, 0);
    if (this.dust.size >= this.limits.dust) return false;
    return this.#guard("spawnFootstepDust", () => {
      const puff = this.scene.add.image(x + rand(10, 22), y - rand(0, 4), "fx-shape-puff")
        .setDepth(this.depth).setTint(0xcdb89a).setScale(rand(0.14, 0.2)).setAlpha(0.55);
      this.dust.add(puff);
      const finish = () => { this.dust.delete(puff); if (puff.active) puff.destroy(); };
      this.scene.tweens.add({
        targets: puff, x: puff.x + rand(10, 26), y: puff.y - rand(10, 20),
        scaleX: puff.scaleX * 2.2, scaleY: puff.scaleY * 2.2, alpha: 0,
        duration: rand(420, 560), ease: "Quad.easeOut", onComplete: finish
      });
      return true;
    });
  }

  /** تصعيد الموجة الأخيرة: مطر أكثف وبرق أسرع وظلام خفيف (في أي مرحلة). */
  escalateFinalWave() {
    return this.#guard("escalateFinalWave", () => {
      if (this.escalated || !this.preset) return false;
      this.escalated = true;
      if (!this.reducedMotion) {
        this.#fillRain(this.preset.rain ? this.limits.rain : Math.round(this.limits.rain * 0.6));
        this.#scheduleLightning();
      }
      if (!this.stormShade) {
        this.stormShade = this.scene.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x0b1020, 0)
          .setDepth(this.depth + 0.1);
        this.scene.tweens.add({ targets: this.stormShade, alpha: 0.14, duration: 1800 });
      }
      return true;
    });
  }

  get activeCount() {
    return this.motes.length + this.leaves.length + this.drops.length + this.dust.size;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    try { this.scene?.events?.off?.("update", this.onUpdate); } catch { /* cosmetic */ }
    this.#clearAtmosphere();
    for (const puff of this.dust) if (puff.active) puff.destroy();
    this.dust.clear();
    this.scene = null;
  }

  // -------------------------------------------------------------- داخلي
  #setFilter({ color, alpha, blend }) {
    if (this.filter?.active) this.filter.destroy();
    this.filter = this.scene.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, color, alpha)
      .setDepth(this.depth - 0.2);
    if (blend) this.filter.setBlendMode(blend);
  }

  #spawnLeaf() {
    if (this.destroyed || this.leaves.length >= this.limits.leaves || !this.breezePalette) return;
    this.#guard("leaf", () => {
      const sprite = this.scene.add.image(this.width + 24, rand(40, this.height - 140), "fx-shape-leaf")
        .setDepth(this.depth).setTint(pick(this.breezePalette)).setScale(rand(0.35, 0.6)).setAlpha(0.9);
      this.leaves.push({ sprite, speed: rand(60, 120), baseY: sprite.y, phase: rand(0, TAU), amp: rand(14, 30), spin: rand(-2.2, 2.2) });
    });
  }

  #fillRain(target) {
    const want = Math.min(target, this.limits.rain);
    while (this.drops.length < want) {
      const sprite = this.scene.add.image(rand(0, this.width + 160), rand(-40, this.height), "fx-ambient-rain")
        .setDepth(this.depth).setTint(0xbfd4ff).setAlpha(rand(0.28, 0.55)).setRotation(0.22);
      this.drops.push({ sprite, vx: -rand(120, 170), vy: rand(560, 720) });
    }
  }

  #scheduleLightning() {
    if (this.reducedMotion || !this.scene?.time) return;
    this.lightningTimer?.remove?.(false);
    const [min, max] = this.escalated ? [2500, 5500] : [5000, 10000];
    this.lightningTimer = this.scene.time.delayedCall(rand(min, max), () => {
      if (this.destroyed) return;
      this.#guard("lightning", () => {
        this.scene.cameras?.main?.flash?.(140, 205, 220, 255);
        if (Math.random() < 0.4) this.scene.time.delayedCall(180, () => this.scene?.cameras?.main?.flash?.(90, 205, 220, 255));
      });
      if (this.preset?.lightning || this.escalated) this.#scheduleLightning();
    });
  }

  #stopBreeze() {
    this.breezeTimer?.remove?.(false);
    this.breezeTimer = null;
  }

  #clearAtmosphere() {
    this.#stopBreeze();
    this.lightningTimer?.remove?.(false);
    this.lightningTimer = null;
    for (const list of [this.motes, this.leaves, this.drops]) {
      for (const item of list) if (item.sprite?.active) item.sprite.destroy();
      list.length = 0;
    }
    if (this.filter?.active) this.filter.destroy();
    if (this.stormShade?.active) this.stormShade.destroy();
    this.filter = null;
    this.stormShade = null;
    this.escalated = false;
  }

  #update(delta) {
    if (this.destroyed) return;
    const dt = Math.min(delta, 50) / 1000;
    const time = (this.scene?.time?.now ?? Date.now()) / 1000;
    for (const m of this.motes) {
      if (!m.sprite.active) continue;
      m.sprite.setPosition(
        m.baseX + Math.sin(time * m.speed + m.phase) * m.drift,
        m.baseY + Math.cos(time * m.speed * 0.8 + m.phase) * m.drift * 0.6
      );
      m.sprite.setAlpha(0.2 + 0.25 * (0.5 + 0.5 * Math.sin(time * m.pulse + m.phase)));
    }
    for (let i = this.leaves.length - 1; i >= 0; i -= 1) {
      const leaf = this.leaves[i];
      if (!leaf.sprite.active) { this.leaves.splice(i, 1); continue; }
      leaf.phase += dt * 2.2;
      leaf.sprite.x -= leaf.speed * dt;
      leaf.sprite.y = leaf.baseY + Math.sin(leaf.phase) * leaf.amp;
      leaf.sprite.rotation += leaf.spin * dt;
      if (leaf.sprite.x < -30) { leaf.sprite.destroy(); this.leaves.splice(i, 1); }
    }
    for (const d of this.drops) {
      if (!d.sprite.active) continue;
      d.sprite.x += d.vx * dt;
      d.sprite.y += d.vy * dt;
      if (d.sprite.y > this.height + 20 || d.sprite.x < -20) d.sprite.setPosition(rand(0, this.width + 160), rand(-60, -10));
    }
  }

  #guard(id, fn) {
    if (this.destroyed || !this.scene) return false;
    try {
      return fn();
    } catch (error) {
      this.#warn(id, error);
      return false;
    }
  }

  #warn(id, error) {
    if (this.warned) return;
    this.warned = true;
    console.warn(`[AmbientFX] cosmetic effect failed (${id}); gameplay is unaffected.`, error);
  }
}

export default AmbientFX;
