"use client";

import Link from "next/link";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import { STAGE_ONE_PLANTS } from "../../game/data/stageOnePlants.mjs";
import CatalogThumb from "../components/CatalogThumb";

export default function PlantsPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const plants = STAGE_ONE_PLANTS.filter((plant) => plant.implemented === true);

  return (
    <main className="plant-v2" dir={ar ? "rtl" : "ltr"}>
      <header className="plant-v2-topbar">
        <Link href="/" className="plant-v2-back"><span aria-hidden="true">⌂</span>{ar ? "الرئيسية" : "Home"}</Link>
        <div className="plant-v2-brand"><span className="plant-v2-brand-mark">✦</span><span>FARM <i>VS</i> MONSTERS</span><small>{ar ? "دليل النباتات" : "PLANT FIELD GUIDE"}</small></div>
        <LanguageToggle />
      </header>

      <section className="plant-v2-intro">
        <div className="plant-v2-intro-copy">
          <span className="plant-v2-eyebrow"><i /> {ar ? "دليل المزرعة · مجموعة المعركة" : "FARM FIELD GUIDE · BATTLE COLLECTION"}</span>
          <h1>{ar ? "موسوعة النباتات" : "Plant <em>Codex</em>"}</h1>
          <p>{ar ? "تعرّف إلى حلفائك، واكتشف قدراتهم وتكلفة استدعائهم إلى ساحة المعركة." : "Meet your allies. Explore their abilities, battle roles and energy costs."}</p>
        </div>
        <div className="plant-v2-counter"><strong>{String(plants.length).padStart(2, "0")}</strong><span>{ar ? "نباتات جاهزة" : "BATTLE-READY"}</span><i>{ar ? "متاحة الآن" : "AVAILABLE NOW"}</i></div>
      </section>

      <div className="plant-v2-toolbar">
        <div><span className="plant-v2-toolbar-dot" />{ar ? "مجموعة النباتات المكتملة" : "COMPLETED PLANT COLLECTION"}</div>
        <span>{ar ? "اختر نباتاً للتعرّف عليه" : "YOUR BATTLE COMPANIONS"}</span>
      </div>

      <section className="plant-v2-grid" aria-label={ar ? "النباتات المتاحة" : "Available plants"}>
        {plants.map((plant, index) => (
          <article className="plant-v2-card" key={plant.id}>
            <div className="plant-v2-art">
              <span className="plant-v2-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="plant-v2-status" title={ar ? "جاهز للمعركة" : "Battle ready"}>✓</span>
              <div className="plant-v2-orbit" />
              <CatalogThumb id={plant.id} label={ar ? plant.nameAr : plant.name} className="plant-v2-thumb" />
            </div>
            <div className="plant-v2-card-copy">
              <h2>{ar ? plant.nameAr : plant.name}</h2>
              <p>{ar ? plant.descriptionAr : plant.description}</p>
            </div>
            <div className="plant-v2-card-bottom">
              <div className="plant-v2-cost"><span>✦</span><strong>{plant.energyCost}</strong><small>{ar ? "طاقة" : "ENERGY"}</small></div>
              <div className="plant-v2-stats">{(ar ? plant.statsAr : plant.stats).slice(0, 2).map((stat) => <span key={stat}>{stat}</span>)}</div>
            </div>
          </article>
        ))}
      </section>

      <footer className="plant-v2-footer">
        <p>{ar ? "تعرض الموسوعة النباتات المكتملة والمتاحة للاستخدام في المعارك فقط." : "Only completed plants currently available in battle are shown."}</p>
        <nav><Link href="/monsters">{ar ? "موسوعة الوحوش ←" : "Monster Codex →"}</Link><Link href="/stage/1/select">{ar ? "اختيار النباتات ←" : "Choose Plants →"}</Link></nav>
      </footer>
    </main>
  );
}
