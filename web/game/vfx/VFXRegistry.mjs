const freezeProfile = (profile) => Object.freeze({ ...profile });

export class VFXRegistry {
  constructor() {
    this.effects = new Map();
  }

  register(id, definition) {
    if (!id || typeof id !== "string") throw new TypeError("VFX id must be a non-empty string");
    if (!definition || typeof definition !== "object") throw new TypeError("VFX definition must be an object");
    if (this.effects.has(id)) throw new Error(`VFX effect already registered: ${id}`);
    this.effects.set(id, freezeProfile(definition));
    return this;
  }

  get(id) {
    return this.effects.get(id) || null;
  }

  has(id) {
    return this.effects.has(id);
  }

  ids() {
    return [...this.effects.keys()];
  }
}
