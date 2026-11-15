"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSavedCoins } from "../game/rules/phaseOneRules.mjs";
import { useLocale, LanguageToggle } from "./LocaleProvider";
import { STAGE_ONE_PLANTS } from "../game/data/stageOnePlants.mjs";

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
                        <img src={plant.assetPath} alt={arabic ? plant.nameAr : plant.name} onError={(event) => { event.currentTarget.style.display = "none"; }} />
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
                      <div className="world-monster-art">{monster.icon}</div>
                      <strong>{arabic ? monster.ar : monster.en}</strong>
                      <small>{arabic ? monster.roleAr : monster.roleEn}</small>
                      <p>{arabic ? monster.descAr : monster.descEn}</p>
                      <div className="world-item-price">{arabic ? monster.statAr : monster.statEn}</div>
                    </article>
                  ))}
                </div>
                <div className="world-boss-strip"><span>🐉</span><div><strong>{arabic ? "التنين الشرير · زعيم المرحلة" : "EVIL DRAGON · STAGE BOSS"}</strong><small>{arabic ? "زعيم مستقل يظهر في الموجة الخامسة، ويجب هزيمته لتحرير الأميرة." : "Separate boss in Wave 5. Defeat it to rescue the princess."}</small></div></div>
                <div className="world-modal-actions">
                  <Link className={`world-modal-primary ${activeItem.color}`} href="/monsters">{arabic ? "تفاصيل موسوعة الوحوش" : "FULL MONSTER ENCYCLOPEDIA"} <span>➜</span></Link>
                  <button type="button" className="world-modal-secondary" onClick={() => setActiveMenu(null)}>{arabic ? "العودة للعالم" : "BACK TO WORLD"}</button>
                </div>
              </>
            ) : (
              <>
                <p className="world-modal-description">{arabic ? "استكشف هذا القسم واكتشف محتوياته ومكافآته." : "Explore this section and discover its contents and rewards."}</p>
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
