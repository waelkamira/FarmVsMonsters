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
            ? "اختطف تنين شرير زوجة المزارع وأسرها بجانبه. يقود التنين جيشاً من الضباع نحو المزرعة. يجب على المزارع حماية أرضه، هزيمة الوحوش، ثم مواجهة التنين وإنقاذ زوجته."
            : "An evil dragon has kidnapped the farmer's wife and keeps her captive at his side. The dragon leads an army of hyenas toward the farm. The farmer must defend his land, defeat the monsters, face the dragon, and rescue his wife."}
        </p>
        <div className="stage-cast-grid">
          <CatalogThumb id="dragon" label={ar ? "التنين الشرير" : "Evil Dragon"} className="stage-cast-thumb" />
          <CatalogThumb id="princess" label={ar ? "الأميرة الأسيرة" : "Captive princess"} className="stage-cast-thumb" />
        </div>
        <div className="stage-briefing">
          <div><strong>{ar ? "الأعداء" : "ENEMIES"}</strong><span>{ar ? "٣٠ ضبعاً عادياً + تنين الزعيم" : "30 ordinary hyenas + dragon boss"}</span></div>
          <div><strong>{ar ? "الموجات" : "WAVES"}</strong><span>{ar ? "٥ موجات متصاعدة الصعوبة" : "5 increasingly difficult waves"}</span></div>
          <div><strong>{ar ? "المهمة" : "OBJECTIVE"}</strong><span>{ar ? "احمِ المزرعة وأنقذ الأميرة" : "Defend the farm and rescue the princess"}</span></div>
        </div>
        <nav className="info-nav">
          <Link className="primary-link" href="/game">{ar ? "ابدأ المرحلة" : "Begin Stage"}</Link>
          <Link className="secondary-link" href="/stages">{ar ? "العودة للمراحل" : "Back to Stages"}</Link>
        </nav>
      </article>
    </main>
  );
}
