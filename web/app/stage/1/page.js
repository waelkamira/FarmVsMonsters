"use client";

import Link from "next/link";
import { useLocale, LanguageToggle } from "../../LocaleProvider";

export default function StageOneIntroPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";

  return (
    <main className="info-shell">
      <article className="info-card stage-intro-card">
        <div className="stages-top"><span className="eyebrow">{ar ? "مهمة إنقاذ" : "RESCUE MISSION"}</span><LanguageToggle /></div>
        <h1>{ar ? "المرحلة الأولى: أرض المزرعة" : "Stage One: The Farm Lands"}</h1>
        <p className="stage-story">
          {ar
            ? "تتعرض المزرعة لهجوم من موجات الوحش 01. على المزارع حماية أرضه والتصدي للمهاجمين حتى تنتهي المعركة."
            : "The farm is under attack by waves of Monster 01. The farmer must defend the land and stop the attackers until the battle is won."}
        </p>
        <div className="stage-briefing">
          <div><strong>{ar ? "الأعداء" : "ENEMIES"}</strong><span>{ar ? "٣٠ وحشاً من Monster 01 فقط" : "30 Monster 01 enemies"}</span></div>
          <div><strong>{ar ? "الموجات" : "WAVES"}</strong><span>{ar ? "٥ موجات متصاعدة الصعوبة" : "5 increasingly difficult waves"}</span></div>
          <div><strong>{ar ? "المهمة" : "OBJECTIVE"}</strong><span>{ar ? "احمِ المزرعة وأنقذ الأميرة" : "Defend the farm and rescue the princess"}</span></div>
        </div>
        <nav className="info-nav">
          <Link className="primary-link" href="/stage/1/select">{ar ? "اختر النباتات وابدأ" : "Choose Plants & Begin"}</Link>
          <Link className="secondary-link" href="/stages">{ar ? "العودة للمراحل" : "Back to Stages"}</Link>
        </nav>
      </article>
    </main>
  );
}
