"use client";

import Link from "next/link";
import { useLocale, LanguageToggle } from "../LocaleProvider";

const monsters = [
  {
    id: "cave-brute",
    icon: "🐾",
    en: "Cave Brute",
    ar: "الضبع العادي",
    enRole: "Standard raider",
    arRole: "الضبع الأساسي",
    enDesc: "The baseline enemy. It advances through its lane and stops to eat a plant blocking its path.",
    arDesc: "النوع الأساسي. يتقدم في مساره ويتوقف لالتهام أي نبتة تعترض طريقه.",
    enStats: "Standard durability · 7 radish hits",
    arStats: "تحمّل عادي · ٧ ضربات من الفجل"
  },
  {
    id: "dust-skitter",
    icon: "💨",
    en: "Dust Skitter",
    ar: "ضبع الغبار السريع",
    enRole: "Fast, fragile scout",
    arRole: "كشاف سريع وضعيف التحمل",
    enDesc: "Moves faster than the standard hyena but is much easier to defeat.",
    arDesc: "يتحرك أسرع من الضبع العادي، لكنه أسهل بكثير في الهزيمة.",
    enStats: "About 52% of standard durability",
    arStats: "نحو ٥٢٪ من تحمّل الضبع العادي"
  },
  {
    id: "stonehide",
    icon: "🛡️",
    en: "Stonehide",
    ar: "ضبع الجلد الحجري",
    enRole: "Armored heavy",
    arRole: "وحش ثقيل ومدرّع",
    enDesc: "A slower, heavily plated hyena that takes much more damage before falling.",
    arDesc: "ضبع أبطأ ومدرّع بشدة، ويتطلب إسقاطه ضرراً أكبر.",
    enStats: "2.2× standard durability",
    arStats: "٢٫٢ ضعف تحمّل الضبع العادي"
  },
  {
    id: "alpha-brute",
    icon: "👑",
    en: "Alpha Brute",
    ar: "الضبع العملاق",
    enRole: "Rare giant leader",
    arRole: "قائد عملاق نادر",
    enDesc: "A huge late-wave enemy with exceptional durability and crushing bites.",
    arDesc: "وحش ضخم يظهر في الموجات المتأخرة، يتمتع بتحمّل استثنائي وعضّات ساحقة.",
    enStats: "14 radish hits",
    arStats: "١٤ ضربة من الفجل"
  }
];

export default function MonstersPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";

  return (
    <main className="info-shell">
      <section className="info-card">
        <div className="stages-top">
          <span className="eyebrow">{ar ? "دليل أعداء المرحلة الأولى" : "STAGE ONE ENEMY GUIDE"}</span>
          <LanguageToggle />
        </div>
        <h1>{ar ? "قائمة الوحوش" : "Monster Collection"}</h1>
        <p className="collection-intro">
          {ar
            ? "تعرّف على الأنواع الأربعة الموجودة في جيش التنين في المرحلة الأولى. تختلف في السرعة والتحمّل والدور القتالي."
            : "Meet the four hyena archetypes in the Stage 1 dragon army. They differ in speed, durability, and battlefield role."}
        </p>
        <div className="collection-grid">
          {monsters.map((monster, index) => (
            <article className="collection-card is-active" key={monster.id}>
              <div className="collection-art" aria-hidden="true">{monster.icon}</div>
              <h2>{ar ? monster.ar : monster.en}</h2>
              <span className="collection-status">{ar ? "موجود في المرحلة" : "IN THIS STAGE"}</span>
              <p><strong>{ar ? monster.arRole : monster.enRole}</strong></p>
              <p>{ar ? monster.arDesc : monster.enDesc}</p>
              <div className="collection-meta">
                <span>{ar ? monster.arStats : monster.enStats}</span>
                {monster.id === "alpha-brute" && <span>{ar ? "موجات متأخرة" : "Late waves"}</span>}
                {monster.id === "stonehide" && <span>{ar ? "موجات متأخرة" : "Late waves"}</span>}
                {monster.id === "dust-skitter" && <span>{ar ? "من الموجة الثالثة" : "From Wave 3"}</span>}
              </div>
            </article>
          ))}
        </div>
        <h2 className="collection-section-title">{ar ? "زعيم المرحلة" : "Stage boss"}</h2>
        <div className="collection-card">
          <div className="collection-art" aria-hidden="true">🐉</div>
          <h2>{ar ? "التنين الشرير" : "The Evil Dragon"}</h2>
          <p>{ar ? "زعيم مستقل عن عدد الوحوش العادية. يظهر في الموجة الخامسة، ويجب هزيمته بعد أتباعه لتحرير الأميرة." : "A separate boss, not included in the ordinary monster count. It appears in Wave 5 and must be defeated after its followers to rescue the princess."}</p>
          <span className="collection-status">{ar ? "زعيم المرحلة الأولى" : "STAGE ONE BOSS"}</span>
        </div>
        <nav className="info-nav collection-back">
          <Link className="secondary-link" href="/">{ar ? "القائمة الرئيسية" : "Main Menu"}</Link>
          <Link className="secondary-link" href="/plants">{ar ? "قائمة النباتات" : "Plant Collection"}</Link>
        </nav>
      </section>
    </main>
  );
}
