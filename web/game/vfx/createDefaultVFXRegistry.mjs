import { VFXRegistry } from "./VFXRegistry.mjs";
import { PLANT_VFX_PROFILES } from "./PlantVFXProfiles.mjs";
import { PROJECTILE_VFX_PROFILES } from "./ProjectileVFXProfiles.mjs";

const PALETTES = Object.freeze({
  radish: 0x9bdc72,
  mushroom: 0xf3bd73,
  pumpkin: 0xffa45d,
  pineapple: 0xffc45c,
  hazelnut: 0xb9824b,
  mango: 0xffd45b,
  "snow-thrower": 0xbcecff,
  "electric-mushroom": 0x65d9ff
});

export function createDefaultVFXRegistry() {
  const registry = new VFXRegistry();

  for (const [plantType, profile] of Object.entries(PLANT_VFX_PROFILES)) {
    const palette = PALETTES[plantType] ?? 0xffffff;
    for (const [event, effectId] of Object.entries(profile)) {
      if (!effectId || registry.has(effectId)) continue;
      const projectile = PROJECTILE_VFX_PROFILES[plantType];
      registry.register(effectId, {
        kind: event,
        texture: event === "projectile" ? projectile?.texture : null,
        tint: projectile?.tint ?? palette,
        scale: projectile?.scale ?? 0.22,
        count: event === "impact" ? 10 : 5,
        durationMs: event === "trail" ? 180 : event === "charge" ? 260 : 360,
        depth: 32
      });
    }
  }

  return registry;
}
