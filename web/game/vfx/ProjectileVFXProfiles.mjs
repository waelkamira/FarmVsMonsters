// Texture keys are optional. When absent, VFXManager renders a lightweight
// procedural particle burst instead of failing the projectile/combat flow.
export const PROJECTILE_VFX_PROFILES = Object.freeze({
  radish: Object.freeze({ texture: "radish-level-1-bomb", scale: 0.34, trail: "radish-trail", impact: "radish-impact", tint: 0x9bdc72 }),
  pineapple: Object.freeze({ texture: "pineapple-level-1-bomb", scale: 0.34, trail: "pineapple-trail", impact: "pineapple-impact", tint: 0xffc45c }),
  hazelnut: Object.freeze({ texture: "hazelnut-level-1-bomb", scale: 0.32, trail: "hazelnut-trail", impact: "hazelnut-impact", tint: 0xb9824b }),
  mango: Object.freeze({ texture: "mango-level-1-bomb", scale: 0.34, trail: "mango-trail", impact: "mango-impact", tint: 0xffd45b }),
  "snow-thrower": Object.freeze({ texture: "snow-thrower-bomb-level-1", scale: 0.34, trail: "snow-trail", impact: "snow-freeze-impact", tint: 0xbcecff })
});

export function getProjectileVFXProfile(plantType) {
  return PROJECTILE_VFX_PROFILES[plantType] || null;
}
