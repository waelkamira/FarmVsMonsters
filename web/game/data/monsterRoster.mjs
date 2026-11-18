// Canonical monster encyclopedia roster.
// Only entries with implemented=true are wired into the current battle gameplay.
// Future entries intentionally have no invented names, stats, abilities, or purchase state.
export const STAGE_ONE_MONSTERS = Object.freeze([
  {
    id: "cave-brute",
    icon: "cave-brute",
    name: "Cave Brute",
    nameAr: "الضبع العادي",
    role: "Standard raider",
    roleAr: "الضبع الأساسي",
    description: "The baseline enemy. It advances through its lane and stops to eat a plant blocking its path.",
    descriptionAr: "النوع الأساسي. يتقدم في مساره ويتوقف لالتهام أي نبتة تعترض طريقه.",
    stats: "Standard durability · 7 radish hits",
    statsAr: "تحمّل عادي · ٧ ضربات من الفجل",
    spawnNote: "Standard waves",
    spawnNoteAr: "الموجات العادية",
    implemented: true,
    playable: true,
    purchasable: false,
    status: "implemented"
  },
  {
    id: "dust-skitter",
    icon: "dust-skitter",
    name: "Dust Skitter",
    nameAr: "ضبع الغبار السريع",
    role: "Fast, fragile scout",
    roleAr: "كشاف سريع وضعيف التحمل",
    description: "Moves faster than the standard hyena but is much easier to defeat.",
    descriptionAr: "يتحرك أسرع من الضبع العادي، لكنه أسهل بكثير في الهزيمة.",
    stats: "About 52% of standard durability",
    statsAr: "نحو ٥٢٪ من تحمّل الضبع العادي",
    spawnNote: "From Wave 3",
    spawnNoteAr: "من الموجة الثالثة",
    implemented: true,
    playable: true,
    purchasable: false,
    status: "implemented"
  },
  {
    id: "stonehide",
    icon: "stonehide",
    name: "Stonehide",
    nameAr: "ضبع الجلد الحجري",
    role: "Armored heavy",
    roleAr: "وحش ثقيل ومدرّع",
    description: "A slower, heavily plated hyena that takes much more damage before falling.",
    descriptionAr: "ضبع أبطأ ومدرّع بشدة، ويتطلب إسقاطه ضرراً أكبر.",
    stats: "2.2× standard durability",
    statsAr: "٢٫٢ ضعف تحمّل الضبع العادي",
    spawnNote: "Late waves",
    spawnNoteAr: "الموجات المتأخرة",
    implemented: true,
    playable: true,
    purchasable: false,
    status: "implemented"
  },
  {
    id: "alpha-brute",
    icon: "alpha-brute",
    name: "Alpha Brute",
    nameAr: "الضبع العملاق",
    role: "Rare giant leader",
    roleAr: "قائد عملاق نادر",
    description: "A huge late-wave enemy with exceptional durability and crushing bites.",
    descriptionAr: "وحش ضخم يظهر في الموجات المتأخرة، يتمتع بتحمّل استثنائي وعضّات ساحقة.",
    stats: "14 radish hits",
    statsAr: "١٤ ضربة من الفجل",
    spawnNote: "Late waves",
    spawnNoteAr: "الموجات المتأخرة",
    implemented: true,
    playable: true,
    purchasable: false,
    status: "implemented"
  },
  {
    id: "frozen-hyena",
    icon: "frozen-hyena",
    name: "Frozen Hyena",
    nameAr: "الضبع المتجمد",
    role: "Frost-resistant raider",
    roleAr: "مهاجم مقاوم للتجميد",
    description: "A heavier icy hyena that advances more slowly and resists part of incoming freeze duration.",
    descriptionAr: "ضبع جليدي أثقل وأبطأ، يقاوم جزءاً من مدة تأثير التجميد.",
    stats: "135% standard durability · 55% freeze resistance",
    statsAr: "١٣٥٪ من صحة الضبع العادي · مقاومة ٥٥٪ للتجميد",
    spawnNote: "From Wave 4",
    spawnNoteAr: "من الموجة الرابعة",
    implemented: true,
    playable: true,
    purchasable: false,
    status: "implemented"
  }
]);

export const FUTURE_MONSTERS = Object.freeze(
  Array.from({ length: 96 }, (_, index) => {
    const number = index + 5;
    const padded = String(number).padStart(3, "0");
    return Object.freeze({
      id: `future-monster-${padded}`,
      name: `Future Monster ${padded}`,
      nameAr: `وحش قادم ${String(number).padStart(2, "0")}`,
      status: "in-design",
      implemented: false,
      playable: false,
      purchasable: false
    });
  })
);

export const MONSTER_ROSTER_TOTAL = STAGE_ONE_MONSTERS.length + FUTURE_MONSTERS.length;

if (MONSTER_ROSTER_TOTAL !== 100) {
  throw new Error(`Monster roster must contain 100 entries; found ${MONSTER_ROSTER_TOTAL}`);
}
