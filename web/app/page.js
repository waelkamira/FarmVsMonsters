"use client";

import Link from "next/link";
import { useLocale, LanguageToggle } from "./LocaleProvider";

export default function HomePage() {
  const { locale } = useLocale();
  const arabic = locale === "ar";

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
        <Link className="home-start-button" href="/stages">
          <span aria-hidden="true">⚔️</span>
          {arabic ? "ابدأ" : "START"}
          <span aria-hidden="true">➜</span>
        </Link>
      </section>
    </main>
  );
}
