"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSavedCoins } from "../game/rules/phaseOneRules.mjs";
import { useLocale, LanguageToggle } from "./LocaleProvider";
import { STAGE_ONE_PLANTS } from "../game/data/stageOnePlants.mjs";
import CatalogThumb from "./components/CatalogThumb";

const MONSTER_CARDS = [
  { id: "cave-brute", icon: "🐾", ar: "الضبع العادي", en: "Cave Brute", roleAr: "الضبع الأساسي", roleEn: "Standard raider", descAr: "يتقدم في مساره ويتوقف لالتهام النبتة التي تعترض طريقه.", descEn: "Advances along its lane and stops to eat plants blocking its path.", statAr: "تحمّل عادي · ٧ ضربات من الفجل", statEn: "Standard durability · 7 radish hits" },
  { id: "dust-skitter", icon: "💨", ar: "ضبع الغبار السريع", en: "Dust Skitter", roleAr: "كشاف سريع وضعيف التحمل", roleEn: "Fast, fragile scout", descAr: "أسرع من الضبع العادي لكنه أقل تحملاً.", descEn: "Faster than the standard hyena, but much less durable.", statAr: "نحو ٥٢٪ من تحمّل الضبع العادي", statEn: "About 52% of standard durability" },
  { id: "stonehide", icon: "🛡️", ar: "ضبع الجلد الحجري", en: "Stonehide", roleAr: "وحش ثقيل ومدرّع", roleEn: "Armored heavy", descAr: "أبطأ ومدرّع ويتطلب ضرراً أكبر لإسقاطه.", descEn: "A slower armored hyena that takes much more damage.", statAr: "٢٫٢ ضعف تحمّل الضبع العادي", statEn: "2.2× standard durability" },
  { id: "alpha-brute", icon: "👑", ar: "الضبع العملاق", en: "Alpha Brute", roleAr: "قائد عملاق نادر", roleEn: "Rare giant leader", descAr: "وحش ضخم يظهر في الموجات المتأخرة ويتمتع بتحمّل استثنائي.", descEn: "A huge late-wave enemy with exceptional durability.", statAr: "١٤ ضربة من الفجل", statEn: "14 radish hits" },
];

const MENU_ITEMS = [
  { id: "plants", icon: "🌱", ar: "النباتات", en: "Plants", href: "/plants", color: "mint" },
  { id: "monsters", icon: "👾", ar: "الوحوش", en: "Monsters", href: "/monsters", color: "violet" },
  { id: "store", icon: "🛍️", ar: "المتجر", en: "Store", href: "/plants", color: "gold" },
  { id: "stages", icon: "🗺️", ar: "المراحل", en: "Campaign", href: "/stages", color: "blue" },
  { id: "farmer", icon: "🧑‍🌾", ar: "المزارع", en: "Farmer", href: "/account", color: "coral" },
  { id: "tasks", icon: "🏆", ar: "المهام", en: "Missions", href: "/how-to-play", color: "pink" },
  { id: "settings", icon: "⚙️", ar: "الإعدادات", en: "Settings", href: "/settings", color: "slate" },
];

export default function HomePage() {
  const [coins, setCoins] = useState(0);
  const [activeMenu, setActiveMenu] = useState(null);
  const { t, locale } = useLocale();
  const arabic = locale === "ar";
  const activeItem = MENU_ITEMS.find((item) => item.id === activeMenu);

  useEffect(() => {
    try { setCoins(loadSavedCoins(window.localStorage)); } catch { setCoins(0); }
  }, []);

  useEffect(() => {
    if (!activeMenu) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setActiveMenu(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeMenu]);

  return (
    <main className="world-home" dir={arabic ? "rtl" : "ltr"}>
      <div className="world-sky" aria-hidden="true" />
      <div className="world-sun" aria-hidden="true" />
      <div className="world-cloud cloud-one" aria-hidden="true" />
      <div className="world-cloud cloud-two" aria-hidden="true" />
      <div className="world-mountains" aria-hidden="true"><i /><i /><i /></div>
      <div className="world-hills" aria-hidden="true"><i /><i /><i /></div>
      <div className="world-river" aria-hidden="true" />
      <div className="world-forest" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <div className="world-ground" aria-hidden="true" />

      <div className="world-battlefield-showcase" aria-hidden="true">
        <img className="world-battlefield-image" src="/assets/backgrounds/farm-battlefield.jpeg" alt="" />
        <div className="world-battlefield-atmosphere" />
        <div className="battlefield-farmer">
          <img src="/assets/characters/farmer/farmer-idle.png" alt="" />
        </div>
        <div className="battlefield-hyena battlefield-hyena-one">
          <img src="/assets/characters/monsters/hyena/hyena-idle.png" alt="" />
        </div>
        <div className="battlefield-hyena battlefield-hyena-two">
          <img src="/assets/characters/monsters/hyena/hyena-idle.png" alt="" />
        </div>
        <div className="battlefield-hyena battlefield-hyena-three">
          <img src="/assets/characters/monsters/hyena/hyena-idle.png" alt="" />
        </div>
        <div className="battlefield-plant battlefield-plant-radish"><img src="/assets/plants/radish.png" alt="" /></div>
        <div className="battlefield-plant battlefield-plant-mushroom"><img src="/assets/plants/mushroom.png" alt="" /></div>
        <div className="battlefield-plant battlefield-plant-radish-small"><img src="/assets/plants/radish.png" alt="" /></div>
        <div className="battlefield-ground-glow" />
      </div>

      <header className="world-topbar">
        <Link className="world-logo" href="/" aria-label="Farm Vs Monsters">🌿 <span>Farm</span><b>Vs</b><span>Monsters</span></Link>
        <div className="world-top-actions">
          <div className="world-wallet"><span>🪙</span><strong>{coins.toLocaleString()}</strong></div>
          <LanguageToggle />
        </div>
      </header>

      <nav className="world-icon-rail" aria-label={arabic ? "القوائم الرئيسية" : "Main menus"}>
        {MENU_ITEMS.map((item) => (
          <button key={item.id} type="button" className={`world-icon-button ${item.color}`} onClick={() => setActiveMenu(item.id)} aria-label={arabic ? item.ar : item.en}>
            <span className="world-icon-art">{item.icon}</span>
            <span className="world-icon-label">{arabic ? item.ar : item.en}</span>
          </button>
        ))}
      </nav>

      <section className="world-hero">
        <div className="world-story-badge">{arabic ? "مغامرة خيالية · عالم المزرعة" : "FANTASY ADVENTURE · FARM WORLD"}</div>
        <h1 className="world-title">Farm <em>Vs</em><br />Monsters</h1>
        <p className="world-tagline">{arabic ? "ازرع، دافع عن مزرعتك، وأنقذ الأميرة!" : "Grow your garden, defend your home, rescue the princess!"}</p>
        <Link className="world-play-button" href="/stages"><span>⚔️</span>{arabic ? "ابدأ المغامرة" : "START ADVENTURE"}<span>➜</span></Link>
        <div className="world-chapter">{arabic ? "الفصل الأول · أرض التنين" : "CHAPTER ONE · DRAGONLAND"}</div>
      </section>

      <div className="world-scene-decor" aria-hidden="true">
        <div className="scene-cottage"><span>🏡</span></div>
        <div className="scene-windmill">🌻</div>
        <div className="scene-fence">⌁　⌁　⌁　⌁　⌁</div>
        <div className="scene-crops"><span>🥕</span><span>🌱</span><span>🥬</span><span>🌻</span><span>🥕</span></div>
      </div>

      <footer className="world-bottom">
        <Link href="/account">{arabic ? "حساب اللاعب" : "PLAYER ACCOUNT"}</Link>
        <span>•</span><Link href="/how-to-play">{arabic ? "طريقة اللعب" : "HOW TO PLAY"}</Link>
        <span>•</span><Link href="/credits">{arabic ? "حول اللعبة" : "ABOUT"}</Link>
      </footer>

      {activeItem && (
        <div className="world-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveMenu(null); }}>
          <section className="world-menu-modal" role="dialog" aria-modal="true" aria-labelledby="world-modal-title">
            <button type="button" className="world-modal-close" onClick={() => setActiveMenu(null)} aria-label={arabic ? "إغلاق" : "Close"}>✕</button>
            <div className={`world-modal-emblem ${activeItem.color}`}>{activeItem.icon}</div>
            <p className="world-modal-kicker">{arabic ? "مملكة المزرعة" : "FARM KINGDOM"}</p>
            <h2 id="world-modal-title">{arabic ? activeItem.ar : activeItem.en}</h2>
            {activeMenu === "plants" ? (
              <>
                <p className="world-modal-description">{arabic ? "النباتات المتاحة والمخططة في المرحلة الأولى." : "Available and planned plants for Stage One."}</p>
                <div className="world-collection-stats">
                  <span>🌿 {STAGE_ONE_PLANTS.filter((plant) => plant.implemented).length} {arabic ? "مفعّل" : "ACTIVE"}</span>
                  <span>🔒 {STAGE_ONE_PLANTS.filter((plant) => !plant.implemented).length} {arabic ? "قادم" : "PLANNED"}</span>
                  <span>🪙 {coins.toLocaleString()}</span>
                </div>
                <div className="world-item-grid">
                  {STAGE_ONE_PLANTS.map((plant) => (
                    <article className={`world-item-card ${plant.implemented ? "is-live" : "is-coming"}`} key={plant.id}>
                      <div className="world-item-art">
                        <CatalogThumb id={plant.id} label={arabic ? plant.nameAr : plant.name} className="world-plant-thumb" />
                        {!plant.implemented && <span className="world-item-lock">🔒</span>}
                      </div>
                      <strong>{arabic ? plant.nameAr : plant.name}</strong>
                      <small>{plant.implemented ? (arabic ? "مفعّل في المعركة" : "ACTIVE IN BATTLE") : (arabic ? "قيد التطوير" : "IN DEVELOPMENT")}</small>
                      <p>{arabic ? plant.descriptionAr : plant.description}</p>
                      <div className="world-item-price">{plant.implemented ? (arabic ? `تكلفة الطاقة: ${plant.energyCost}` : `Energy: ${plant.energyCost}`) : `🪙 ${plant.coinPrice} · ${arabic ? "سعر مقترح" : "PROPOSED"}`}</div>
                    </article>
                  ))}
                </div>
                <div className="world-modal-actions">
                  <Link className={`world-modal-primary ${activeItem.color}`} href="/plants">{arabic ? "تفاصيل موسوعة النباتات" : "FULL PLANT ENCYCLOPEDIA"} <span>➜</span></Link>
                  <button type="button" className="world-modal-secondary" onClick={() => setActiveMenu(null)}>{arabic ? "العودة للعالم" : "BACK TO WORLD"}</button>
                </div>
              </>
            ) : activeMenu === "monsters" ? (
              <>
                <p className="world-modal-description">{arabic ? "تعرف على أفراد جيش التنين وقدراتهم." : "Meet the dragon's troops and their battlefield roles."}</p>
                <div className="world-item-grid world-monster-grid">
                  {MONSTER_CARDS.map((monster) => (
                    <article className="world-item-card is-live" key={monster.id}>
                      <CatalogThumb id={monster.id} label={arabic ? monster.ar : monster.en} className="world-monster-thumb" />
                      <strong>{arabic ? monster.ar : monster.en}</strong>
                      <small>{arabic ? monster.roleAr : monster.roleEn}</small>
                      <p>{arabic ? monster.descAr : monster.descEn}</p>
                      <div className="world-item-price">{arabic ? monster.statAr : monster.statEn}</div>
                    </article>
                  ))}
                </div>
                <div className="world-boss-strip"><CatalogThumb id="dragon" label={arabic ? "التنين الشرير" : "Evil Dragon"} className="world-boss-thumb" /><div><strong>{arabic ? "التنين الشرير · زعيم المرحلة" : "EVIL DRAGON · STAGE BOSS"}</strong><small>{arabic ? "زعيم مستقل يظهر في الموجة الخامسة، ويجب هزيمته لتحرير الأميرة." : "Separate boss in Wave 5. Defeat it to rescue the princess."}</small></div></div>
                <div className="world-modal-actions">
                  <Link className={`world-modal-primary ${activeItem.color}`} href="/monsters">{arabic ? "تفاصيل موسوعة الوحوش" : "FULL MONSTER ENCYCLOPEDIA"} <span>➜</span></Link>
                  <button type="button" className="world-modal-secondary" onClick={() => setActiveMenu(null)}>{arabic ? "العودة للعالم" : "BACK TO WORLD"}</button>
                </div>
              </>
            ) : activeMenu === "store" ? (
              <>
                <p className="world-modal-description">{arabic ? "متجر المملكة يعرض محتوى المرحلة الأولى. لن تُخصم العملات أو تُفتح عناصر قبل تفعيل نظام الشراء فعلياً." : "The kingdom store previews Stage One content. No coins are charged and no items unlock until purchasing is fully implemented."}</p>
                <div className="world-collection-stats">
                  <span>🪙 {coins.toLocaleString()} {arabic ? "رصيدك" : "YOUR BALANCE"}</span>
                  <span>🌱 {STAGE_ONE_PLANTS.filter((plant) => plant.implemented).length} {arabic ? "نباتات مفعّلة" : "ACTIVE PLANTS"}</span>
                  <span>🔒 {STAGE_ONE_PLANTS.filter((plant) => !plant.implemented).length} {arabic ? "قيد التطوير" : "COMING SOON"}</span>
                </div>
                <div className="world-item-grid">
                  {STAGE_ONE_PLANTS.map((plant) => (
                    <article className={`world-item-card ${plant.implemented ? "is-live" : "is-coming"}`} key={plant.id}>
                      <div className="world-item-art"><img src={plant.assetPath} alt={arabic ? plant.nameAr : plant.name} onError={(event) => { event.currentTarget.style.display = "none"; }} />{!plant.implemented && <span className="world-item-lock">🔒</span>}</div>
                      <strong>{arabic ? plant.nameAr : plant.name}</strong>
                      <small>{plant.implemented ? (arabic ? "متاح في المعركة" : "AVAILABLE IN BATTLE") : (arabic ? "قريباً · غير قابل للشراء" : "COMING SOON · NOT FOR SALE")}</small>
                      <p>{arabic ? plant.descriptionAr : plant.description}</p>
                      <div className="world-item-price">{plant.implemented ? (arabic ? "مفعّل · لا يحتاج شراء" : "ACTIVE · NO PURCHASE") : `🪙 ${plant.coinPrice} · ${arabic ? "سعر مقترح فقط" : "PROPOSED PRICE ONLY"}`}</div>
                    </article>
                  ))}
                </div>
                <div className="world-modal-actions">
                  <Link className={`world-modal-primary ${activeItem.color}`} href="/plants">{arabic ? "استعراض النباتات" : "BROWSE PLANTS"} <span>➜</span></Link>
                  <button type="button" className="world-modal-secondary" onClick={() => setActiveMenu(null)}>{arabic ? "العودة للعالم" : "BACK TO WORLD"}</button>
                </div>
              </>
            ) : activeMenu === "farmer" ? (
              <>
                <p className="world-modal-description">{arabic ? "ملف المزارع هو حساب اللاعب الذي يحفظ تقدم المغامرة والعملات والمراحل المفتوحة." : "Your farmer profile is your player account for saving campaign progress, coins and unlocked stages."}</p>
                <div className="world-feature-panel farmer-feature">
                  <div className="world-feature-icon">🧑‍🌾</div>
                  <div><strong>{arabic ? "ملف اللاعب" : "PLAYER PROFILE"}</strong><p>{arabic ? "يمكنك اللعب كضيف وحفظ تقدمك على هذا الجهاز، أو تسجيل الدخول لمزامنته سحابياً." : "Play as a guest and keep progress on this device, or sign in to sync it to the cloud."}</p></div>
                </div>
                <div className="world-modal-actions">
                  <Link className={`world-modal-primary ${activeItem.color}`} href="/account">{arabic ? "فتح حساب اللاعب" : "OPEN PLAYER ACCOUNT"} <span>➜</span></Link>
                  <button type="button" className="world-modal-secondary" onClick={() => setActiveMenu(null)}>{arabic ? "العودة للعالم" : "BACK TO WORLD"}</button>
                </div>
              </>
            ) : activeMenu === "tasks" ? (
              <>
                <p className="world-modal-description">{arabic ? "أهداف حملة المرحلة الأولى. هذه أهداف تقدم وليست مهاماً بمكافآت قابلة للمطالبة." : "Stage One campaign objectives. These track your adventure; they are not claimable reward quests."}</p>
                <div className="world-task-list">
                  <div><span>01</span><strong>{arabic ? "اصمد أمام الموجات الخمس" : "Survive all five waves"}</strong><small>{arabic ? "٣٠ وحشاً عادياً موزعين على الموجات" : "30 regular monsters across the waves"}</small></div>
                  <div><span>02</span><strong>{arabic ? "احمِ نباتات المزرعة" : "Defend the garden"}</strong><small>{arabic ? "ازرع الفجل المدافع واجمع طاقة الفطر" : "Plant Radish Defenders and collect Mushroom energy"}</small></div>
                  <div><span>03</span><strong>{arabic ? "اهزم التنين الشرير" : "Defeat the evil dragon"}</strong><small>{arabic ? "الزعيم مستقل عن عدد الوحوش الثلاثين" : "The boss is separate from the 30 regular enemies"}</small></div>
                  <div><span>04</span><strong>{arabic ? "أنقذ الأميرة وافتح المرحلة التالية" : "Rescue the princess and unlock the next stage"}</strong><small>{arabic ? "لا يكتمل الفوز قبل هزيمة التنين وإنقاذها" : "Victory requires defeating the dragon and rescuing her"}</small></div>
                </div>
                <div className="world-modal-actions">
                  <Link className={`world-modal-primary ${activeItem.color}`} href="/stage/1">{arabic ? "تفاصيل المرحلة الأولى" : "STAGE ONE BRIEFING"} <span>➜</span></Link>
                  <button type="button" className="world-modal-secondary" onClick={() => setActiveMenu(null)}>{arabic ? "العودة للعالم" : "BACK TO WORLD"}</button>
                </div>
              </>
            ) : activeMenu === "settings" ? (
              <>
                <p className="world-modal-description">{arabic ? "اضبط أصوات اللعبة واختر لغة الواجهة. يتم حفظ إعدادات الصوت محلياً في هذا المتصفح." : "Adjust game audio and choose the interface language. Audio preferences are saved locally in this browser."}</p>
                <div className="world-feature-panel settings-feature">
                  <div className="world-feature-icon">🔊</div>
                  <div><strong>{arabic ? "إعدادات الصوت" : "AUDIO PREFERENCES"}</strong><p>{arabic ? "تحكم منفصل بالموسيقى والمؤثرات وأصوات المقذوفات." : "Separate controls for music, sound effects and projectile sounds."}</p></div>
                </div>
                <div className="world-feature-panel settings-feature">
                  <div className="world-feature-icon">🌐</div>
                  <div><strong>{arabic ? "لغة اللعبة" : "GAME LANGUAGE"}</strong><p>{arabic ? "استخدم زر اللغة في الشريط العلوي للتبديل بين العربية والإنجليزية." : "Use the language switch in the top bar to switch between Arabic and English."}</p></div>
                </div>
                <div className="world-modal-actions">
                  <Link className={`world-modal-primary ${activeItem.color}`} href="/settings">{arabic ? "فتح إعدادات الصوت" : "OPEN AUDIO SETTINGS"} <span>➜</span></Link>
                  <button type="button" className="world-modal-secondary" onClick={() => setActiveMenu(null)}>{arabic ? "العودة للعالم" : "BACK TO WORLD"}</button>
                </div>
              </>
            ) : (
              <>
                <p className="world-modal-description">{arabic ? "افتح هذا القسم لمتابعة مغامرتك." : "Open this section to continue your adventure."}</p>
                <div className="world-modal-actions">
                  <Link className={`world-modal-primary ${activeItem.color}`} href={activeItem.href}>{arabic ? "فتح القائمة" : "OPEN MENU"} <span>➜</span></Link>
                  <button type="button" className="world-modal-secondary" onClick={() => setActiveMenu(null)}>{arabic ? "العودة للعالم" : "BACK TO WORLD"}</button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
