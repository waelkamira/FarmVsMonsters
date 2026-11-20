import { VFXRegistry } from "./VFXRegistry.mjs";
import { VFXEventBus } from "./core/VFXEventBus.mjs";
import { createVFXConfig } from "./core/VFXConfig.mjs";

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
    eventBus = null
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

    if (texture && this.scene.textures?.exists(texture)) {
      visual = this.scene.add.image(x, y, texture);
      visual.setScale(config.scale ?? 0.25);
      if (config.tint != null) visual.setTint(config.tint);
      if (config.depth != null) visual.setDepth(config.depth);
    } else if (this.scene.add?.container && this.scene.add?.circle) {
      const burst = this.scene.add.container(x, y);
      const qualityCount = this.config.qualityProfile.maxParticlesPerEffect;
      const count = Math.max(1, Math.min(qualityCount, config.count ?? 7));
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
    }

    if (!visual) {
      this.eventBus.emit("vfx:rejected", { effectId, reason: "renderer-unavailable" });
      return null;
    }

    this.active.add(visual);
    const duration = config.durationMs ?? this.limits.burstLifetimeMs;
    this.eventBus.emit("vfx:started", { effectId, visual, x, y, duration });

    this.scene.tweens.add({
      targets: visual,
      alpha: 0,
      scale: (config.scale ?? 1) * (config.endScale ?? (texture ? 1.45 : 2)),
      duration,
      ease: "Cubic.easeOut",
      onComplete: () => this.#release(visual, effectId)
    });

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

  #release(visual, effectId) {
    if (!visual || !this.active.has(visual)) return;
    this.active.delete(visual);
    visual.__vfxTimer?.remove?.(false);
    if (visual.active) visual.destroy();
    this.eventBus.emit("vfx:completed", { effectId, visual });
  }

  destroy() {
    if (this.destroyed) return;
    this.stopAll();
    this.destroyed = true;
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    if (this.ownsEventBus) this.eventBus.destroy();
    this.eventBus = null;
    this.scene = null;
  }
}

export default VFXManager;
