"use client";

import Link from "next/link";
import { useLocale, LanguageToggle } from "../LocaleProvider";

export default function StagesPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const stages = Array.from({ length: 10 }, (_, index) => index + 1);

  return (
    <main className="info-shell">
      <section className="info-card stages-card">
        <div className="stages-top"><span className="eyebrow">{ar ? "حملة إنقاذ الأميرة" : "THE RESCUE CAMPAIGN"}</span><LanguageToggle /></div>
        <h1>{ar ? "اختر المرحلة" : "Choose a Stage"}</h1>
        <p>{ar ? "كل مرحلة مغامرة مستقلة بأرض جديدة ووحوش وتنين مختلف. اهزم أتباع التنين، اقضِ عليه، ثم أنقذ الأميرة." : "Every stage is its own adventure with a new land, monsters, and dragon. Defeat the dragon's followers, defeat the dragon, then rescue the princess."}</p>
        <div className="stage-grid">
          {stages.map((stage) => (
            <article className={stage === 1 ? "stage-tile stage-available" : "stage-tile stage-locked"} key={stage}>
              <div className="stage-number">{String(stage).padStart(2, "0")}</div>
              <div className="stage-art-placeholder" aria-hidden="true"><span>{stage === 1 ? "✦" : "?"}</span></div>
              <h2>{ar ? `المرحلة ${stage}` : `Stage ${stage}`}</h2>
              <p>{stage === 1
                ? (ar ? "٣٠ ضبعاً عادياً · ٥ موجات · تنين المرحلة الأولى" : "30 ordinary hyenas · 5 waves · Stage 1 dragon")
                : (ar ? "أرض جديدة وتحديات قادمة" : "A new land and challenges to come")}</p>
              {stage === 1
                ? <Link className="primary-link stage-action" href="/stage/1">{ar ? "استعد للمغامرة" : "View Stage"}</Link>
                : <span className="stage-lock-label">{ar ? "قريباً" : "Coming soon"}</span>}
            </article>
          ))}
        </div>
        <nav className="info-nav"><Link className="secondary-link" href="/">{ar ? "القائمة الرئيسية" : "Main Menu"}</Link></nav>
      </section>
    </main>
  );
}
