import { VFXRegistry } from "./VFXRegistry.mjs";
import { VFXEventBus } from "./core/VFXEventBus.mjs";
import { createVFXConfig } from "./core/VFXConfig.mjs";
import { VFXObjectPool } from "./core/VFXObjectPool.mjs";

const DEFAULT_LIMITS = Object.freeze({ maxActiveBursts: 24, burstLifetimeMs: 360 });

/**
 * Hybrid VFX runtime. Keeps the legacy play() API while accepting centralized
 * event-bus requests. All effects are cosmetic and fail closed.
 */
export class VFXManager {
  constructor(scene, {
    registry = new VFXRegistry(),
    limits = {},
    config = {},
    eventBus = null,
    poolLimits = {}
  } = {}) {
    if (!scene) throw new TypeError("VFXManager requires a Phaser scene");
    this.scene = scene;
    this.registry = registry;
    this.config = createVFXConfig({
      ...config,
      limits: { ...DEFAULT_LIMITS, ...(config.limits || {}), ...limits }
    });
    this.limits = this.config.limits;
    this.eventBus = eventBus || new VFXEventBus();
    this.ownsEventBus = !eventBus;
    this.active = new Set();
    this.activeTweens = new Map();
    this.pool = new VFXObjectPool({ maxPerKey: 8, maxTotal: 24, ...poolLimits });
    this.activePoolKeys = new Map();
    this.destroyed = false;
    this.unsubscribers = [
      this.eventBus.on("vfx:play", (request) => {
        if (!request || typeof request !== "object") return;
        this.play(request.effectId, request.x, request.y, request.overrides || {});
      }),
      this.eventBus.on("vfx:stop-all", () => this.stopAll())
    ];
  }

  play(effectId, x, y, overrides = {}) {
    if (this.destroyed || !this.config.enabled || !Number.isFinite(x) || !Number.isFinite(y)) return null;
    const definition = this.registry.get(effectId);
    if (!definition) {
      this.eventBus.emit("vfx:rejected", { effectId, reason: "unknown-effect" });
      return null;
    }
    if (this.active.size >= this.limits.maxActiveBursts) {
      this.eventBus.emit("vfx:rejected", { effectId, reason: "active-limit" });
      return null;
    }

    const config = { ...definition, ...overrides };
    const texture = config.texture;
    let visual = null;

    let poolKey = null;
    if (texture && this.scene.textures?.exists(texture)) {
      poolKey = `image:${texture}`;
      visual = this.pool.acquire(poolKey, () => this.scene.add.image(x, y, texture), (image) => {
        image.setPosition?.(x, y);
        image.setActive?.(true);
        image.setVisible?.(true);
        image.setAlpha?.(1);
        image.setScale?.(config.scale ?? 0.25);
        image.clearTint?.();
        if (config.tint != null) image.setTint?.(config.tint);
        if (config.depth != null) image.setDepth?.(config.depth);
      });
      if (visual) {
        visual.setPosition?.(x, y);
        visual.setActive?.(true);
        visual.setVisible?.(true);
        visual.setAlpha?.(1);
        visual.setScale?.(config.scale ?? 0.25);
        visual.clearTint?.();
        if (config.tint != null) visual.setTint?.(config.tint);
        if (config.depth != null) visual.setDepth?.(config.depth);
        if (!this.activePoolKeys.has(visual)) this.activePoolKeys.set(visual, poolKey);
      }
    } else if (this.scene.add?.container && this.scene.add?.circle) {
      const qualityCount = this.config.qualityProfile.maxParticlesPerEffect;
      const count = Math.max(1, Math.min(qualityCount, config.count ?? 7));
      const kind = config.kind === "trail" ? "trail" : "burst";
      poolKey = `container:${kind}:${count}`;
      const color = config.tint ?? 0xffffff;
      visual = this.pool.acquire(poolKey, () => {
        const burst = this.scene.add.container(x, y);
        for (let index = 0; index < count; index += 1) {
          const angle = (Math.PI * 2 * index) / count;
          const radius = kind === "trail" ? 2 : 5;
          const dot = this.scene.add.circle(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            kind === "trail" ? 2 : 3,
            color,
            0.9
          );
          burst.add(dot);
        }
        return burst;
      }, (burst) => this.#resetProceduralBurst(burst, x, y, color, config.depth ?? 30));

      if (visual) {
        this.#resetProceduralBurst(visual, x, y, color, config.depth ?? 30);
        this.activePoolKeys.set(visual, poolKey);
      }
    }

    if (!visual) {
      this.eventBus.emit("vfx:rejected", { effectId, reason: "renderer-unavailable" });
      return null;
    }

    this.active.add(visual);
    const duration = config.durationMs ?? this.limits.burstLifetimeMs;
    this.eventBus.emit("vfx:started", { effectId, visual, x, y, duration });
    if (!this.active.has(visual)) return null;

    try {
      const tween = this.scene.tweens.add({
        targets: visual,
        alpha: 0,
        scale: (config.scale ?? 1) * (config.endScale ?? (texture ? 1.45 : 2)),
        duration,
        ease: "Cubic.easeOut",
        onComplete: () => this.#release(visual, effectId, { stopTween: false })
      });
      if (this.active.has(visual) && tween) this.activeTweens.set(visual, tween);
    } catch (error) {
      this.#release(visual, effectId);
      this.eventBus.emit("vfx:rejected", { effectId, reason: "tween-unavailable", error });
      return null;
    }

    return visual;
  }

  #resetProceduralBurst(burst, x, y, color, depth) {
    burst.setPosition?.(x, y);
    burst.setActive?.(true);
    burst.setVisible?.(true);
    burst.setAlpha?.(1);
    burst.setScale?.(1);
    burst.setDepth?.(depth);
    for (const dot of burst.list || []) {
      dot.setActive?.(true);
      dot.setVisible?.(true);
      dot.setAlpha?.(0.9);
      dot.setScale?.(1);
      dot.setFillStyle?.(color, 0.9);
    }
  }

  playProjectileTrail(effectId, x, y, overrides = {}) {
    return this.play(effectId, x, y, { count: 3, durationMs: 180, ...overrides });
  }

  dispatch(request) {
    if (!request || typeof request !== "object") return 0;
    return this.eventBus.emit("vfx:play", request);
  }

  stopAll() {
    for (const visual of [...this.active]) this.#release(visual, null);
  }

  #release(visual, effectId, { stopTween = true } = {}) {
    if (!visual || !this.active.has(visual)) return;
    this.active.delete(visual);

    const tween = this.activeTweens.get(visual);
    this.activeTweens.delete(visual);
    if (stopTween && tween) {
      try {
        tween.stop?.();
      } catch {
        // A failed cosmetic tween stop must not block visual cleanup.
      }
    }

    const poolKey = this.activePoolKeys.get(visual);
    this.activePoolKeys.delete(visual);
    if (poolKey) {
      this.pool.release(poolKey, visual, {
        reset: (pooledVisual) => {
          pooledVisual.setAlpha?.(1);
          pooledVisual.setScale?.(1);
          pooledVisual.setVisible?.(false);
          pooledVisual.setActive?.(false);
          if (typeof pooledVisual.clearTint === "function") pooledVisual.clearTint();
          for (const child of pooledVisual.list || []) {
            child.setAlpha?.(1);
            child.setScale?.(1);
            child.setVisible?.(false);
            child.setActive?.(false);
          }
        }
      });
    } else {
      try {
        if (visual.active) visual.destroy();
      } catch {
        // A failed display-object destroy must not interrupt other VFX cleanup.
      }
    }
    this.eventBus.emit("vfx:completed", { effectId, visual });
  }

  destroy() {
    if (this.destroyed) return;
    this.stopAll();
    this.pool.destroy();
    this.destroyed = true;
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    if (this.ownsEventBus) this.eventBus.destroy();
    this.eventBus = null;
    this.scene = null;
  }
}

export default VFXManager;
