import { VFXRegistry } from "./VFXRegistry.mjs";
import { VFXEventBus } from "./core/VFXEventBus.mjs";
import { createVFXConfig } from "./core/VFXConfig.mjs";
import { VFXObjectPool } from "./core/VFXObjectPool.mjs";
import { VFXRenderer } from "./rendering/VFXRenderer.mjs";

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
    this.renderer = new VFXRenderer(scene);
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
      visual = this.pool.acquire(
        poolKey,
        () => this.renderer.createTextureVisual(x, y, texture, config),
        (image) => this.renderer.resetTextureVisual(image, x, y, config)
      );
      if (visual && !this.activePoolKeys.has(visual)) this.activePoolKeys.set(visual, poolKey);
    } else if (this.scene.add?.container && this.scene.add?.circle) {
      const qualityCount = this.config.qualityProfile.maxParticlesPerEffect;
      const count = Math.max(1, Math.min(qualityCount, config.count ?? 7));
      const kind = config.kind === "trail" ? "trail" : "burst";
      poolKey = `container:${kind}:${count}`;
      visual = this.pool.acquire(
        poolKey,
        () => this.renderer.createProceduralVisual(x, y, config, count, kind),
        (burst) => this.renderer.resetProceduralVisual(burst, x, y, config)
      );

      if (visual) this.activePoolKeys.set(visual, poolKey);
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
        reset: (pooledVisual) => this.renderer.deactivate(pooledVisual)
      });
    } else {
      try {
        this.renderer.destroyVisual(visual);
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
    this.renderer.destroy();
    this.destroyed = true;
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    if (this.ownsEventBus) this.eventBus.destroy();
    this.eventBus = null;
    this.scene = null;
  }
}

export default VFXManager;
