"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./LocaleProvider";
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
      // Guest play remains available if the account service is offline.
    }
    router.push("/game");
  }

  return (
    <main className="world-home codex-home codex-home-minimal" dir={arabic ? "rtl" : "ltr"}>
      <div className="world-battlefield-showcase" aria-hidden="true">
        <img className="world-battlefield-image" src="/assets/backgrounds/farm-battlefield.jpeg" alt="" />
        <div className="world-battlefield-atmosphere" />
        <div className="battlefield-ground-glow" />
      </div>
      <section className="codex-home-center">
        <img className="farm-game-logo farm-game-logo-center" src="/assets/items/ui/logo.png" alt="Farm Vs Monsters" />
        <button className="codex-adventure-button codex-play-only" type="button" onClick={startAdventure} disabled={starting}>
          <span className="codex-adventure-icon" aria-hidden="true">⚔️</span>
          <span><strong>{starting ? (arabic ? "جارٍ التحضير..." : "GETTING READY...") : (arabic ? "العب فقط" : "PLAY")}</strong></span>
          <b aria-hidden="true">➜</b>
        </button>
      </section>
      <a className="codex-home-settings-link" href="/settings" aria-label={arabic ? "الإعدادات" : "Settings"}>⚙️</a>
    </main>
  );
}
