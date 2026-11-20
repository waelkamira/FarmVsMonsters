import { VFXRegistry } from "./VFXRegistry.mjs";
import { VFXPerformance } from "./VFXPerformance.mjs";

export class VFXManager {
  constructor(scene, options = {}) {
    if (!scene?.add || !scene?.tweens) throw new TypeError("VFXManager requires a Phaser Scene");
    this.scene = scene;
    this.performance = new VFXPerformance(options);
    this.registry = options.registry || new VFXRegistry();
    this.active = new Set();
    this.destroyed = false;
    this.onUpdate = (_time, delta) => this.performance.sample(delta);
    scene.events?.on?.("update", this.onUpdate);
    scene.events?.once?.("shutdown", () => this.destroy());
  }

  play(name, position = {}, options = {}) {
    if (this.destroyed || this.active.size >= this.performance.profile.maxConcurrentEffects) return null;
    const preset = this.registry.get(name);
    if (!preset) return null;
    const x = Number(position.x), y = Number(position.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const profile = this.performance.profile;
    const scale = Math.max(0.1, Math.min(3, Number(options.scale) || 1));
    const intensity = Math.max(0.2, Math.min(2, Number(options.intensity) || 1));
    const root = this.scene.add.container(x, y).setDepth(Number.isFinite(options.depth) ? options.depth : 26);
    this.active.add(root);
    root.once?.("destroy", () => this.active.delete(root));
    const color = options.color ?? preset.color;
    const radius = preset.radius * scale * intensity;
    const duration = Math.max(90, preset.duration / Math.max(0.65, intensity));
    const ring = this.scene.add.circle(0, 0, radius * 0.45, color, 0.22).setStrokeStyle(Math.max(1, 2 * scale), color, 0.95);
    const flash = this.scene.add.circle(0, 0, radius * 0.2, 0xffffff, 0.9);
    root.add([ring, flash]);

    if (profile.glow && this.scene.add.particles && this.scene.textures?.exists?.("__WHITE") && profile.maxParticlesPerEffect > 0) {
      const count = Math.min(profile.maxParticlesPerEffect, Math.ceil(preset.sparks * profile.particleScale));
      const particles = this.scene.add.particles(x, y, "__WHITE", {
        emitting: false,
        lifespan: duration * 0.72,
        speed: { min: 22 * scale, max: 95 * scale },
        angle: { min: 0, max: 360 },
        scale: { start: 0.7 * scale, end: 0 },
        alpha: { start: 0.85, end: 0 },
        tint: preset.particleColor,
        quantity: count
      });
      particles.setDepth(root.depth + 0.1);
      particles.explode(count, 0, 0);
      this.scene.time?.delayedCall?.(duration + 80, () => { if (particles.active) particles.destroy(); });
    }

    // Authored effect sheets can be plugged in by key without changing the
    // procedural fallback or forcing every device to load every VFX asset.
    if (options.spriteKey && this.scene.textures?.exists?.(options.spriteKey)) {
      const sprite = this.scene.add.sprite(0, 0, options.spriteKey, options.frame ?? 0);
      sprite.setScale(scale);
      if (options.animationKey && this.scene.anims?.exists?.(options.animationKey)) {
        sprite.play(options.animationKey);
        sprite.once("animationcomplete", () => { if (sprite.active) sprite.destroy(); });
      }
      root.add(sprite);
    }

    if (preset.kind === "electric") {
      const points = [];
      const segments = profile.distortion ? 9 : 5;
      for (let index = 0; index <= segments; index += 1) {
        const px = (index / segments - 0.5) * radius * 2.1;
        const py = (index === 0 || index === segments) ? 0 : (index % 2 ? -1 : 1) * radius * 0.35;
        points.push({ x: px, y: py });
      }
      const bolt = this.scene.add.graphics();
      bolt.lineStyle(Math.max(1.5, 3 * scale), color, 0.95);
      bolt.beginPath(); bolt.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach(point => bolt.lineTo(point.x, point.y));
      bolt.strokePath(); root.add(bolt);
    }

    if (profile.glow && options.target?.postFX?.addGlow) {
      try { options.target.postFX.addGlow(color, 2, 0, false, 0.08, 8); } catch { /* Post-FX varies by renderer/device. */ }
    }

    this.scene.tweens.add({
      targets: root, scale: profile.distortion ? 1.9 : 1.55, alpha: 0,
      duration, ease: "Cubic.easeOut",
      onComplete: () => { if (root.active) root.destroy(); }
    });
    return root;
  }

  getQuality() { return this.performance.current; }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events?.off?.("update", this.onUpdate);
    for (const effect of this.active) if (effect?.active) effect.destroy();
    this.active.clear();
  }
}
