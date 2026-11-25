// Canonical monster encyclopedia roster. Monster 01 is the only currently approved ordinary monster.
export const STAGE_ONE_MONSTERS = Object.freeze([Object.freeze({
  id: "monster-01", icon: "monster-01", name: "Monster 01", nameAr: "الوحش 01",
  role: "Standard raider", roleAr: "وحش أساسي",
  description: "The current approved monster. It advances through its lane and attacks plants blocking its path.",
  descriptionAr: "الوحش المعتمد حالياً. يتقدم في مساره ويهاجم النباتات التي تعترض طريقه.",
  stats: "Standard durability", statsAr: "تحمّل أساسي",
  spawnNote: "All ordinary waves", spawnNoteAr: "جميع الموجات العادية",
  implemented: true, playable: true, purchasable: false, status: "implemented"
})]);
export const FUTURE_MONSTERS = Object.freeze(Array.from({ length: 99 }, (_, index) => {
  const number = index + 2;
  const padded = String(number).padStart(3, "0");
  return Object.freeze({ id: `future-monster-${padded}`, name: `Future Monster ${padded}`, nameAr: `وحش قادم ${padded}`, status: "in-design", implemented: false, playable: false, purchasable: false });
}));
export const MONSTER_ROSTER_TOTAL = STAGE_ONE_MONSTERS.length + FUTURE_MONSTERS.length;
if (MONSTER_ROSTER_TOTAL !== 100) throw new Error(`Monster roster must contain 100 entries; found ${MONSTER_ROSTER_TOTAL}`);
