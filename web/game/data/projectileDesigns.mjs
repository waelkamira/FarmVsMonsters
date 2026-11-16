/**
 * Plant-themed projectile art direction for FarmVsMonsters.
 *
 * This is a visual asset contract, not a claim that the projectile PNGs already exist.
 * Runtime integration must only be enabled after each transparent sprite is added
 * under its assetPath and checked in the battle scene.
 */
export const PLANT_PROJECTILE_DESIGNS = Object.freeze({
  radish: {
    kind: "projectile",
    name: "Mini radish",
    nameAr: "فجلة صغيرة",
    assetPath: "/assets/projectiles/plants/mini-radish.png",
    sourcePlant: "/assets/plants/radish.png",
    shape: "small rounded radish bulb with two tiny green leaves",
    palette: ["radish-red", "leaf-green", "soft-cream"],
    impact: "small leafy burst",
    scale: 0.34,
    implemented: false
  },
  "energy-mushroom": {
    kind: "resource",
    name: "Energy spore",
    nameAr: "بوغ طاقة",
    assetPath: "/assets/projectiles/plants/energy-spore.png",
    sourcePlant: "/assets/plants/mushroom.png",
    shape: "glowing miniature mushroom-cap orb",
    palette: ["mushroom-red", "cream", "gold-glow"],
    impact: "soft energy sparkle",
    scale: 0.3,
    implemented: false
  },
  "pea-shooter": {
    kind: "projectile",
    name: "Pea",
    nameAr: "حبة بازلاء",
    assetPath: "/assets/projectiles/plants/pea.png",
    sourcePlant: "/assets/plants/pea-shooter.png",
    shape: "single plump green pea with a bright highlight",
    palette: ["pea-green", "lime", "leaf-green"],
    impact: "green seed pop",
    scale: 0.3,
    implemented: false
  },
  "thorn-wall": {
    kind: "contact",
    name: "Thorn contact hit",
    nameAr: "ضربة أشواك تلامسية",
    assetPath: null,
    sourcePlant: "/assets/plants/thorn-wall.png",
    shape: "short thorn burst at the point of contact; no travelling projectile",
    palette: ["thorn-green", "lime", "cream"],
    impact: "brief thorn prick burst",
    scale: 0,
    implemented: false
  },
  sunflower: {
    kind: "resource",
    name: "Mini sun",
    nameAr: "شمس صغيرة",
    assetPath: "/assets/projectiles/plants/mini-sun.png",
    sourcePlant: "/assets/plants/sunflower.png",
    shape: "small golden sun with petal rays matching the flower",
    palette: ["sun-yellow", "gold", "orange"],
    impact: "warm sparkle",
    scale: 0.32,
    implemented: false
  },
  "ice-bloom": {
    kind: "projectile",
    name: "Frost berry",
    nameAr: "ثمرة صقيع",
    assetPath: "/assets/projectiles/plants/frost-berry.png",
    sourcePlant: "/assets/plants/ice-bloom.png",
    shape: "small icy berry with a crystalline frost crown",
    palette: ["ice-blue", "cyan", "white"],
    impact: "six-point frost burst and slow effect",
    scale: 0.32,
    implemented: false
  },
  pineapple: {
    kind: "projectile",
    name: "Mini pineapple bomb",
    nameAr: "قذيفة أناناس صغيرة",
    assetPath: "/assets/plants/pineapple-level-1-bomb.png",
    sourcePlant: "/assets/plants/pineapple-level-1.png",
    shape: "miniature pineapple bomb matching the Pineapple Level 1 artwork",
    palette: ["pineapple-yellow", "leaf-green", "gold"],
    impact: "compact pineapple impact burst",
    scale: 0.32,
    implemented: true
  },
  "double-radish": {
    kind: "projectile",
    name: "Twin mini radishes",
    nameAr: "فجلتان صغيرتان",
    assetPath: "/assets/projectiles/plants/twin-mini-radishes.png",
    sourcePlant: "/assets/plants/double-radish.png",
    shape: "two miniature radishes launched as a paired volley",
    palette: ["radish-red", "leaf-green", "cream"],
    impact: "double leafy burst",
    scale: 0.29,
    implemented: false
  },
  "pumpkin-guard": {
    kind: "contact",
    name: "Pumpkin shield bash",
    nameAr: "صدمة درع اليقطين",
    assetPath: null,
    sourcePlant: "/assets/plants/pumpkin-guard.png",
    shape: "short squash-colored impact ring; no travelling projectile",
    palette: ["pumpkin-orange", "gold", "leaf-green"],
    impact: "compact orange impact ring",
    scale: 0,
    implemented: false
  },
  "explosive-berry": {
    kind: "projectile",
    name: "Blast berry",
    nameAr: "حبة توت متفجرة",
    assetPath: "/assets/projectiles/plants/blast-berry.png",
    sourcePlant: "/assets/plants/explosive-berry.png",
    shape: "small round berry with a bright fuse-like leaf",
    palette: ["berry-magenta", "violet", "leaf-green"],
    impact: "bright area burst",
    scale: 0.34,
    implemented: false
  },
  "fire-pepper": {
    kind: "projectile",
    name: "Fire pepper",
    nameAr: "حبة فلفل نارية",
    assetPath: "/assets/projectiles/plants/fire-pepper.png",
    sourcePlant: "/assets/plants/fire-pepper.png",
    shape: "tiny curved pepper with a green stem and flame trail",
    palette: ["pepper-red", "orange", "gold", "leaf-green"],
    impact: "short flame burst",
    scale: 0.34,
    implemented: false
  }
});

export function projectileDesignForPlant(plantId) {
  return PLANT_PROJECTILE_DESIGNS[plantId] || null;
}
