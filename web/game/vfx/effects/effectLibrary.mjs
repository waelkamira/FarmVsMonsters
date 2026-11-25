/**
 * مكتبة التأثيرات البصرية والسمعية.
 *
 * بيانات خالصة بلا اعتماد على Phaser أو المتصفح، يقرؤها:
 *   - EffectDirector  (تشغيل التأثير داخل اللعبة)
 *   - effectPreview   (معاينة متحركة داخل الاستوديو)
 *   - الاستوديو       (القائمة والأسماء والأوصاف والأيقونات)
 *
 * كل التأثيرات تجميلية فقط: لا تغيّر الضرر ولا السرعة ولا نتيجة القتال،
 * فلا تكسر إعادة التشغيل (Replay) ولا التوازن.
 */

export const EFFECT_TRIGGERS = Object.freeze({
  fire: Object.freeze({ id: "fire", label: "عند الإطلاق أو الهجوم", hint: "يظهر عند مصدر الحركة لحظة الإطلاق." }),
  hit: Object.freeze({ id: "hit", label: "عند إصابة الهدف", hint: "يظهر على الخصم الذي أصابه هذا الكائن." }),
  damaged: Object.freeze({ id: "damaged", label: "عند تلقّي الضرر", hint: "يظهر على الكائن نفسه حين يُصاب." }),
  spawn: Object.freeze({ id: "spawn", label: "عند الظهور", hint: "يظهر لحظة الزرع أو دخول الساحة." }),
  death: Object.freeze({ id: "death", label: "عند الموت", hint: "يظهر لحظة سقوط الكائن." }),
  aura: Object.freeze({ id: "aura", label: "بشكل مستمر", hint: "يتكرر كل بضع ثوانٍ طالما الكائن حيّ." })
});

export const MAX_EFFECTS_PER_ASSET = 4;

const TAU = Math.PI * 2;
function starPoints(points, outer, inner, rotationDeg = -90, cx = 16, cy = 16) {
  const out = [];
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (rotationDeg * Math.PI) / 180 + (i * Math.PI) / points;
    out.push([Number((cx + Math.cos(angle) * radius).toFixed(2)), Number((cy + Math.sin(angle) * radius).toFixed(2))]);
  }
  return out;
}

/** أشكال الجسيمات على شبكة 32×32: أوامر بسيطة تفهمها Phaser وCanvas معاً. */
export const EFFECT_SHAPES = Object.freeze({
  dot: [{ t: "circle", x: 16, y: 16, r: 10 }],
  star: [{ t: "poly", pts: starPoints(5, 15, 6.5) }],
  spark: [{ t: "poly", pts: starPoints(4, 15, 3) }],
  snow: [{ t: "poly", pts: starPoints(6, 15, 3.2) }],
  leaf: [{ t: "poly", pts: [[16, 2], [26, 11], [25, 23], [16, 30], [7, 23], [6, 11]] }],
  shard: [{ t: "poly", pts: [[16, 1], [25, 21], [16, 31], [7, 21]] }],
  bubble: [{ t: "circle", x: 16, y: 16, r: 11 }],
  puff: [{ t: "circle", x: 11, y: 18, r: 8 }, { t: "circle", x: 21, y: 18, r: 8 }, { t: "circle", x: 16, y: 11, r: 9 }],
  coin: [{ t: "circle", x: 16, y: 16, r: 12 }],
  crumb: [{ t: "poly", pts: [[6, 12], [15, 5], [26, 10], [24, 22], [13, 26], [5, 20]] }],
  drop: [{ t: "poly", pts: [[16, 1], [24, 15], [25, 22], [20, 29], [12, 29], [7, 22], [8, 15]] }],
  flame: [{ t: "poly", pts: [[16, 1], [23, 12], [27, 22], [20, 31], [12, 31], [5, 22], [9, 12], [14, 17]] }]
});

// ---- أدوات بناء مختصرة للطبقات ------------------------------------------------
const burst = (o) => ({ type: "burst", shape: "dot", count: 8, colors: [0xffffff], speed: [60, 160], gravity: 0, life: 420, size: [0.5, 0.9], spread: [0, 360], additive: false, ...o });
const rise = (o) => ({ type: "rise", shape: "dot", count: 6, colors: [0xffffff], speed: [18, 46], life: 800, size: [0.4, 0.8], spreadX: 22, additive: false, ...o });
const ring = (o) => ({ type: "ring", radius: 46, color: 0xffffff, life: 360, width: 4, ...o });
const flash = (o) => ({ type: "flash", radius: 32, color: 0xffffff, life: 220, ...o });
const bolt = (o) => ({ type: "bolt", count: 3, color: 0xffffff, height: 70, life: 220, fromTop: false, ...o });
const tint = (o) => ({ type: "tint", color: 0xffffff, life: 300, slowAnim: false, flicker: false, ...o });
const shake = (o) => ({ type: "shake", ms: 160, intensity: 0.008, ...o });
const squash = (o) => ({ type: "squash", sx: 1.2, sy: 0.8, life: 220, ...o });
const orbit = (o) => ({ type: "orbit", shape: "star", count: 3, radius: 22, height: 46, life: 900, color: 0xffe066, ...o });
const slash = (o) => ({ type: "slash", color: 0xffffff, size: 54, life: 220, angle: -35, ...o });

const BOTH = Object.freeze(["plant", "monster"]);

const DEFINITIONS = [
  // ------------------------------------------------------------- عند إصابة الهدف
  {
    id: "electric-shock", nameAr: "الصعق الكهربائي", category: "كهرباء", trigger: "hit", color: 0x6fe3ff,
    descriptionAr: "صواعق زرقاء تلتف حول الخصم، ويومض جسمه لحظة الصعق.",
    sound: { key: "fx-electric-shock", volume: 0.8, cooldownMs: 140 },
    layers: [
      flash({ color: 0xbff6ff, radius: 30, life: 160 }),
      bolt({ count: 3, color: 0x9ff0ff, height: 64, life: 240 }),
      burst({ shape: "spark", count: 10, colors: [0x6fe3ff, 0xffffff, 0xfff27a], speed: [80, 200], life: 340, size: [0.5, 0.9], additive: true }),
      tint({ color: 0xa8f2ff, life: 260, flicker: true })
    ]
  },
  {
    id: "freeze", nameAr: "التجميد", category: "جليد", trigger: "hit", color: 0x9bd8ff,
    descriptionAr: "يكسو الخصم بلون الجليد وتتناثر بلورات صغيرة، وتتباطأ حركة رسمه فقط.",
    sound: { key: "fx-freeze", volume: 0.8, cooldownMs: 200 },
    layers: [
      tint({ color: 0x9bd8ff, life: 700, slowAnim: true }),
      ring({ color: 0xbfeaff, radius: 40, life: 420 }),
      burst({ shape: "shard", count: 9, colors: [0xdff6ff, 0x9bd8ff], speed: [50, 130], gravity: 120, life: 520, size: [0.4, 0.8] }),
      rise({ shape: "snow", count: 5, colors: [0xffffff], life: 700, size: [0.3, 0.6] })
    ]
  },
  {
    id: "burn", nameAr: "الحرق", category: "نار", trigger: "hit", color: 0xff8a3d,
    descriptionAr: "ألسنة لهب وشرر برتقالي تتصاعد من الخصم، ويحمرّ لونه لحظة الإصابة.",
    sound: { key: "fx-burn", volume: 0.75, cooldownMs: 200 },
    layers: [
      tint({ color: 0xff9a4d, life: 420 }),
      flash({ color: 0xffb347, radius: 34, life: 200 }),
      rise({ shape: "flame", count: 8, colors: [0xff7a1a, 0xffc247, 0xff4d2e], speed: [34, 80], life: 650, size: [0.4, 0.9], spreadX: 26, additive: true }),
      burst({ shape: "spark", count: 6, colors: [0xffd27a, 0xff8a3d], speed: [50, 120], gravity: 80, life: 420, size: [0.3, 0.5], additive: true })
    ]
  },
  {
    id: "explosion", nameAr: "الانفجار الكبير", category: "نار", trigger: "hit", color: 0xffa23a,
    descriptionAr: "وميض ساطع وموجة صدمة ودخان مع اهتزاز قوي للشاشة. للضربات الكبيرة فقط.",
    sound: { key: "fx-explosion", volume: 1, cooldownMs: 220 },
    layers: [
      flash({ color: 0xfff1b8, radius: 62, life: 220 }),
      ring({ color: 0xffb347, radius: 84, life: 420, width: 7 }),
      burst({ shape: "puff", count: 8, colors: [0x6b5a52, 0x8a7a70, 0xcfc3b8], speed: [40, 120], gravity: -20, life: 700, size: [0.8, 1.4] }),
      burst({ shape: "spark", count: 14, colors: [0xffd27a, 0xff7a1a, 0xffffff], speed: [120, 280], gravity: 140, life: 520, size: [0.4, 0.8], additive: true }),
      shake({ ms: 240, intensity: 0.012 })
    ]
  },
  {
    id: "poison", nameAr: "السم", category: "سموم", trigger: "hit", color: 0x8fe05a,
    descriptionAr: "فقاعات خضراء سامة تتصاعد من الخصم، ويصطبغ جسمه بالأخضر.",
    sound: { key: "fx-poison", volume: 0.75, cooldownMs: 220 },
    layers: [
      tint({ color: 0xa9ec7a, life: 520 }),
      rise({ shape: "bubble", count: 8, colors: [0x8fe05a, 0xc7f58f], speed: [26, 60], life: 850, size: [0.3, 0.75], spreadX: 26 }),
      burst({ shape: "drop", count: 6, colors: [0x6fcf3a], speed: [40, 100], gravity: 200, life: 460, size: [0.3, 0.55] })
    ]
  },
  {
    id: "juice-splat", nameAr: "رذاذ العصارة", category: "طبيعة", trigger: "hit", color: 0xff9e3d,
    descriptionAr: "تتناثر قطرات عصارة ملوّنة عند الاصطدام، مناسب لنباتات الفواكه والخضار.",
    sound: { key: "fx-juice-splat", volume: 0.8, cooldownMs: 90 },
    layers: [
      burst({ shape: "drop", count: 10, colors: [0xff9e3d, 0xffd45b, 0xff6f61], speed: [70, 170], gravity: 360, life: 520, size: [0.35, 0.75], spread: [180, 360] }),
      burst({ shape: "dot", count: 4, colors: [0xffffff], speed: [30, 60], life: 220, size: [0.25, 0.4], additive: true })
    ]
  },
  {
    id: "leaf-burst", nameAr: "تناثر الأوراق", category: "طبيعة", trigger: "hit", color: 0x6fcf5a,
    descriptionAr: "أوراق خضراء تتطاير وتدور في الهواء عند الإصابة.",
    sound: { key: "fx-leaf-burst", volume: 0.7, cooldownMs: 90 },
    layers: [
      burst({ shape: "leaf", count: 9, colors: [0x6fcf5a, 0x4fae45, 0xa6e57a], speed: [60, 150], gravity: 160, life: 700, size: [0.4, 0.8], spread: [200, 340], spin: true })
    ]
  },
  {
    id: "stun-stars", nameAr: "الدوخة", category: "تحكم", trigger: "hit", color: 0xffe066,
    descriptionAr: "نجوم صفراء تدور فوق رأس الخصم كأنه أصيب بدوار.",
    sound: { key: "fx-stun-stars", volume: 0.8, cooldownMs: 400 },
    layers: [
      flash({ color: 0xfff3b0, radius: 22, life: 140 }),
      orbit({ shape: "star", count: 3, radius: 22, height: 50, life: 1000, color: 0xffe066 })
    ]
  },
  {
    id: "slash", nameAr: "ضربة القطع", category: "قتال", trigger: "hit", color: 0xffffff,
    descriptionAr: "قوس أبيض حاد يشق الخصم مع شرر سريع. يناسب المخالب والسيوف والأعواد.",
    sound: { key: "fx-slash", volume: 0.8, cooldownMs: 100 },
    layers: [
      slash({ color: 0xffffff, size: 58, life: 230 }),
      burst({ shape: "spark", count: 5, colors: [0xffffff, 0xcfe9ff], speed: [80, 170], life: 260, size: [0.3, 0.55], additive: true }),
      tint({ color: 0xffffff, life: 90 })
    ]
  },
  {
    id: "heavy-smash", nameAr: "الضربة الساحقة", category: "قتال", trigger: "hit", color: 0xc9a27a,
    descriptionAr: "ضغط الخصم لحظياً مع غبار وموجة صدمة واهتزاز خفيف. للهجمات الثقيلة.",
    sound: { key: "fx-heavy-smash", volume: 0.95, cooldownMs: 160 },
    layers: [
      squash({ sx: 1.22, sy: 0.78, life: 200 }),
      ring({ color: 0xe6cfa8, radius: 52, life: 340, width: 6 }),
      burst({ shape: "puff", count: 6, colors: [0xcdb48f, 0xe6d6b8], speed: [40, 100], gravity: -10, life: 520, size: [0.5, 1], spread: [180, 360] }),
      shake({ ms: 150, intensity: 0.007 })
    ]
  },
  {
    id: "lightning-strike", nameAr: "صاعقة من السماء", category: "كهرباء", trigger: "hit", color: 0xfff27a,
    descriptionAr: "صاعقة تنزل من أعلى الشاشة على الخصم مع وميض أبيض ورعد.",
    sound: { key: "fx-lightning-strike", volume: 1, cooldownMs: 300 },
    layers: [
      bolt({ count: 1, color: 0xfff7b0, height: 420, life: 280, fromTop: true, width: 6 }),
      flash({ color: 0xffffff, radius: 70, life: 200 }),
      burst({ shape: "spark", count: 12, colors: [0xfff27a, 0xffffff], speed: [90, 220], gravity: 90, life: 420, size: [0.4, 0.8], additive: true }),
      tint({ color: 0xfff7b0, life: 200, flicker: true }),
      shake({ ms: 200, intensity: 0.01 })
    ]
  },
  {
    id: "stone-shatter", nameAr: "تحطّم الصخور", category: "قتال", trigger: "hit", color: 0xa89a8a,
    descriptionAr: "شظايا حجرية رمادية تتطاير وتسقط عند الاصطدام. يناسب القذائف الصلبة كالبندق.",
    sound: { key: "fx-stone-shatter", volume: 0.85, cooldownMs: 100 },
    layers: [
      burst({ shape: "shard", count: 9, colors: [0xa89a8a, 0x7d7266, 0xd2c7b8], speed: [70, 170], gravity: 420, life: 560, size: [0.35, 0.75], spread: [190, 350], spin: true }),
      burst({ shape: "puff", count: 3, colors: [0xcfc6ba], speed: [20, 50], life: 420, size: [0.4, 0.7] })
    ]
  },
  {
    id: "magic-sparkle", nameAr: "البريق السحري", category: "سحر", trigger: "hit", color: 0xff9ee8,
    descriptionAr: "نجوم لامعة وردية وصفراء تتصاعد حول الخصم. تأثير جميل وهادئ.",
    sound: { key: "fx-magic-sparkle", volume: 0.7, cooldownMs: 160 },
    layers: [
      rise({ shape: "star", count: 9, colors: [0xff9ee8, 0xffe066, 0xbfa3ff], speed: [28, 70], life: 850, size: [0.3, 0.7], spreadX: 30, additive: true }),
      flash({ color: 0xffd6f6, radius: 26, life: 180 })
    ]
  },
  {
    id: "smoke-puff", nameAr: "سحابة الدخان", category: "عام", trigger: "hit", color: 0xb8b0a8,
    descriptionAr: "نفثة دخان رمادية ناعمة تتصاعد وتتلاشى.",
    sound: { key: "fx-smoke-puff", volume: 0.6, cooldownMs: 160 },
    layers: [
      burst({ shape: "puff", count: 5, colors: [0xb8b0a8, 0xd8d2cc], speed: [20, 60], gravity: -40, life: 700, size: [0.6, 1.1] })
    ]
  },

  // ------------------------------------------------------- عند الإطلاق أو الهجوم
  {
    id: "charge-glow", nameAr: "توهّج الشحن", category: "إطلاق", trigger: "fire", color: 0xfff27a,
    descriptionAr: "هالة مضيئة تتجمّع عند مصدر الإطلاق كأن الطاقة تُشحن قبل الضربة.",
    sound: { key: "fx-charge-glow", volume: 0.6, cooldownMs: 250 },
    layers: [
      flash({ color: 0xfff27a, radius: 36, life: 260 }),
      ring({ color: 0xffe066, radius: 26, life: 260, width: 3, inward: true }),
      burst({ shape: "spark", count: 6, colors: [0xfff27a, 0xffffff], speed: [30, 70], life: 280, size: [0.3, 0.5], additive: true })
    ]
  },
  {
    id: "recoil-pop", nameAr: "ارتداد الإطلاق", category: "إطلاق", trigger: "fire", color: 0xffffff,
    descriptionAr: "ينضغط الجسم ثم يتمدد عند الإطلاق مع نفخة دخان صغيرة، فيبدو الإطلاق قوياً.",
    sound: { key: "fx-recoil-pop", volume: 0.7, cooldownMs: 120 },
    layers: [
      squash({ sx: 0.86, sy: 1.14, life: 140 }),
      burst({ shape: "puff", count: 3, colors: [0xffffff, 0xe6e6e6], speed: [20, 55], life: 320, size: [0.3, 0.6] })
    ]
  },
  {
    id: "muzzle-flare", nameAr: "وميض الفوهة", category: "إطلاق", trigger: "fire", color: 0xffd45b,
    descriptionAr: "ومضة ساطعة وشرر سريع أمام الشخصية لحظة الإطلاق.",
    sound: { key: "fx-muzzle-flare", volume: 0.7, cooldownMs: 100 },
    layers: [
      flash({ color: 0xffe9a8, radius: 30, life: 130 }),
      burst({ shape: "spark", count: 6, colors: [0xffd45b, 0xffffff], speed: [90, 190], life: 240, size: [0.3, 0.55], spread: [-50, 50], additive: true })
    ]
  },

  // ------------------------------------------------------------------ عند الظهور
  {
    id: "dirt-pop", nameAr: "الانبثاق من التراب", category: "ظهور", trigger: "spawn", color: 0x9a6b3f,
    descriptionAr: "ينبثق الكائن من الأرض بحركة قفزة مرنة مع غبار وفتات تراب.",
    sound: { key: "fx-dirt-pop", volume: 0.8, cooldownMs: 120 },
    layers: [
      squash({ sx: 0.8, sy: 1.25, life: 260, from: true }),
      burst({ shape: "puff", count: 5, colors: [0xa07850, 0xc9a37a], speed: [30, 80], gravity: -10, life: 520, size: [0.5, 0.95], spread: [200, 340] }),
      burst({ shape: "crumb", count: 7, colors: [0x7a5230, 0x9a6b3f], speed: [60, 130], gravity: 380, life: 520, size: [0.25, 0.5], spread: [200, 340] })
    ]
  },
  {
    id: "magic-summon", nameAr: "الاستدعاء السحري", category: "ظهور", trigger: "spawn", color: 0xb48cff,
    descriptionAr: "حلقة بنفسجية ونجوم تظهر لحظة الاستدعاء كأن الكائن جاء من عالم آخر.",
    sound: { key: "fx-magic-summon", volume: 0.8, cooldownMs: 200 },
    layers: [
      ring({ color: 0xb48cff, radius: 56, life: 520, width: 5 }),
      flash({ color: 0xe3d3ff, radius: 38, life: 260 }),
      rise({ shape: "star", count: 8, colors: [0xb48cff, 0xffe066, 0xffffff], speed: [30, 80], life: 800, size: [0.3, 0.65], additive: true })
    ]
  },

  // ------------------------------------------------------------ عند تلقّي الضرر
  {
    id: "white-flash", nameAr: "وميض الإصابة", category: "إصابة", trigger: "damaged", color: 0xffffff,
    descriptionAr: "يومض الكائن بالأبيض لحظة إصابته مع شرر صغير. يعطي إحساساً فورياً بالضربة.",
    sound: { key: "fx-white-flash", volume: 0.55, cooldownMs: 80 },
    layers: [
      tint({ color: 0xffffff, life: 90, fill: true }),
      burst({ shape: "spark", count: 4, colors: [0xffffff], speed: [50, 110], life: 220, size: [0.25, 0.45], additive: true })
    ]
  },
  {
    id: "chew-crumbs", nameAr: "فتات الأكل", category: "إصابة", trigger: "damaged", color: 0x9bd85a,
    descriptionAr: "قطع صغيرة من النبتة تتساقط عند قضم الوحش لها مع اهتزاز بسيط.",
    sound: { key: "fx-chew-crumbs", volume: 0.7, cooldownMs: 160 },
    layers: [
      squash({ sx: 1.06, sy: 0.94, life: 110 }),
      burst({ shape: "crumb", count: 6, colors: [0x9bd85a, 0x6fcf5a, 0xe6f2b0], speed: [30, 80], gravity: 340, life: 520, size: [0.25, 0.5], spread: [180, 360] })
    ]
  },

  // ------------------------------------------------------------------- عند الموت
  {
    id: "poof-vanish", nameAr: "الاختفاء بسحابة", category: "موت", trigger: "death", color: 0xf0eee8,
    descriptionAr: "ينفجر الكائن بسحابة دخان بيضاء ونجوم صغيرة، بطريقة كرتونية مناسبة لكل الأعمار.",
    sound: { key: "fx-poof-vanish", volume: 0.8, cooldownMs: 120 },
    layers: [
      flash({ color: 0xffffff, radius: 40, life: 180 }),
      burst({ shape: "puff", count: 7, colors: [0xf0eee8, 0xd8d4cc], speed: [40, 110], gravity: -20, life: 640, size: [0.7, 1.2] }),
      burst({ shape: "star", count: 5, colors: [0xffe066, 0xffffff], speed: [60, 140], gravity: 80, life: 520, size: [0.3, 0.55], additive: true })
    ]
  },
  {
    id: "coin-pop", nameAr: "قفزة العملات", category: "موت", trigger: "death", color: 0xffd23f,
    descriptionAr: "عملات ذهبية تقفز في الهواء وتسقط عند موت الكائن، كمكافأة بصرية.",
    sound: { key: "fx-coin-pop", volume: 0.7, cooldownMs: 120 },
    layers: [
      burst({ shape: "coin", count: 6, colors: [0xffd23f, 0xffe98a], speed: [90, 190], gravity: 560, life: 760, size: [0.35, 0.55], spread: [235, 305] }),
      burst({ shape: "spark", count: 4, colors: [0xffffff], speed: [40, 90], life: 300, size: [0.25, 0.4], additive: true })
    ]
  },

  // --------------------------------------------------------------- بشكل مستمر
  {
    id: "fire-aura", nameAr: "الهالة النارية", category: "هالات", trigger: "aura", color: 0xff7a1a, auraIntervalMs: 900,
    descriptionAr: "ألسنة لهب صغيرة تتصاعد باستمرار حول الكائن، فيبدو مشتعلاً.",
    sound: { key: "fx-fire-aura", volume: 0.3, cooldownMs: 4500 },
    layers: [
      rise({ shape: "flame", count: 3, colors: [0xff7a1a, 0xffc247], speed: [26, 56], life: 700, size: [0.3, 0.6], spreadX: 18, additive: true })
    ]
  },
  {
    id: "frost-aura", nameAr: "الهالة الجليدية", category: "هالات", trigger: "aura", color: 0xbfeaff, auraIntervalMs: 1000,
    descriptionAr: "ندف ثلج وبلورات تتساقط حول الكائن باستمرار فيبدو بارداً.",
    sound: { key: "fx-frost-aura", volume: 0.3, cooldownMs: 5000 },
    layers: [
      rise({ shape: "snow", count: 3, colors: [0xffffff, 0xbfeaff], speed: [14, 34], life: 900, size: [0.25, 0.5], spreadX: 24, down: true })
    ]
  },
  {
    id: "glow-pulse", nameAr: "التوهّج النابض", category: "هالات", trigger: "aura", color: 0xfff08a, auraIntervalMs: 1400,
    descriptionAr: "هالة ضوء ناعمة تنبض حول الكائن كأنه يتنفس طاقة.",
    sound: { key: "fx-glow-pulse", volume: 0.25, cooldownMs: 5500 },
    layers: [
      flash({ color: 0xfff08a, radius: 40, life: 700 }),
      ring({ color: 0xfff08a, radius: 36, life: 700, width: 2 })
    ]
  }
];

// الأيقونات: مولَّدة بالسكربت scripts/generate-effect-icons.mjs وتُحفظ في /assets/vfx-icons.
const EFFECTS = DEFINITIONS.map((definition) => Object.freeze({
  appliesTo: BOTH,
  ...definition,
  iconPath: `/assets/vfx-icons/${definition.id}.svg`,
  soundPath: `/assets/audio/effects/${definition.sound.key.replace(/^fx-/, "")}.ogg`,
  layers: Object.freeze(definition.layers.map((layer) => Object.freeze({ ...layer })))
}));

export const EFFECT_LIBRARY = Object.freeze(EFFECTS);
const BY_ID = new Map(EFFECT_LIBRARY.map((effect) => [effect.id, effect]));

export function getEffect(id) {
  return BY_ID.get(id) || null;
}

export function isKnownEffectId(id) {
  return BY_ID.has(id);
}

export function listEffects({ trigger = null, appliesTo = null } = {}) {
  return EFFECT_LIBRARY.filter((effect) =>
    (!trigger || effect.trigger === trigger) && (!appliesTo || effect.appliesTo.includes(appliesTo)));
}

export function listEffectsByCategory() {
  const groups = new Map();
  for (const effect of EFFECT_LIBRARY) {
    if (!groups.has(effect.category)) groups.set(effect.category, []);
    groups.get(effect.category).push(effect);
  }
  return [...groups.entries()].map(([category, effects]) => ({ category, effects }));
}

/** يحوّل قائمة معرفات خام إلى قائمة نظيفة: معروفة، بلا تكرار، بحد أقصى. */
export function normalizeEffectIds(value, { max = MAX_EFFECTS_PER_ASSET } = {}) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const id of value) {
    if (typeof id !== "string" || !BY_ID.has(id) || out.includes(id)) continue;
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * تأثيرات افتراضية للنباتات الأساسية المدمجة في اللعبة (غير المرفوعة من الاستوديو).
 * تُضاف فوق مؤثراتها القديمة. عدّلها هنا لتغيير شكل النباتات الأساسية.
 */
export const DEFAULT_PLANT_EFFECTS = Object.freeze({
  "electric-mushroom": Object.freeze(["electric-shock"]),
  "snow-thrower": Object.freeze(["freeze"]),
  radish: Object.freeze(["leaf-burst"]),
  mango: Object.freeze(["juice-splat"]),
  hazelnut: Object.freeze(["stone-shatter"]),
  pineapple: Object.freeze(["heavy-smash"])
});

export default EFFECT_LIBRARY;
