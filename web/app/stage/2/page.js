"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, LanguageToggle } from "../../LocaleProvider";
import { loadUnlockedStage } from "../../../game/rules/phaseOneRules.mjs";

export default function StageTwoIntroPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [access, setAccess] = useState("checking");

  useEffect(() => {
    let unlocked = 1;
    try {
      unlocked = loadUnlockedStage(window.localStorage);
    } catch {
      unlocked = 1;
    }

    if (unlocked >= 2) {
      setAccess("unlocked");
    } else {
      setAccess("locked");
      router.replace("/stages");
    }
  }, [router]);

  if (access !== "unlocked") {
    return (
      <main className="info-shell">
        <section className="info-card stage-intro-card" aria-live="polite">
          <p>{ar ? "جارٍ التحقق من تقدم الحملة..." : "Checking campaign progress..."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="info-shell">
      <article className="info-card stage-intro-card stage-two-intro-card">
        <div className="stages-top">
          <span className="eyebrow">{ar ? "المغامرة التالية · تم فتحها" : "NEXT ADVENTURE · UNLOCKED"}</span>
          <LanguageToggle />
        </div>

        <div className="stage-intro-emblem" aria-label={ar ? "مكان شعار المرحلة الثانية" : "Stage two emblem placeholder"}>
          <span>{ar ? "مكان شعار المرحلة الثانية" : "STAGE TWO EMBLEM"}</span>
        </div>

        <h1>{ar ? "المرحلة الثانية: مغامرة جديدة" : "Stage Two: A New Adventure"}</h1>

        <p className="stage-story">
          {ar
            ? "بعد إنقاذ الأميرة من تنين المرحلة الأولى، تبدأ مغامرة جديدة. يظهر تنين شرير آخر بجيش من الوحوش، وتبدأ مهمة المزارع من جديد: حماية الأرض، هزيمة الأتباع، مواجهة التنين، وإنقاذ الأميرة."
            : "After rescuing the princess from the first dragon, a new adventure begins. Another evil dragon commands a new monster army. The farmer's mission begins again: defend the land, defeat the followers, face the dragon, and rescue the princess."}
        </p>

        <div className="stage-cast-grid stage-two-cast-grid">
          <div className="stage-cast-placeholder">
            <span>{ar ? "مكان صورة تنين المرحلة الثانية" : "STAGE TWO DRAGON ART"}</span>
          </div>
          <div className="stage-cast-placeholder">
            <span>{ar ? "مكان صورة وحوش المرحلة الثانية" : "STAGE TWO MONSTER ARMY ART"}</span>
          </div>
          <div className="stage-cast-placeholder">
            <span>{ar ? "مكان صورة الأميرة الأسيرة" : "CAPTIVE PRINCESS ART"}</span>
          </div>
        </div>

        <div className="stage-briefing stage-two-briefing">
          <div>
            <strong>{ar ? "الأعداء" : "ENEMIES"}</strong>
            <span>{ar ? "جيش جديد من الوحوش — التفاصيل قيد التصميم" : "A new monster army — details in design"}</span>
          </div>
          <div>
            <strong>{ar ? "الزعيم" : "BOSS"}</strong>
            <span>{ar ? "تنين جديد خاص بهذه المرحلة" : "A new dragon unique to this stage"}</span>
          </div>
          <div>
            <strong>{ar ? "المهمة" : "OBJECTIVE"}</strong>
            <span>{ar ? "احمِ الأرض، اهزم التنين، وأنقذ الأميرة" : "Defend the land, defeat the dragon, and rescue the princess"}</span>
          </div>
        </div>

        <p className="stage-two-development-note">
          {ar
            ? "تم فتح هذه المرحلة في تقدمك، لكن تصميم أرضها والوحوش والتنين وموجات القتال ما زال قيد التطوير. لن يبدأ القتال قبل اكتمالها."
            : "This stage is unlocked in your campaign progress, but its land, monsters, dragon, and battle waves are still being developed. Battle will not start until the stage is complete."}
        </p>

        <nav className="info-nav">
          <Link className="secondary-link" href="/stages">{ar ? "العودة إلى خريطة المراحل" : "Back to Campaign Map"}</Link>
          <Link className="secondary-link" href="/">{ar ? "القائمة الرئيسية" : "Main Menu"}</Link>
        </nav>
      </article>
    </main>
  );
}
