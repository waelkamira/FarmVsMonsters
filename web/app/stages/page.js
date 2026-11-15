"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import { loadUnlockedStage } from "../../game/rules/phaseOneRules.mjs";
import CatalogThumb from "../components/CatalogThumb";

export default function StagesPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [unlockedStage, setUnlockedStage] = useState(1);

  useEffect(() => {
    try {
      setUnlockedStage(loadUnlockedStage(window.localStorage));
    } catch {
      setUnlockedStage(1);
    }
  }, []);

  const stages = Array.from({ length: 10 }, (_, index) => index + 1);

  return (
    <main className="info-shell">
      <section className="info-card stages-card">
        <div className="stages-top"><span className="eyebrow">{ar ? "حملة إنقاذ الأميرة" : "THE RESCUE CAMPAIGN"}</span><div className="stages-actions"><Link className="secondary-link" href="/account">{ar ? "حساب اللاعب" : "Player Account"}</Link><LanguageToggle /></div></div>
        <h1>{ar ? "اختر المرحلة" : "Choose a Stage"}</h1>
        <p>{ar ? "كل مرحلة مغامرة مستقلة بأرض جديدة ووحوش وتنين مختلف. اهزم أتباع التنين، اقضِ عليه، ثم أنقذ الأميرة." : "Every stage is its own adventure with a new land, monsters, and dragon. Defeat the dragon's followers, defeat the dragon, then rescue the princess."}</p>
        <div className="stage-grid">
          {stages.map((stage) => (
            <article className={(stage === 1 || (stage === 2 && unlockedStage >= 2)) ? "stage-tile stage-available" : "stage-tile stage-locked"} key={stage}>
              <div className="stage-number">{String(stage).padStart(2, "0")}</div>
              <CatalogThumb id="stage" label={ar ? `صورة المرحلة ${stage}` : `Stage ${stage} artwork`} className="stage-card-thumb" />
              <h2>{ar ? `المرحلة ${stage}` : `Stage ${stage}`}</h2>
              <p>{stage === 1
                ? (ar ? "٣٠ ضبعاً عادياً · ٥ موجات · تنين المرحلة الأولى" : "30 ordinary hyenas · 5 waves · Stage 1 dragon")
                : stage === 2 && unlockedStage >= 2
                  ? (ar ? "أُتيحت بعد إنقاذ الأميرة. يجري تجهيز أرض المغامرة الجديدة وأعدائها وتنينها." : "Unlocked after rescuing the princess. The new land, enemies, and dragon adventure are being prepared.")
                  : (ar ? "أرض جديدة وتحديات قادمة" : "A new land and challenges to come")}</p>
              {stage === 1
                ? <Link className="primary-link stage-action" href="/stage/1">{ar ? "استعد للمغامرة" : "View Stage"}</Link>
                : stage === 2 && unlockedStage >= 2
                  ? <span className="stage-lock-label" aria-label={ar ? "المرحلة الثانية مفتوحة وقيد التطوير" : "Stage two unlocked and in development"}>{ar ? "★ تم فتح المرحلة الثانية · قريباً" : "★ STAGE 2 UNLOCKED · COMING SOON"}</span>
                  : <span className="stage-lock-label">{ar ? "مقفل" : "Locked"}</span>}
            </article>
          ))}
        </div>
        <nav className="info-nav"><Link className="secondary-link" href="/">{ar ? "القائمة الرئيسية" : "Main Menu"}</Link></nav>
      </section>
    </main>
  );
}
