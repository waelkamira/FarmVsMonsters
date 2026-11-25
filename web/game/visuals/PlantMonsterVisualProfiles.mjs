// Data-driven visual direction for the Phaser campaign.
// These profiles describe presentation only; they never alter combat balance.
const freeze = (value) => Object.freeze(value);

export const PLANT_ANIMATION_PROFILES = freeze({
  radish: freeze({ idle: freeze({ loop: true, breathing: 0.025, durationMs: 1800 }), chargeMs: 180, attackMs: 550, recoveryMs: 220, anticipationPx: 2.5, anticipationMs: 150, personality: "quick-and-bouncy" }),
  mushroom: freeze({ idle: freeze({ loop: true, breathing: 0.035, durationMs: 2300 }), chargeMs: 300, attackMs: 620, recoveryMs: 300, anticipationPx: 2, anticipationMs: 180, personality: "soft-and-magical" }),
  pumpkin: freeze({ idle: freeze({ loop: true, breathing: 0.018, durationMs: 2600 }), chargeMs: 260, attackMs: 420, recoveryMs: 360, anticipationPx: 1.5, anticipationMs: 190, personality: "steady-and-protective" }),
  pineapple: freeze({ idle: freeze({ loop: true, breathing: 0.022, durationMs: 2100 }), chargeMs: 360, attackMs: 550, recoveryMs: 300, anticipationPx: 3.5, anticipationMs: 210, personality: "heavy-and-proud" }),
  hazelnut: freeze({ idle: freeze({ loop: true, breathing: 0.02, durationMs: 2400 }), chargeMs: 240, attackMs: 620, recoveryMs: 260, anticipationPx: 2, anticipationMs: 165, personality: "compact-and-sturdy" }),
  mango: freeze({ idle: freeze({ loop: true, breathing: 0.03, durationMs: 2200 }), chargeMs: 260, attackMs: 750, recoveryMs: 280, anticipationPx: 3, anticipationMs: 180, personality: "swinging-and-playful" }),
  "snow-thrower": freeze({ idle: freeze({ loop: true, breathing: 0.02, durationMs: 2500 }), chargeMs: 320, attackMs: 550, recoveryMs: 340, anticipationPx: 2.5, anticipationMs: 200, personality: "calm-and-precise" }),
  "electric-mushroom": freeze({ idle: freeze({ loop: true, breathing: 0.04, durationMs: 1950 }), chargeMs: 210, attackMs: 480, recoveryMs: 250, anticipationPx: 3, anticipationMs: 175, personality: "bright-and-sparky" })
});

export const MONSTER_REACTION_PROFILES = freeze({
  "monster-01": freeze({ recoilPx: 5, squashX: 1.01, squashY: 0.88, hitDurationMs: 200, glowRadius: 2.4, personality: "balanced-and-readable" })
});

export const PLANT_EVOLUTION_PROFILES = freeze({
  radish: freeze({
    stages: freeze([
      freeze({ level: 1, title: "Sprout", visual: "base silhouette and quick single projectile", unlock: "base" }),
      freeze({ level: 2, title: "Rooted", visual: "richer leaf detail and more confident attack anticipation", unlock: "visual-upgrade" }),
      freeze({ level: 3, title: "Garden Champion", visual: "signature charged volley with a distinct impact flourish", unlock: "signature-ability" })
    ])
  }),
  mushroom: freeze({ stages: freeze([
    freeze({ level: 1, title: "Little Spore", visual: "gentle idle and soft spore puff", unlock: "base" }),
    freeze({ level: 2, title: "Mooncap", visual: "brighter cap accents and wider spore animation", unlock: "visual-upgrade" }),
    freeze({ level: 3, title: "Dreamshroom", visual: "signature spreading spore field", unlock: "signature-ability" })
  ]) }),
  pumpkin: freeze({ stages: freeze([
    freeze({ level: 1, title: "Patch Guard", visual: "simple protective shell", unlock: "base" }),
    freeze({ level: 2, title: "Bark Armor", visual: "visible layered shell and staged damage marks", unlock: "visual-upgrade" }),
    freeze({ level: 3, title: "Ironroot Bastion", visual: "signature defensive pulse", unlock: "signature-ability" })
  ]) }),
  pineapple: freeze({ stages: freeze([
    freeze({ level: 1, title: "Pineapple Lobber", visual: "curved heavy projectile", unlock: "base" }),
    freeze({ level: 2, title: "Spine Launcher", visual: "stronger wind-up and richer projectile trail", unlock: "visual-upgrade" }),
    freeze({ level: 3, title: "Sunburst Artillery", visual: "signature area impact", unlock: "signature-ability" })
  ]) }),
  hazelnut: freeze({ stages: freeze([
    freeze({ level: 1, title: "Hazel Scout", visual: "compact nut projectile", unlock: "base" }),
    freeze({ level: 2, title: "Hard Shell", visual: "reinforced shell detail and punchier recoil", unlock: "visual-upgrade" }),
    freeze({ level: 3, title: "Ancient Kernel", visual: "signature piercing shot", unlock: "signature-ability" })
  ]) }),
  mango: freeze({ stages: freeze([
    freeze({ level: 1, title: "Mango Toss", visual: "playful arcing fruit shot", unlock: "base" }),
    freeze({ level: 2, title: "Golden Mango", visual: "richer fruit glow and longer throw follow-through", unlock: "visual-upgrade" }),
    freeze({ level: 3, title: "Solar Mango", visual: "signature radiant splash", unlock: "signature-ability" })
  ]) }),
  "snow-thrower": freeze({ stages: freeze([
    freeze({ level: 1, title: "Snow Thrower", visual: "single cold projectile and clear frost hit", unlock: "base" }),
    freeze({ level: 2, title: "Frost Keeper", visual: "visible frost accumulation and stronger freeze tell", unlock: "visual-upgrade" }),
    freeze({ level: 3, title: "Winter Warden", visual: "signature chained freeze", unlock: "signature-ability" })
  ]) }),
  "electric-mushroom": freeze({ stages: freeze([
    freeze({ level: 1, title: "Sparkcap", visual: "electric mushroom silhouette with a bright cyan charge and bolt", unlock: "base" }),
    freeze({ level: 2, title: "Stormcap", visual: "stronger electric veins and a branching impact arc", unlock: "visual-upgrade" }),
    freeze({ level: 3, title: "Thunder Bloom", visual: "signature chain lightning burst", unlock: "signature-ability" })
  ]) })
});

export const MONSTER_EVOLUTION_PROFILES = freeze({
  "monster-01": freeze({ stages: freeze([
    freeze({ level: 1, title: "Monster 01", visual: "approved base character artwork" }),
    freeze({ level: 2, title: "Monster 01 · Level 2", visual: "future approved visual evolution" }),
    freeze({ level: 3, title: "Monster 01 · Level 3", visual: "future approved signature form" })
  ]) })
});

export function getPlantAnimationProfile(plantId) {
  return PLANT_ANIMATION_PROFILES[plantId] || null;
}

export function getMonsterReactionProfile(monsterId) {
  return MONSTER_REACTION_PROFILES[monsterId] || MONSTER_REACTION_PROFILES["monster-01"];
}

export function getPlantEvolutionProfile(plantId) {
  return PLANT_EVOLUTION_PROFILES[plantId] || null;
}

export function getMonsterEvolutionProfile(monsterId) {
  return MONSTER_EVOLUTION_PROFILES[monsterId] || null;
}


// Pure transform helper keeps the idle breathing envelope deterministic and testable.
export function getPlantIdleMotionTransform(plantId, elapsedMs, phaseMs = 0, baseScaleX = 1, baseScaleY = 1) {
  const idle = getPlantAnimationProfile(plantId)?.idle;
  if (!idle?.loop) return null;
  const duration = Math.max(1, idle.durationMs);
  const phase = ((Number.isFinite(elapsedMs) ? elapsedMs : 0) + (Number.isFinite(phaseMs) ? phaseMs : 0)) % duration;
  const breathing = Math.sin((phase / duration) * Math.PI * 2) * idle.breathing;
  return Object.freeze({
    scaleX: baseScaleX * (1 - breathing * 0.35),
    scaleY: baseScaleY * (1 + breathing)
  });
}
