"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, LanguageToggle } from "./LocaleProvider";
import { getPlayerSession, restoreOrInitializeCloudProgress } from "../game/services/playerAccount.mjs";
import { loadSavedCoins } from "../game/rules/phaseOneRules.mjs";
import { getBrowserStorage } from "../game/services/browserStorage.mjs";

export default function HomePage() {
  const { locale } = useLocale();
  const arabic = locale === "ar";
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [savedCoins, setSavedCoins] = useState(0);

  useEffect(() => {
    const refreshSavedCoins = () => {
      try {
        setSavedCoins(loadSavedCoins(getBrowserStorage(window)));
      } catch {
        setSavedCoins(0);
      }
    };
    refreshSavedCoins();
    window.addEventListener("focus", refreshSavedCoins);
    window.addEventListener("storage", refreshSavedCoins);
    return () => {
      window.removeEventListener("focus", refreshSavedCoins);
      window.removeEventListener("storage", refreshSavedCoins);
    };
  }, []);

  async function startAdventure() {
    if (starting) return;
    setStarting(true);
    try {
      const session = await getPlayerSession();
      if (session.user) {
        const { progress } = await restoreOrInitializeCloudProgress();
        const lastUnlockedStage = Math.min(2, Math.max(1, Number(progress?.unlockedStage) || 1));
        router.push(lastUnlockedStage === 2 ? "/stage/2" : "/game");
        return;
      }
    } catch {
      // Account service may be unavailable; keep guest play immediately accessible.
    }
    router.push("/game");
  }

  return (
    <main className="world-home" dir={arabic ? "rtl" : "ltr"}>
      <div className="world-battlefield-showcase" aria-hidden="true">
        <img className="world-battlefield-image" src="/assets/backgrounds/farm-battlefield.jpeg" alt="" />
        <div className="world-battlefield-atmosphere" />
        <div className="battlefield-farmer"><img src="/assets/characters/farmer/farmer-idle.png" alt="" /></div>
        <div className="battlefield-hyena battlefield-hyena-one"><img src="/assets/characters/monsters/hyena/hyena-idle.png" alt="" /></div>
        <div className="battlefield-hyena battlefield-hyena-two"><img src="/assets/characters/monsters/hyena/hyena-idle.png" alt="" /></div>
        <div className="battlefield-hyena battlefield-hyena-three"><img src="/assets/characters/monsters/hyena/hyena-idle.png" alt="" /></div>
        <div className="battlefield-plant battlefield-plant-radish"><img src="/assets/plants/radish.png" alt="" /></div>
        <div className="battlefield-plant battlefield-plant-mushroom"><img src="/assets/plants/mushroom.png" alt="" /></div>
        <div className="battlefield-plant battlefield-plant-radish-small"><img src="/assets/plants/radish.png" alt="" /></div>
        <div className="battlefield-ground-glow" />
      </div>

      <div className="home-language-control"><LanguageToggle /></div>

      <section className="farm-main-menu" aria-label={arabic ? "القائمة الرئيسية" : "Main menu"}>
        <div className="farm-menu-brand">
          <span className="farm-menu-brand-mark">🌱</span>
          <div>
            <div className="farm-menu-kicker">{arabic ? "مغامرة الدفاع عن المزرعة" : "THE FARM DEFENSE ADVENTURE"}</div>
            <h1 className="home-game-title">Farm <span>Vs</span> Monsters</h1>
            <p className="home-game-tagline">{arabic ? "ازرع جيشك، احمِ مزرعتك، وأنقذ الأميرة!" : "Grow your army. Defend your farm. Rescue the princess!"}</p>
          </div>
        </div>
        <div className="farm-menu-wallet" aria-label={arabic ? "رصيد اللاعب المحفوظ" : "Saved player balance"}>
          <span aria-hidden="true">🪙</span>
          <strong>{savedCoins}</strong>
          <small>{arabic ? "عملات محفوظة" : "Saved coins"}</small>
        </div>
        <div className="farm-menu-actions">
          <button className="farm-menu-play" type="button" onClick={startAdventure} disabled={starting}>
            <span className="farm-menu-action-icon">⚔️</span>
            <span><strong>{starting ? (arabic ? "جارٍ التحضير..." : "PREPARING...") : (arabic ? "مغامرة" : "ADVENTURE")}</strong><small>{arabic ? "تابع رحلتك في مواجهة الوحوش" : "Continue your fight against the monsters"}</small></span>
            <b>➜</b>
          </button>
          <Link className="farm-menu-option" href="/stages"><span>🗺️</span><strong>{arabic ? "خريطة العوالم" : "WORLD MAP"}</strong><small>{arabic ? "اختر مرحلتك التالية" : "Choose your next stage"}</small></Link>
          <Link className="farm-menu-option" href="/plants"><span>🌿</span><strong>{arabic ? "موسوعة النباتات" : "PLANT ALMANAC"}</strong><small>{arabic ? "تعرف على المدافعين" : "Meet your defenders"}</small></Link>
          <Link className="farm-menu-option" href="/monsters"><span>👾</span><strong>{arabic ? "دليل الوحوش" : "MONSTER ALMANAC"}</strong><small>{arabic ? "تعرف على أعدائك" : "Know your enemies"}</small></Link>
          <Link className="farm-menu-option" href="/settings"><span>⚙️</span><strong>{arabic ? "الإعدادات" : "OPTIONS"}</strong><small>{arabic ? "الصوت واللغة" : "Sound and language"}</small></Link>
          <Link className="farm-menu-option" href="/account"><span>👤</span><strong>{arabic ? "حساب اللاعب" : "PLAYER ACCOUNT"}</strong><small>{arabic ? "الحساب اختياري" : "Account optional"}</small></Link>
        </div>
        <div className="farm-menu-footer"><span>🌻 {arabic ? "كل حديقة لها أبطالها" : "EVERY GARDEN HAS ITS HEROES"}</span><span>{arabic ? "اختر وجهتك وابدأ المغامرة" : "PICK YOUR PATH AND PLAY"}</span><span>{arabic ? "الحساب اختياري — العب كضيف" : "Account optional — play as guest"}</span></div>
      </section>
    </main>
  );
}
