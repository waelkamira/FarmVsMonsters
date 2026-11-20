import { VFX_QUALITY } from "./VFXPresets.mjs";

export class VFXPerformance {
  constructor(options = {}) {
    this.quality = options.quality || "auto";
    this.current = options.initialQuality || "high";
    this.samples = [];
    this.sampleLimit = options.sampleLimit || 45;
    this.cooldownFrames = 0;
  }

  get profile() { return VFX_QUALITY[this.current] || VFX_QUALITY.high; }

  sample(deltaMs) {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return this.current;
    if (this.quality !== "auto") {
      this.current = VFX_QUALITY[this.quality] ? this.quality : "high";
      return this.current;
    }
    this.samples.push(Math.min(deltaMs, 250));
    if (this.samples.length > this.sampleLimit) this.samples.shift();
    if (this.cooldownFrames > 0) { this.cooldownFrames -= 1; return this.current; }
    if (this.samples.length < Math.min(15, this.sampleLimit)) return this.current;
    const average = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
    const next = average > 25 ? "performance" : average > 18 ? "high" : "ultra";
    if (next !== this.current) {
      this.current = next;
      this.cooldownFrames = 90;
      this.samples.length = 0;
    }
    return this.current;
  }
}
