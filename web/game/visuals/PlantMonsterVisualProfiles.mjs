// Data-driven visual direction for the Phaser campaign.
// These profiles describe presentation only; they never alter combat balance.
const freeze = (value) => Object.freeze(value);

export const PLANT_ANIMATION_PROFILES = freeze({
  radish: freeze({ idle: freeze({ loop: true, breathing: 0.025, durationMs: 1800 }), chargeMs: 180, attackMs: 550, recoveryMs: 220, personality: "quick-and-bouncy" }),
  mushroom: freeze({ idle: freeze({ loop: true, breathing: 0.035, durationMs: 2300 }), chargeMs: 300, attackMs: 620, recoveryMs: 300, personality: "soft-and-magical" }),
  pumpkin: freeze({ idle: freeze({ loop: true, breathing: 0.018, durationMs: 2600 }), chargeMs: 260, attackMs: 420, recoveryMs: 360, personality: "steady-and-protective" }),
  pineapple: freeze({ idle: freeze({ loop: true, breathing: 0.022, durationMs: 2100 }), chargeMs: 360, attackMs: 550, recoveryMs: 300, personality: "heavy-and-proud" }),
  hazelnut: freeze({ idle: freeze({ loop: true, breathing: 0.02, durationMs: 2400 }), chargeMs: 240, attackMs: 620, recoveryMs: 260, personality: "compact-and-sturdy" }),
  mango: freeze({ idle: freeze({ loop: true, breathing: 0.03, durationMs: 2200 }), chargeMs: 260, attackMs: 750, recoveryMs: 280, personality: "swinging-and-playful" }),
  "snow-thrower": freeze({ idle: freeze({ loop: true, breathing: 0.02, durationMs: 2500 }), chargeMs: 320, attackMs: 550, recoveryMs: 340, personality: "calm-and-precise" })
});

export const MONSTER_REACTION_PROFILES = freeze({
  "dust-skitter": freeze({ recoilPx: 7, squashX: 1.015, squashY: 0.86, hitDurationMs: 165, glowRadius: 2.2, personality: "quick-and-light" }),
  "cave-brute": freeze({ recoilPx: 5, squashX: 1.01, squashY: 0.88, hitDurationMs: 200, glowRadius: 2.4, personality: "balanced-and-readable" }),
  stonehide: freeze({ recoilPx: 3, squashX: 1.006, squashY: 0.92, hitDurationMs: 230, glowRadius: 2.1, personality: "heavy-and-armored" }),
  "alpha-brute": freeze({ recoilPx: 8, squashX: 1.018, squashY: 0.85, hitDurationMs: 260, glowRadius: 2.8, personality: "massive-and-powerful" })
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
  ]) })
});

export const MONSTER_EVOLUTION_PROFILES = freeze({
  "dust-skitter": freeze({ stages: freeze([
    freeze({ level: 1, title: "Dust Skitter", visual: "light fast scout silhouette" }),
    freeze({ level: 2, title: "Dust Streak", visual: "dust wake and sharper turning pose" }),
    freeze({ level: 3, title: "Sand Phantom", visual: "brief evasive dash tell" })
  ]) }),
  "cave-brute": freeze({ stages: freeze([
    freeze({ level: 1, title: "Cave Brute", visual: "baseline hyena raider" }),
    freeze({ level: 2, title: "Scarred Brute", visual: "subtle scars and stronger hit response" }),
    freeze({ level: 3, title: "War Brute", visual: "distinct roar and charge tell" })
  ]) }),
  stonehide: freeze({ stages: freeze([
    freeze({ level: 1, title: "Stonehide", visual: "stone-plated heavy" }),
    freeze({ level: 2, title: "Cracked Stonehide", visual: "damage stages visibly crack armor" }),
    freeze({ level: 3, title: "Ironhide", visual: "reinforced plates and heavy stomp tell" })
  ]) }),
  "alpha-brute": freeze({ stages: freeze([
    freeze({ level: 1, title: "Alpha Brute", visual: "giant leader silhouette" }),
    freeze({ level: 2, title: "Enraged Alpha", visual: "stronger stance and phase transition" }),
    freeze({ level: 3, title: "Apex Alpha", visual: "signature roar and arena-scale attack tell" })
  ]) })
});

export function getPlantAnimationProfile(plantId) {
  return PLANT_ANIMATION_PROFILES[plantId] || null;
}

export function getMonsterReactionProfile(monsterId) {
  return MONSTER_REACTION_PROFILES[monsterId] || MONSTER_REACTION_PROFILES["cave-brute"];
}

export function getPlantEvolutionProfile(plantId) {
  return PLANT_EVOLUTION_PROFILES[plantId] || null;
}

export function getMonsterEvolutionProfile(monsterId) {
  return MONSTER_EVOLUTION_PROFILES[monsterId] || null;
}
