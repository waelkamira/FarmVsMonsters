import { VFXRegistry } from "./VFXRegistry.mjs";

const DEFAULT_LIMITS = Object.freeze({ maxActiveBursts: 24, burstLifetimeMs: 360 });

/**
 * Hybrid VFX runtime: authored sprite textures where available, with a
 * procedural Phaser particle fallback. Effects are cosmetic and fail closed.
 */
export class VFXManager {
  constructor(scene, { registry = new VFXRegistry(), limits = {} } = {}) {
    if (!scene) throw new TypeError("VFXManager requires a Phaser scene");
    this.scene = scene;
    this.registry = registry;
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    this.active = new Set();
    this.destroyed = false;
  }

  play(effectId, x, y, overrides = {}) {
    if (this.destroyed || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    const definition = this.registry.get(effectId);
    if (!definition) return null;
    if (this.active.size >= this.limits.maxActiveBursts) return null;

    const config = { ...definition, ...overrides };
    let visual = null;
    const texture = config.texture;
    if (texture && this.scene.textures?.exists(texture)) {
      visual = this.scene.add.image(x, y, texture);
      visual.setScale(config.scale ?? 0.25);
      if (config.tint != null) visual.setTint(config.tint);
      if (config.depth != null) visual.setDepth(config.depth);
      this.scene.tweens.add({
        targets: visual,
        alpha: 0,
        scale: (config.scale ?? 0.25) * (config.endScale ?? 1.45),
        duration: config.durationMs ?? this.limits.burstLifetimeMs,
        ease: "Cubic.easeOut",
        onComplete: () => this.#release(visual)
      });
    } else if (this.scene.add?.container && this.scene.add?.circle) {
      const burst = this.scene.add.container(x, y);
      const count = Math.max(1, Math.min(16, config.count ?? 7));
      const color = config.tint ?? 0xffffff;
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count;
        const radius = config.kind === "trail" ? 2 : 5;
        const dot = this.scene.add.circle(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          config.kind === "trail" ? 2 : 3,
          color,
          0.9
        );
        burst.add(dot);
      }
      burst.setDepth(config.depth ?? 30);
      visual = burst;
      this.scene.tweens.add({
        targets: burst,
        alpha: 0,
        scale: config.endScale ?? 2,
        duration: config.durationMs ?? this.limits.burstLifetimeMs,
        ease: "Cubic.easeOut",
        onComplete: () => this.#release(visual)
      });
    }

    if (visual) this.active.add(visual);
    return visual;
  }

  playProjectileTrail(effectId, x, y, overrides = {}) {
    return this.play(effectId, x, y, { count: 3, durationMs: 180, ...overrides });
  }

  #release(visual) {
    if (!visual || !this.active.has(visual)) return;
    this.active.delete(visual);
    visual.__vfxTimer?.remove?.(false);
    if (visual.active) visual.destroy();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const visual of [...this.active]) this.#release(visual);
    this.active.clear();
  }
}
