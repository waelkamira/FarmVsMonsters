"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { loadSavedCoins } from "../game/rules/phaseOneRules.mjs";
import { useLocale, LanguageToggle } from "./LocaleProvider";

export default function HomePage() {
  const [coins, setCoins] = useState(0);
  const [showPhaseEmblem, setShowPhaseEmblem] = useState(true);
  const { t, locale } = useLocale();

  useEffect(() => {
    try {
      setCoins(loadSavedCoins(window.localStorage));
    } catch {
      setCoins(0);
    }
  }, []);

  const arabic = locale === "ar";

  return (
    <main className="home-shell">
      <div className="home-card">
        <div className="home-topbar">
          <span className="menu-version">{arabic ? "المغامرة الأولى" : "THE FIRST ADVENTURE"}</span>
          <LanguageToggle />
        </div>
        <p className="eyebrow">{t("A PRIMITIVE 2D FARM DEFENSE ADVENTURE")}</p>
        {showPhaseEmblem && (
          <Image
            src="/assets/levels/phase-1-emblem.png"
            alt={t("Phase 1 emblem")}
            width={420}
            height={250}
            className="phase-one-emblem"
            priority
            onError={() => setShowPhaseEmblem(false)}
          />
        )}
        <h1>Farm <span>Vs</span> Monsters</h1>
        <p className="home-copy">
          {t("The tribe's garden is the last wall between the monsters and the cave home.")}{" "}
          {t("Plant Radish defenders, grow Energy Mushrooms to collect resources, and protect the princess.")}{" "}
          {t("When the final radish falls, the caveman takes up his wooden club.")}
        </p>
        <div className="coin-wallet" aria-label={`${t("Saved coins")}: ${coins}`}>
          <span className="coin-wallet-icon" aria-hidden="true">●</span>
          <span><strong>{coins.toLocaleString()} {t("COINS")}</strong><small>{t("Saved player balance")}</small></span>
        </div>
        <nav className="menu-actions" aria-label="Main menu">
          <Link className="primary-link" href="/stages">{t("New Game")}</Link>
          <div className="optional-account-entry"><Link className="secondary-link" href="/account">{arabic ? "حساب اللاعب · حفظ التقدم" : "Player Account · Save Progress"}</Link><small>{arabic ? "اختياري — يمكنك اللعب كضيف دون تسجيل الدخول" : "Optional — play as a guest, no sign-in required"}</small></div>
          <Link className="secondary-link" href="/how-to-play">{t("How to Play")}</Link>
          <Link className="secondary-link" href="/settings">{t("Settings")}</Link>
          <Link className="secondary-link" href="/credits">{t("Credits")}</Link>
        </nav>
        <div className="menu-facts">
          <span>{arabic ? "٥ موجات" : "5 WAVES"}</span>
          <span>{arabic ? "٣٠ وحشاً عادياً" : "30 ORDINARY MONSTERS"}</span>
          <span>{arabic ? "تنين وزوجة أسيرة" : "DRAGON & CAPTIVE WIFE"}</span>
        </div>
        <p className="campaign-note">
          {arabic
            ? "في نهاية كل مرحلة، اهزم التنين وأتباعه، ثم حرّر الأميرة واجتمع بها قبل الانتقال إلى أرض جديدة."
            : "Defeat each dragon and its followers, rescue the princess, and reunite before travelling to a new land."}
        </p>
        <p className="home-note">{t("A hand-drawn prehistoric world of roots, stone, timber, and wild creatures.")}</p>
      </div>
    </main>
  );
}
