"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { readStorageSnapshot, subscribeToBrowserStorage } from "../game/hooks/browserStorage.mjs";

const translations = {
  "A PRIMITIVE 2D FARM DEFENSE ADVENTURE": "مغامرة بدائية للدفاع عن المزرعة",
  "The tribe's garden is the last wall between the monsters and the cave home.": "حديقة القبيلة هي خط الدفاع الأخير بين الوحوش وموطن الكهف.",
  "Plant Radish defenders, grow Energy Mushrooms to collect resources, and protect the princess.": "ازرع الفجل المدافع، وأنمُ فطر الطاقة لجمع الموارد، واحمِ الأميرة.",
  "When the final radish falls, the caveman takes up his wooden club.": "عندما تسقط آخر نبتة فجل، يحمل رجل الكهف هراوته الخشبية.",
  "Saved player balance": "رصيد اللاعب المحفوظ", "COINS": "عملة", "GAME PREFERENCES": "تفضيلات اللعبة", "Saved coins": "العملات المحفوظة",
  "New Game": "لعبة جديدة", "How to Play": "طريقة اللعب", "Settings": "الإعدادات", "Credits": "حقوق اللعبة",
  "5 WAVES": "٥ موجات", "100 MONSTERS": "١٠٠ وحش", "1 FARM TO DEFEND": "مزرعة واحدة للدفاع عنها",
  "A hand-drawn prehistoric world of roots, stone, timber, and wild creatures.": "عالم بدائي مرسوم يدوياً، مليء بالجذور والحجارة والأخشاب والمخلوقات البرية.",
  "Choose Radish or Mushroom · Click a soil plot to plant · Collect glowing Mushroom energy · WASD / arrows to move · SPACE: emergency club": "اختر الفجل أو الفطر · انقر على تربة فارغة للزراعة · اجمع طاقة الفطر المتوهجة · تحرّك باستخدام WASD أو الأسهم · المسافة: الهراوة للطوارئ",
  "Stone age battle arena": "ساحة معركة العصر الحجري",
  "A prehistoric farm-defense battle. Gather mushroom energy, raise living defenders, and keep the tribe's home safe.": "معركة للدفاع عن مزرعة بدائية. اجمع طاقة الفطر، وازرع المدافعين، واحمِ موطن القبيلة.",
  "GAME PREFERENCES": "تفضيلات اللعبة", "Background music": "موسيقى الخلفية", "Sound effects": "المؤثرات الصوتية",
  "Projectile sounds": "أصوات المقذوفات",
  "Adjust each sound channel independently. Changes are saved in this browser and will be used when the next battle starts.": "اضبط مستوى كل قناة صوتية بشكل مستقل. تُحفظ التغييرات في هذا المتصفح وتُطبّق عند بدء المعركة التالية.",
  "Set a slider to 0% to mute that channel. These preferences use the same browser storage keys as the battle audio controls.": "اضبط شريط الصوت على 0% لكتم القناة. تستخدم هذه التفضيلات مفاتيح التخزين نفسها الخاصة بإعدادات صوت المعركة.",
  "Return to Battle": "العودة إلى المعركة", "Main Menu": "القائمة الرئيسية",
  "FIELD GUIDE": "دليل الميدان", "Defend the farmhouse and princess through five increasingly difficult monster waves. The first campaign contains 100 monsters across five waves: 10, 15, 20, 25, and 30 monsters.": "دافع عن المزرعة والأميرة خلال خمس موجات تزداد صعوبة. تضم الحملة الأولى ١٠٠ وحش موزعين على خمس موجات: ١٠، ١٥، ٢٠، ٢٥، و٣٠ وحشاً.",
  "1. Choose your plant": "١. اختر نبتتك", "2. Plant and collect": "٢. ازرع واجمع الموارد", "3. Protect the farmhouse": "٣. احمِ المزرعة",
  "4. Emergency club combat": "٤. القتال بالهراوة في الطوارئ", "Controls": "أدوات التحكم",
  "Select the Radish card (35 energy) to plant an automatic lane defender, or the Energy Mushroom card (50 energy) to grow a resource producer. You begin with 150 energy, and each defeated monster rewards you with 8 coins.": "اختر بطاقة الفجل (٣٥ طاقة) لزراعة مدافع يهاجم الوحوش تلقائياً في مساره، أو بطاقة فطر الطاقة (٥٠ طاقة) لإنتاج الموارد. تبدأ بـ١٥٠ طاقة، ويمنحك كل وحش مهزوم ٨ عملات.",
  "Choose an empty soil cell. The caveman runs there, plants your selected seed, and returns to his original position. The used seed packet then recharges before it can be planted again; stronger plants take longer to recharge. Radishes stay rooted and automatically attack monsters. Every Energy Mushroom produces a 15-energy collectible every 12 seconds. Click the glowing mushroom pickup to collect it within 12 seconds before it disappears. If your energy is already full, the pickup cannot add more. Energy is capped at 300.": "اختر خلية ترابية فارغة. يركض رجل الكهف إليها ويزرع البذرة المختارة ثم يعود إلى مكانه. بعد الزراعة، تحتاج بطاقة البذور إلى إعادة الشحن قبل استخدامها مجدداً، وتستغرق النباتات الأقوى وقتاً أطول. تبقى نباتات الفجل في الأرض وتهاجم الوحوش تلقائياً. ينتج كل فطر طاقة قابلة للجمع بقيمة ١٥ نقطة كل ١٢ ثانية. انقر على الفطر المتوهج خلال ١٢ ثانية قبل اختفائه. إذا امتلأت الطاقة فلن يضيف الجمع المزيد. الحد الأقصى للطاقة ٣٠٠.",
  "Monsters stop to eat plants blocking their lane. If they break through, they attack the farmhouse over time. The battle is lost only when farmhouse health reaches zero.": "تتوقف الوحوش لالتهام النباتات التي تسد طريقها. وإذا تجاوزتها، تهاجم المزرعة تدريجياً. تخسر المعركة فقط عندما تصل صحة المزرعة إلى الصفر.",
  "If every defensive plant is destroyed, the caveman can use his club. Planting a new defender successfully ends emergency combat immediately.": "إذا دُمّرت جميع النباتات الدفاعية، يستطيع رجل الكهف استخدام هراوته. وتنتهي حالة القتال الطارئ فور نجاحك في زراعة مدافع جديد.",
  "W A S D or Arrow keys: move the caveman.": "W A S D أو مفاتيح الأسهم: تحريك رجل الكهف.",
  "Space: use the club when emergency combat is active.": "مفتاح المسافة: استخدام الهراوة عند تفعيل القتال الطارئ.",
  "P: pause or open the pause menu.": "P: إيقاف اللعبة مؤقتاً أو فتح قائمة الإيقاف.",
  "Mouse: select Radish or Energy Mushroom, then plant in an empty cell; click produced mushroom energy to collect it.": "الفأرة: اختر الفجل أو فطر الطاقة ثم ازرع في خلية فارغة؛ وانقر على طاقة الفطر الناتجة لجمعها.",
  "Start Game": "ابدأ اللعب", "THE PEOPLE AND TOOLS BEHIND THE FARM": "الأشخاص والأدوات وراء اللعبة",
  "Farm Vs Monsters is an independent game project built around a hand-drawn prehistoric farm-defense adventure.": "Farm Vs Monsters مشروع لعبة مستقل تدور أحداثه في مغامرة مرسومة يدوياً للدفاع عن مزرعة في عصور ما قبل التاريخ.",
  "Game project": "مشروع اللعبة", "Title:": "العنوان:", "Design and development:": "التصميم والتطوير:",
  "Technology": "التقنيات", "Phaser 3 — 2D game framework": "Phaser 3 — إطار ألعاب ثنائية الأبعاد",
  "Next.js and React — web application and menus": "Next.js وReact — تطبيق الويب والقوائم",
  "Art, sound, and contributors": "الرسومات والصوت والمساهمون",
  "Visual assets, animation, sound, and additional contributor credits will be listed here as the final production assets and contributors are approved.": "ستُدرج هنا اعتمادات الرسومات والرسوم المتحركة والأصوات والمساهمين الإضافيين بعد اعتماد أصول الإنتاج النهائية.",
  "Play Game": "العب", "Preparing the farm...": "جارٍ تجهيز المزرعة...",
  "Loading the battlefield and getting the tribe ready.": "جارٍ تحميل ساحة المعركة وتجهيز القبيلة.",
  "The battle could not be started": "تعذّر بدء المعركة", "The game engine failed to initialize.": "تعذّر تشغيل محرك اللعبة.",
  "Try Again": "حاول مجدداً", "Farm Vs Monsters playable battle": "معركة لعبة المزرعة ضد الوحوش", "Retry": "إعادة المحاولة", "Back to Main Menu": "العودة إلى القائمة الرئيسية",

  "The caveman must finish his current action before moving again.": "يجب أن ينهي رجل الكهف حركته الحالية قبل أن يتحرك مجدداً.",
  "Choose a plant card first.": "اختر بطاقة نبتة أولاً.",
  "Choose a plant card first": "اختر بطاقة نبتة أولاً.",
  "The caveman is walking to the selected soil cell...": "رجل الكهف يتجه إلى خلية التربة المختارة...",
  "The caveman is back at his starting position.": "عاد رجل الكهف إلى نقطة انطلاقه.",
  "Planting cancelled: this cell is no longer available.": "أُلغيت الزراعة: هذه الخلية لم تعد متاحة.",
  "Energy is full. Defeat monsters or spend energy before collecting more.": "الطاقة ممتلئة. اهزم الوحوش أو أنفق بعض الطاقة قبل جمع المزيد.",
  "A Monster 01 has joined the raid: quick, but easier to bring down.": "انضم الوحش 01 إلى الهجوم: سريع لكنه أسهل في الهزيمة.",
  "A Monster 01 is approaching: slow, heavily plated, and tough to stop.": "الوحش 01 يقترب: بطيء ومدرع بشدة ويصعب إيقافه.",
  "EMERGENCY! The last radish has fallen. Move close and press SPACE to swing the club.": "طوارئ! سقطت آخر نبتة فجل. اقترب واضغط المسافة لضرب الوحش بالهراوة.",
  "RADISH": "الفجل", "MUSHROOM": "الفطر", "Music": "الموسيقى", "Effects": "المؤثرات", "Projectiles": "المقذوفات",
  "Choose Radish to defend or Mushroom to produce energy, then click an empty soil cell.": "اختر الفجل للدفاع أو الفطر لإنتاج الطاقة، ثم انقر على خلية ترابية فارغة.",
  "Temporary farm art active. Choose Radish or Mushroom, then click an empty soil cell.": "تم تفعيل الرسومات البديلة للمزرعة. اختر الفجل أو الفطر ثم انقر على خلية ترابية فارغة.",
  "Radish chosen. Select an empty soil plot to defend the lane.": "اخترت الفجل. حدد مساحة ترابية فارغة للدفاع عن المسار.",
  "Mushroom chosen. Select an empty soil plot to produce energy.": "اخترت الفطر. حدد مساحة ترابية فارغة لإنتاج الطاقة.",
   "Radish": "الفجل", "Energy Mushroom": "فطر الطاقة", "TRIBE SOUND": "أصوات القبيلة", "ENERGY": "الطاقة",
  "BATTLE PAUSED": "المعركة متوقفة مؤقتاً", "RESUME": "متابعة", "RESTART": "إعادة البدء", "SETTINGS": "الإعدادات", "MAIN MENU": "القائمة الرئيسية",
  "ENERGY": "الطاقة", "HOME": "الرئيسية", "RADISHES": "الفجل", "KILLS": "المهزومون", "WAVE": "الموجة", "DOWN": "هُزم", "LAST STAND": "المواجهة الأخيرة",
  "Radish planted! The caveman is sprinting back behind the final line.": "تمت زراعة الفجل! رجل الكهف يركض عائداً إلى خط الدفاع الأخير.",
  "Energy Mushroom planted! It will produce collectible energy.": "تمت زراعة فطر الطاقة! سينتج طاقة قابلة للجمع.",
  "Plant uprooted. Its full energy cost was refunded; choose any empty soil cell to replant.": "تم اقتلاع النبتة وإعادة كامل تكلفتها من الطاقة. اختر خلية ترابية فارغة لإعادة الزراعة.",
  "An energy mushroom has been eaten!": "الوحوش التهمت فطر الطاقة!", "A radish defender has fallen!": "سقط أحد نباتات الفجل المدافعة!",
  "The radishes are alive and defending. The caveman cannot fight yet.": "نباتات الفجل ما زالت تدافع. لا يستطيع رجل الكهف القتال الآن.",
  "Plant a radish first. The caveman's club is an emergency defense only.": "ازرع الفجل أولاً. هراوة رجل الكهف مخصصة للدفاع في حالات الطوارئ فقط.",
  "Club hit!": "ضربة بالهراوة!", "No monster is close enough for the club.": "لا يوجد وحش قريب بما يكفي لضربه بالهراوة.",
  "VICTORY! The farm is safe.": "انتصار! المزرعة أصبحت آمنة.", "GAME OVER — The monsters reached the final line.": "انتهت اللعبة — وصلت الوحوش إلى خط الدفاع الأخير.",
  "FARM LOST": "خسرت المزرعة", "VICTORY!": "انتصار!", "PLAY AGAIN": "العب مجدداً", "RETRY": "إعادة المحاولة", "CAMPAIGN MAP": "خريطة المراحل",
  "All 5 waves cleared": "تم اجتياز الموجات الخمس", "The caveman is walking to the selected soil cell...": "رجل الكهف يتجه إلى خلية التربة المختارة...",
  "The caveman is back at his starting position.": "عاد رجل الكهف إلى نقطة انطلاقه.",
  "A new radish is planted. The caveman stops fighting; the plant defends again.": "تمت زراعة فجل جديد. يتوقف رجل الكهف عن القتال وتعود النبتة للدفاع.",
  "This seed packet is recharging. Wait for it to recover.": "بطاقة البذور قيد إعادة الشحن. انتظر حتى تصبح جاهزة مجدداً.",
  "Prepare your seed packets before entering the battlefield": "جهّز بطاقات البذور قبل دخول ساحة المعركة",
  "BEFORE THE BATTLE": "قبل المعركة",
  "Choose your seed packets": "اختر بطاقات البذور",
  "Build your battle loadout. You can bring up to six plants, and your two starter packets must stay selected.": "جهّز تشكيلتك للمعركة. يمكنك اصطحاب ست نباتات كحد أقصى، ويجب إبقاء بطاقتي البداية ضمن التشكيلة.",
  "YOUR SEED BANK": "بطاقات البذور المختارة",
  "Selected": "محدد",
  "Not selected": "غير محدد",
  "STARTER": "أساسية",
  "Unlock through campaign": "تُفتح عبر الحملة",
  "Tip: bring an attacker, an energy producer, and a mix of support plants.": "نصيحة: اصطحب نباتاً مهاجماً، ونباتاً لإنتاج الطاقة، ومجموعة من نباتات الدعم.",
  "Enter the battlefield": "ادخل ساحة المعركة",
  "Could not save your loadout. Check browser storage and try again.": "تعذر حفظ تشكيلتك. تحقق من مساحة التخزين في المتصفح وحاول مجدداً.",
  "Choose a plant card · Click an empty soil plot to plant · Collect Mushroom energy": "اختر بطاقة نبات · انقر على تربة فارغة للزراعة · اجمع طاقة الفطر",
  "Choose a plant card · Click an empty soil plot to plant · Collect glowing Mushroom energy · WASD / arrows to move · SPACE: emergency club": "اختر بطاقة نبات · انقر على تربة فارغة للزراعة · اجمع طاقة الفطر · تحرك باستخدام WASD أو الأسهم · المسافة: الهراوة للطوارئ"

};

export function translate(value, locale = "ar") {
  if (locale !== "ar" || typeof value !== "string") return value;
  if (value.endsWith(" ENERGY") && Number.isFinite(Number(value.slice(0, -7)))) return value.slice(0, -7) + " طاقة";
  if (value.startsWith("Collected ") && value.endsWith(" mushroom energy!")) {
    return "جمعت " + value.slice(10, -" mushroom energy!".length) + " من طاقة الفطر!";
  }
  if (value.startsWith("Wave ") && value.includes(" cleared. Wave ")) {
    const match = value.match(/^Wave (\d+) cleared\. Wave (\d+) is gathering: (\d+) monsters incoming\.$/);
    if (match) return "اكتملت الموجة " + match[1] + ". الموجة " + match[2] + " قادمة وبها " + match[3] + " وحشاً.";
  }
  if (value.startsWith("Not enough energy to plant ")) return value.includes("Mushroom") ? "الطاقة غير كافية لزراعة فطر الطاقة." : "الطاقة غير كافية لزراعة الفجل.";
  if (value.startsWith("The battle is lost") ) return "انتهت المعركة بخسارة المزرعة.";
  return translations[value] || value;
}
const LocaleContext = createContext({ locale: "ar", setLocale: () => {}, t: (v) => translate(v, "ar") });

export function LocaleProvider({ children }) {
  const locale = useSyncExternalStore(
    subscribeToBrowserStorage,
    () => readStorageSnapshot("farmVsMonsters.language", "ar") === "en" ? "en" : "ar",
    () => "ar"
  );
  useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"; }, [locale]);
  const setLocale = (next) => {
    window.localStorage.setItem("farmVsMonsters.language", next);
    window.dispatchEvent(new CustomEvent("farm-language-change", { detail: next }));
  };
  const value = useMemo(() => ({ locale, setLocale, t: (v) => translate(v, locale) }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <button type="button" className="language-toggle" onClick={() => setLocale(locale === "ar" ? "en" : "ar")} aria-label={locale === "ar" ? "Switch language to English" : "تغيير اللغة إلى العربية"}>
      {locale === "ar" ? "English" : "العربية"}
    </button>
  );
}
