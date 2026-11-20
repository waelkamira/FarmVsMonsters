// Profiles map gameplay events to effect IDs. Missing art is intentionally
// represented by null so the manager can use its procedural fallback.
export const PLANT_VFX_PROFILES = Object.freeze({
  radish: Object.freeze({ charge: "radish-charge", projectile: "radish-projectile", trail: "radish-trail", impact: "radish-impact" }),
  mushroom: Object.freeze({ charge: "mushroom-charge", projectile: null, trail: null, impact: "mushroom-pickup" }),
  pumpkin: Object.freeze({ charge: "pumpkin-charge", projectile: null, trail: null, impact: "pumpkin-impact" }),
  pineapple: Object.freeze({ charge: "pineapple-charge", projectile: "pineapple-projectile", trail: "pineapple-trail", impact: "pineapple-impact" }),
  hazelnut: Object.freeze({ charge: "hazelnut-charge", projectile: "hazelnut-projectile", trail: "hazelnut-trail", impact: "hazelnut-impact" }),
  mango: Object.freeze({ charge: "mango-charge", projectile: "mango-projectile", trail: "mango-trail", impact: "mango-impact" }),
  "snow-thrower": Object.freeze({ charge: "snow-charge", projectile: "snow-projectile", trail: "snow-trail", impact: "snow-freeze-impact" })
});

export function getPlantVFXProfile(plantType) {
  return PLANT_VFX_PROFILES[plantType] || null;
}
