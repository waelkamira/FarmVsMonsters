"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, LanguageToggle } from "./LocaleProvider";
import { getPlayerSession, restoreOrInitializeCloudProgress } from "../game/services/playerAccount.mjs";

const destinations = [
  { href: "/stages", icon: "🗺️", en: "WORLD MAP", ar: "خريطة العوالم", subEn: "Explore the campaign", subAr: "استكشف رحلة الحملة", tone: "leaf" },
  { href: "/plants", icon: "🌱", en: "PLANT INVENTORY", ar: "موسوعة النباتات", subEn: "Your garden defenders", subAr: "المدافعون عن حديقتك", tone: "sun" },
  { href: "/monsters", icon: "🐾", en: "ENEMY BESTIARY", ar: "موسوعة الوحوش", subEn: "Know your enemies", subAr: "اكتشف خصومك", tone: "stone" },
  { href: "/settings", icon: "⚙️", en: "OPTIONS", ar: "الإعدادات", subEn: "Sound and language", subAr: "الصوت واللغة", tone: "wood" }
];

export default function HomePage() {
  const { locale } = useLocale();
  const arabic = locale === "ar";
  const router = useRouter();
  const [starting, setStarting] = useState(false);

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
      // Guest play remains available if the account service is offline.
    }
    router.push("/game");
  }

  return (
    <main className="world-home codex-home" dir={arabic ? "rtl" : "ltr"}>
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

      <div className="codex-home-topbar">
        <div className="codex-home-brand"><img className="farm-game-logo farm-game-logo-home" src="/assets/items/ui/logo.png" alt="Farm Vs Monsters" /></div>
        <div className="codex-home-top-actions"><span className="codex-world-label">{arabic ? "موسم المغامرة الأولى" : "SEASON ONE · THE FIRST GARDEN"}</span><LanguageToggle /></div>
      </div>

      <section className="codex-home-layout">
        <div className="codex-home-story">
          <span className="codex-ribbon">{arabic ? "مغامرة الدفاع عن المزرعة" : "THE FARM DEFENSE ADVENTURE"}</span>
          <h1>{arabic ? <>ازرع جيشك،<br/><em>واحْمِ المزرعة!</em></> : <>Grow your army.<br/><em>Defend your farm.</em></>}</h1>
          <p>{arabic ? "الوحوش تقترب من موطن القبيلة. اجمع نباتاتك، جهّز دفاعاتك، وانطلق في رحلة إنقاذ الأميرة." : "Monsters are closing in on the tribe's home. Gather your plants, prepare your defenses, and begin the rescue campaign."}</p>
          <button className="codex-adventure-button" type="button" onClick={startAdventure} disabled={starting}>
            <span className="codex-adventure-icon">⚔️</span>
            <span><strong>{starting ? (arabic ? "جارٍ تجهيز المغامرة..." : "PREPARING ADVENTURE...") : (arabic ? "ابدأ المغامرة" : "START ADVENTURE")}</strong><small>{arabic ? "تابع رحلتك في مواجهة الوحوش" : "Enter the battlefield"}</small></span>
            <b aria-hidden="true">➜</b>
          </button>
          <div className="codex-home-note"><span>🌻</span>{arabic ? "كل حديقة لها أبطالها" : "EVERY GARDEN HAS ITS HEROES"}</div>
        </div>

        <div className="codex-home-boards">
          <section className="codex-board codex-destinations-board">
            <header className="codex-board-heading"><span>🍃</span><div><small>{arabic ? "دفتر المغامرة" : "YOUR ADVENTURE JOURNAL"}</small><h2>{arabic ? "استكشف عالمك" : "EXPLORE YOUR WORLD"}</h2></div></header>
            <div className="codex-destination-grid">
              {destinations.map((item) => <Link href={item.href} className={`codex-destination-card tone-${item.tone}`} key={item.href}>
                <span className="codex-destination-icon">{item.icon}</span>
                <span className="codex-destination-copy"><strong>{arabic ? item.ar : item.en}</strong><small>{arabic ? item.subAr : item.subEn}</small></span>
                <b className="codex-destination-arrow">›</b>
              </Link>)}
            </div>
          </section>
          <section className="codex-home-utility-row">
            <Link href="/how-to-play" className="codex-utility-card"><span>📜</span><strong>{arabic ? "دليل اللعب" : "FIELD GUIDE"}</strong><small>{arabic ? "تعلم أساسيات الدفاع" : "Learn the basics"}</small></Link>
            <Link href="/account" className="codex-utility-card"><span>☁️</span><strong>{arabic ? "الحساب والحفظ" : "ACCOUNT & SAVE"}</strong><small>{arabic ? "حفظ تقدمك" : "Keep your progress"}</small></Link>
          </section>
        </div>
      </section>
      <footer className="codex-home-footer"><span>FARM VS MONSTERS</span><span>{arabic ? "ازرع · دافع · انتصر" : "PLANT · DEFEND · CONQUER"}</span></footer>
    </main>
  );
}
