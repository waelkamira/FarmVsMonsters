"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadSavedCoins } from "../game/rules/phaseOneRules.mjs";
import { useLocale, LanguageToggle } from "./LocaleProvider";

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
            <p className="world-modal-description">{arabic ? "استكشف هذا القسم واكتشف محتوياته ومكافآته." : "Explore this section and discover its contents and rewards."}</p>
            <div className="world-modal-actions">
              <Link className={`world-modal-primary ${activeItem.color}`} href={activeItem.href}>{arabic ? "فتح القائمة" : "OPEN MENU"} <span>➜</span></Link>
              <button type="button" className="world-modal-secondary" onClick={() => setActiveMenu(null)}>{arabic ? "العودة للعالم" : "BACK TO WORLD"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
