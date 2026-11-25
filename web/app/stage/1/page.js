"use client";

import Link from "next/link";
import { useLocale, LanguageToggle } from "../../LocaleProvider";
import CatalogThumb from "../../components/CatalogThumb";

export default function StageOneIntroPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";

  return (
    <main className="info-shell">
      <article className="info-card stage-intro-card">
        <div className="stages-top"><span className="eyebrow">{ar ? "مهمة إنقاذ" : "RESCUE MISSION"}</span><LanguageToggle /></div>
        <CatalogThumb id="stage" label={ar ? "شعار المرحلة الأولى" : "Stage One emblem"} className="stage-intro-thumb" />
        <h1>{ar ? "المرحلة الأولى: أرض المزرعة" : "Stage One: The Farm Lands"}</h1>
        <p className="stage-story">
          {ar
            ? "اختطفت مجموعة من الوحوش زوجة المزارع واحتجزتها بعيداً عن المزرعة. يجب على المزارع حماية أرضه وهزيمة موجات الوحوش، ثم الوصول إلى زوجته وإنقاذها."
            : "A monster horde has taken the farmer's wife and is holding her away from the farm. The farmer must defend his land, defeat every wave, then reach his wife and bring her home."}
        </p>
        <div className="stage-cast-grid">
          <CatalogThumb id="princess" label={ar ? "الأميرة الأسيرة" : "Captive princess"} className="stage-cast-thumb" />
        </div>
        <div className="stage-briefing">
          <div><strong>{ar ? "الأعداء" : "ENEMIES"}</strong><span>{ar ? "٣٠ وحشاً عادياً (Monster 01)" : "30 Monster 01 enemies"}</span></div>
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
