const QUALITY_ORDER = Object.freeze(["low", "medium", "high"]);

const DEFAULTS = Object.freeze({
  slowFrameMs: 24,
  stableFrameMs: 17,
  downgradeAfterMs: 1800,
  upgradeAfterMs: 8000,
  smoothing: 0.1
});

/**
 * Adjusts cosmetic effect budgets from sustained frame-time measurements.
 * It never changes the renderer resolution, simulation speed, or gameplay.
 */
export class AdaptiveVFXQuality {
  constructor(scene, { quality = "high", onChange = () => {}, ...options } = {}) {
    if (!scene?.events?.on) throw new TypeError("AdaptiveVFXQuality requires a Phaser scene event emitter");
    this.scene = scene;
    this.quality = QUALITY_ORDER.includes(quality) ? quality : "medium";
    this.onChange = typeof onChange === "function" ? onChange : () => {};
    this.options = { ...DEFAULTS, ...options };
    this.averageFrameMs = 16.67;
    this.slowDurationMs = 0;
    this.stableDurationMs = 0;
    this.destroyed = false;
    this.onUpdate = (_time, delta) => this.update(delta);
    this.onShutdown = () => this.destroy();
    scene.events.on("update", this.onUpdate);
    scene.events.once?.("shutdown", this.onShutdown);
  }

  update(deltaMs) {
    if (this.destroyed || !Number.isFinite(deltaMs) || deltaMs <= 0) return null;
    // Ignore background-tab/resume spikes; they are not representative of GPU load.
    if (deltaMs > 100) {
      this.slowDurationMs = 0;
      this.stableDurationMs = 0;
      return null;
    }

    const sample = Math.min(deltaMs, 50);
    const smoothing = Math.min(1, Math.max(0.01, this.options.smoothing));
    this.averageFrameMs += (sample - this.averageFrameMs) * smoothing;

    if (this.averageFrameMs >= this.options.slowFrameMs) {
      this.slowDurationMs += sample;
      this.stableDurationMs = 0;
    } else if (this.averageFrameMs <= this.options.stableFrameMs) {
      this.stableDurationMs += sample;
      this.slowDurationMs = 0;
    } else {
      this.slowDurationMs = 0;
      this.stableDurationMs = 0;
    }

    const currentIndex = QUALITY_ORDER.indexOf(this.quality);
    let nextIndex = currentIndex;
    if (this.slowDurationMs >= this.options.downgradeAfterMs && currentIndex > 0) {
      nextIndex -= 1;
    } else if (this.stableDurationMs >= this.options.upgradeAfterMs && currentIndex < QUALITY_ORDER.length - 1) {
      nextIndex += 1;
    }
    if (nextIndex === currentIndex) return null;

    this.quality = QUALITY_ORDER[nextIndex];
    this.slowDurationMs = 0;
    this.stableDurationMs = 0;
    try {
      this.onChange(this.quality);
    } catch {
      // A cosmetic quality callback must never interrupt the battle.
    }
    return this.quality;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene?.events?.off?.("update", this.onUpdate);
    this.scene?.events?.off?.("shutdown", this.onShutdown);
    this.scene = null;
    this.onChange = () => {};
  }
}

export default AdaptiveVFXQuality;
