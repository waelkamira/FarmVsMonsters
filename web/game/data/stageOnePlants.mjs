// Stage 1 plant roster. "implemented" means its gameplay behavior already exists in BattleScene.
export const STAGE_ONE_PLANTS = Object.freeze([
  {
    id: "radish",
    assetPath: "/assets/plants/radish.png",
    name: "Radish Defender",
    nameAr: "الفجل المدافع",
    role: "Lane defender",
    roleAr: "مدافع المسار",
    description: "Roots into a soil cell and automatically fires thorns at monsters in its lane.",
    descriptionAr: "يثبت في خلية ترابية ويطلق أشواكاً تلقائياً على الوحوش في مساره.",
    energyCost: 35,
    coinPrice: 0,
    status: "active",
    implemented: true,
    purchasable: false,
    image: null,
    stats: ["160 HP", "1450 ms attack cooldown", "360 range"],
    statsAr: ["١٦٠ صحة", "فاصل هجوم ١٤٥٠ مللي ثانية", "مدى ٣٦٠"]
  },
  {
    id: "energy-mushroom",
    assetPath: "/assets/plants/mushroom.png",
    name: "Energy Mushroom",
    nameAr: "فطر الطاقة",
    role: "Energy producer",
    roleAr: "منتج للطاقة",
    description: "Produces a collectible 15-energy pickup every 12 seconds.",
    descriptionAr: "ينتج مورداً قابلاً للجمع بقيمة ١٥ طاقة كل ١٢ ثانية.",
    energyCost: 50,
    coinPrice: 0,
    status: "active",
    implemented: true,
    purchasable: false,
    image: null,
    stats: ["85 HP", "+15 energy", "12 sec production"],
    statsAr: ["٨٥ صحة", "+١٥ طاقة", "إنتاج كل ١٢ ثانية"]
  },
  {
    id: "pea-shooter",
    assetPath: "/assets/plants/pea-shooter.png",
    name: "Pea Shooter",
    nameAr: "قاذف البازلاء",
    role: "Rapid ranged attacker",
    roleAr: "مهاجم بعيد سريع",
    description: "Fires small seed shots rapidly at the first monster in its lane.",
    descriptionAr: "يطلق بذوراً صغيرة بسرعة على أول وحش في مساره.",
    energyCost: 65, coinPrice: 120, status: "planned", implemented: false, purchasable: false, image: null,
    stats: ["Fast shots", "Single target"], statsAr: ["طلقات سريعة", "هدف واحد"]
  },
  {
    id: "thorn-wall",
    assetPath: "/assets/plants/thorn-wall.png",
    name: "Thorn Wall",
    nameAr: "جدار الأشواك",
    role: "Heavy blocker",
    roleAr: "حاجز دفاعي ثقيل",
    description: "A tough defensive plant that holds a lane and hurts monsters while they bite it.",
    descriptionAr: "نبتة دفاعية صلبة تصمد في المسار وتؤذي الوحوش أثناء التهامها.",
    energyCost: 75, coinPrice: 140, status: "planned", implemented: false, purchasable: false, image: null,
    stats: ["Very high HP", "Contact damage"], statsAr: ["صحة مرتفعة جداً", "ضرر عند التلامس"]
  },
  {
    id: "sunflower",
    assetPath: "/assets/plants/sunflower.png",
    name: "Sunflower",
    nameAr: "عباد الشمس",
    role: "Energy generator",
    roleAr: "مولّد للطاقة",
    description: "Generates a larger energy pickup at slower intervals than the mushroom.",
    descriptionAr: "ينتج كمية أكبر من الطاقة على فترات أطول مقارنة بالفطر.",
    energyCost: 55, coinPrice: 160, status: "planned", implemented: false, purchasable: false, image: null,
    stats: ["Resource support", "Slow production"], statsAr: ["دعم الموارد", "إنتاج بطيء"]
  },
  {
    id: "ice-bloom",
    assetPath: "/assets/plants/ice-bloom.png",
    name: "Ice Bloom",
    nameAr: "زهرة الصقيع",
    role: "Slowing support",
    roleAr: "نبتة إبطاء",
    description: "Launches icy pollen that temporarily slows the monster it hits.",
    descriptionAr: "تطلق حبوباً جليدية تبطئ الوحش الذي تصيبه لفترة مؤقتة.",
    energyCost: 85, coinPrice: 190, status: "planned", implemented: false, purchasable: false, image: null,
    stats: ["Slow effect", "Single target"], statsAr: ["تأثير إبطاء", "هدف واحد"]
  },
  {
    id: "double-radish",
    assetPath: "/assets/plants/double-radish.png",
    name: "Twin Radish",
    nameAr: "الفجل المزدوج",
    role: "Double projectile attacker",
    roleAr: "مهاجم بمقذوفين",
    description: "Fires two thorn volleys in quick succession for stronger lane pressure.",
    descriptionAr: "يطلق دفعتين من الأشواك بسرعة لزيادة قوة الدفاع في المسار.",
    energyCost: 95, coinPrice: 230, status: "planned", implemented: false, purchasable: false, image: null,
    stats: ["Double volley", "High damage"], statsAr: ["دفعة مزدوجة", "ضرر مرتفع"]
  },
  {
    id: "pumpkin-guard",
    assetPath: "/assets/plants/pumpkin.png",
    name: "Pumpkin Guard",
    nameAr: "حارس اليقطين",
    role: "Armored blocker",
    roleAr: "حاجز مدرّع",
    description: "A slow-growing armored plant designed to absorb repeated bites.",
    descriptionAr: "نبتة مدرّعة بطيئة النمو، مهمتها امتصاص العضّات المتكررة.",
    energyCost: 90, coinPrice: 250, status: "planned", implemented: false, purchasable: false, image: null,
    stats: ["Extreme durability", "No ranged attack"], statsAr: ["تحمّل استثنائي", "بلا هجوم بعيد"]
  },
  {
    id: "explosive-berry",
    assetPath: "/assets/plants/explosive-berry.png",
    name: "Blast Berry",
    nameAr: "توتة متفجرة",
    role: "Area damage",
    roleAr: "ضرر جماعي",
    description: "Explodes when a monster approaches, damaging several enemies in a small area.",
    descriptionAr: "تنفجر عند اقتراب الوحوش وتلحق الضرر بعدة أعداء ضمن نطاق صغير.",
    energyCost: 110, coinPrice: 300, status: "planned", implemented: false, purchasable: false, image: null,
    stats: ["Area burst", "Single use"], statsAr: ["انفجار جماعي", "استخدام واحد"]
  },
  {
    id: "fire-pepper",
    assetPath: "/assets/plants/fire-pepper.png",
    name: "Fire Pepper",
    nameAr: "فلفل النار",
    role: "Lane-clearing special",
    roleAr: "سلاح خاص لتنظيف المسار",
    description: "Creates a line of fire that damages every monster crossing its lane.",
    descriptionAr: "يشعل خطاً نارياً يلحق الضرر بكل وحش يعبر مساره.",
    energyCost: 130, coinPrice: 360, status: "planned", implemented: false, purchasable: false, image: null,
    stats: ["Lane-wide damage", "Rare plant"], statsAr: ["ضرر على كامل المسار", "نبتة نادرة"]
  },
  {
    id: "tomato",
    assetPath: "/assets/plants/tomato.png",
    name: "Tomato",
    nameAr: "الطماطم",
    role: "Lane projectile attacker",
    roleAr: "مهاجم بمقذوفات ضمن المسار",
    description: "Playtest prototype: fires miniature tomato shots at monsters in its own lane.",
    descriptionAr: "نسخة تجريبية: تطلق حبات طماطم صغيرة على الوحوش الموجودة في مسارها فقط.",
    energyCost: 55, coinPrice: 0, status: "active", implemented: true, purchasable: false, image: null,
    stats: ["115 HP", "34 damage", "1850 ms cooldown"], statsAr: ["١١٥ صحة", "ضرر ٣٤", "فاصل هجوم ١٨٥٠ مللي ثانية"]
  },
  {
    id: "onion",
    assetPath: "/assets/plants/Onion.png",
    name: "Onion",
    nameAr: "البصل",
    role: "Armored lane blocker",
    roleAr: "حاجز مدرّع للمسار",
    description: "Playtest prototype: absorbs monster bites and holds its lane with high durability.",
    descriptionAr: "نسخة تجريبية: يمتص عضّات الوحوش ويمنعها من التقدم بفضل تحمّله العالي.",
    energyCost: 75, coinPrice: 0, status: "active", implemented: true, purchasable: false, image: null,
    stats: ["520 HP", "Blocks monsters", "No ranged attack"], statsAr: ["٥٢٠ صحة", "يوقف الوحوش", "لا يهاجم عن بُعد"]
  }
]);

export const STAGE_ONE_PLANT_BY_ID = Object.freeze(
  Object.fromEntries(STAGE_ONE_PLANTS.map((plant) => [plant.id, plant]))
);
