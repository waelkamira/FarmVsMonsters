// Stage 1 plant roster. "implemented" means its gameplay behavior already exists in BattleScene.
export const STAGE_ONE_PLANTS = Object.freeze([
  {
    id: "radish",
    assetPath: "/assets/plants/radish-level-1.png",
    name: "Radish Level 1",
    nameAr: "الفجل المستوى الأول",
    role: "Lane defender",
    roleAr: "مدافع المسار",
    description: "Roots into a soil cell, performs its nine-frame attack animation, and launches miniature Radish Level 1 bombs at monsters in its lane.",
    descriptionAr: "يثبت في خلية ترابية، وينفذ حركة هجوم من تسعة إطارات، ثم يطلق قذائف فجل صغيرة على الوحوش في مساره.",
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
    role: "Armored lane blocker",
    roleAr: "حاجز مدرّع للمسار",
    description: "Playtest prototype: absorbs monster bites and holds its lane with high durability.",
    descriptionAr: "نسخة تجريبية: يمتص عضّات الوحوش ويمنعها من التقدم بفضل تحمّله العالي.",
    energyCost: 75, coinPrice: 0, status: "active", implemented: true, purchasable: false, image: null,
    stats: ["520 HP", "Blocks monsters", "No ranged attack"], statsAr: ["٥٢٠ صحة", "يوقف الوحوش", "لا يهاجم عن بُعد"]
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
    assetPath: "/assets/plants/Pepper-flamethrower-level-1.png",
    name: "Fire Pepper Level 1",
    nameAr: "فلفل النار المستوى الأول",
    role: "Lane-clearing special",
    roleAr: "سلاح خاص لتنظيف المسار",
    description: "Plays its nine-frame flamethrower animation, then scorches every monster ahead in its lane.",
    descriptionAr: "ينفذ حركة قاذف اللهب ذات الإطارات التسعة ثم يحرق جميع الوحوش أمامه في مساره.",
    energyCost: 130, coinPrice: 360, status: "active", implemented: true, purchasable: false, image: null,
    stats: ["44 lane damage", "9000 ms cooldown"], statsAr: ["ضرر ٤٤ على المسار", "فاصل هجوم ٩٠٠٠ مللي ثانية"]
  },

  {
    id: "snow-thrower", assetPath: "/assets/plants/Snow-thrower-level-1.png",
    name: "Snow Thrower Level 1", nameAr: "قاذف الثلج المستوى الأول",
    role: "Freeze support", roleAr: "دعم بالتجميد",
    description: "Launches a snow bomb down its lane, freezing the first monster it hits for 2.6 seconds.",
    descriptionAr: "يطلق قذيفة ثلجية في مساره وتجمّد أول وحش تصيبه لمدة ٢٫٦ ثانية.",
    energyCost: 90, coinPrice: 0, status: "active", implemented: true, purchasable: false, image: null,
    stats: ["150 HP", "2.6 sec freeze", "3600 ms cooldown"], statsAr: ["١٥٠ صحة", "تجميد ٢٫٦ ثانية", "فاصل إطلاق ٣٦٠٠ مللي ثانية"]
  },
  {
    id: "pineapple",
    assetPath: "/assets/plants/pineapple-level-1.png",
    name: "Pineapple Level 1",
    nameAr: "الأناناس المستوى الأول",
    role: "Lane projectile attacker",
    roleAr: "مهاجم بمقذوفات ضمن المسار",
    description: "Prototype: plays its nine-frame throw animation and launches a miniature pineapple bomb down its own lane.",
    descriptionAr: "نسخة تجريبية: تشغّل أنيميشن القذف ذي الإطارات التسعة وتطلق قذيفة أناناس صغيرة ضمن مسارها فقط.",
    energyCost: 70, coinPrice: 0, status: "active", implemented: true, purchasable: false, image: null,
    stats: ["140 HP", "42 damage", "2100 ms cooldown"], statsAr: ["١٤٠ صحة", "ضرر ٤٢", "فاصل هجوم ٢١٠٠ مللي ثانية"]
  },

  {
    id: "hazelnut",
    assetPath: "/assets/plants/hazelnut-level-1.png",
    name: "Hazelnut Level 1",
    nameAr: "البندق المستوى الأول",
    role: "Lane projectile attacker",
    roleAr: "مهاجم بمقذوفات ضمن المسار",
    description: "Launches miniature Hazelnut bombs down its own lane to damage incoming monsters.",
    descriptionAr: "يطلق قذائف بندق صغيرة ضمن مساره لإلحاق الضرر بالوحوش القادمة.",
    energyCost: 65, coinPrice: 0, status: "active", implemented: true, purchasable: false, image: null,
    stats: ["130 HP", "38 damage", "1950 ms cooldown"], statsAr: ["١٣٠ صحة", "ضرر ٣٨", "فاصل هجوم ١٩٥٠ مللي ثانية"]
  },

  {
    id: "mango",
    assetPath: "/assets/plants/mango-level-1.png",
    name: "Mango Level 1",
    nameAr: "المانجو المستوى الأول",
    role: "Arcing bomb attacker",
    roleAr: "مهاجم بقذائف منحنية",
    description: "Launches its own miniature mango bomb in a curved path that drops onto a monster in its lane.",
    descriptionAr: "يطلق قذيفة مانجو صغيرة بمسار منحنٍ وتهوي فوق الوحش الموجود في مساره.",
    energyCost: 70, coinPrice: 0, status: "active", implemented: true, purchasable: false, image: null,
    stats: ["130 HP", "40 damage", "2100 ms cooldown"], statsAr: ["١٣٠ صحة", "ضرر ٤٠", "فاصل هجوم ٢١٠٠ مللي ثانية"]
  },

  {
    id: "electric-mushroom",
    assetPath: "/assets/plants/Electric-mushroom-level-1.png",
    name: "Electric Mushroom Level 1",
    nameAr: "الفطر الكهربائي المستوى الأول",
    role: "Electric lane attacker",
    roleAr: "مهاجم كهربائي للمسار",
    description: "Uses a nine-frame electric charge animation before firing a cyan lightning bolt at monsters in its lane.",
    descriptionAr: "ينفذ حركة شحن كهربائية من تسعة إطارات قبل إطلاق صاعقة سماوية على الوحوش في مساره.",
    energyCost: 80, coinPrice: 0, status: "active", implemented: true, purchasable: false, image: null,
    stats: ["115 HP", "22 damage", "1850 ms cooldown"], statsAr: ["١١٥ صحة", "ضرر ٢٢", "فاصل هجوم ١٨٥٠ مللي ثانية"]
  }
]);

export const STAGE_ONE_PLANT_BY_ID = Object.freeze(
  Object.fromEntries(STAGE_ONE_PLANTS.map((plant) => [plant.id, plant]))
);
