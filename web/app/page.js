"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, LanguageToggle } from "./LocaleProvider";
import { getPlayerSession, restoreOrInitializeCloudProgress } from "../game/services/playerAccount.mjs";

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

      <section className="home-title-card" aria-label={arabic ? "ابدأ اللعبة" : "Start game"}>
        <div className="home-title-kicker">{arabic ? "مغامرة خيالية · عالم المزرعة" : "FANTASY ADVENTURE · FARM WORLD"}</div>
        <h1 className="home-game-title">Farm <span>Vs</span> Monsters</h1>
        <p className="home-game-tagline">{arabic ? "ازرع، دافع عن مزرعتك، وأنقذ الأميرة!" : "Grow your garden, defend your home, rescue the princess!"}</p>
        <button className="home-start-button" type="button" onClick={startAdventure} disabled={starting}>
          <span aria-hidden="true">⚔️</span>
          {starting ? (arabic ? "جارٍ التحضير..." : "LOADING...") : (arabic ? "ابدأ" : "START")}
          <span aria-hidden="true">➜</span>
        </button>
      </section>
    </main>
  );
}
