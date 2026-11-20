import { VFX_PRESETS } from "./VFXPresets.mjs";

export class VFXRegistry {
  constructor(entries = VFX_PRESETS) {
    this.presets = new Map(Object.entries(entries));
  }

  get(name) { return this.presets.get(name) || null; }

  has(name) { return this.presets.has(name); }

  register(name, preset) {
    if (typeof name !== "string" || !name.trim() || !preset || typeof preset !== "object") {
      throw new TypeError("A VFX preset requires a non-empty name and configuration");
    }
    if (!Number.isFinite(preset.radius) || preset.radius <= 0 || !Number.isFinite(preset.duration) || preset.duration <= 0) {
      throw new TypeError("A VFX preset requires positive radius and duration values");
    }
    this.presets.set(name, Object.freeze({ ...preset }));
    return this;
  }
}
