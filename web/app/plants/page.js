"use client";

import Link from "next/link";

import { useLocale, LanguageToggle } from "../LocaleProvider";

import { STAGE_ONE_PLANTS } from "../../game/data/stageOnePlants.mjs";
import CatalogThumb from "../components/CatalogThumb";

export default function PlantsPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  // Only fully implemented plants belong in the player-facing collection.
  // Planned concepts remain in internal design data until their gameplay and art are ready.
  const activePlants = STAGE_ONE_PLANTS.filter((plant) => plant.implemented === true);

  return (
    <main className="info-shell">
      <section className="info-card codex-inventory-page">
        <div className="stages-top">
          <span className="eyebrow">{ar ? "دليل نباتات المرحلة الأولى" : "STAGE ONE PLANT ENCYCLOPEDIA"}</span>
          <LanguageToggle />
        </div>
        <h1>{ar ? "موسوعة النباتات" : "Plant Encyclopedia"}</h1>
        <p className="collection-intro">
          {ar
            ? "تعرض هذه الموسوعة النباتات المكتملة والقابلة للاستخدام في المعركة فقط."
            : "This encyclopedia shows only completed plants that are available for battle."}
        </p>
        <div className="collection-wallet">
          <strong>{ar ? "العملات والمكافآت معطّلة في النسخة التجريبية المحلية" : "Coins and rewards are disabled in local playtest mode"}</strong>
          <strong>{ar ? "لا تُمنح عملات أو تُحفظ مكافآت قبل تفعيل التحقق الآمن من الخادم" : "No coins or rewards are issued until server verification is enabled"}</strong>
        </div>

        <div className="collection-summary">
          <span>{ar ? "النباتات المتاحة" : "AVAILABLE"}: <strong>{activePlants.length}</strong></span>
          <span>{ar ? "قابل للشراء الآن" : "BUYABLE NOW"}: <strong>{activePlants.filter((plant) => plant.purchasable).length}</strong></span>
        </div>

        <h2 className="collection-section-title">{ar ? "النباتات المتاحة لديك" : "Available plants"}</h2>
        <div className="collection-grid active-plant-grid">
          {activePlants.map((plant) => (
            <article className="collection-card is-active" key={plant.id}>
              <CatalogThumb id={plant.id} label={ar ? plant.nameAr : plant.name} className="plant-thumb active-plant-thumb" />
              <h2>{ar ? plant.nameAr : plant.name}</h2>
              <span className="collection-status">{ar ? "✓ متاحة في المعركة" : "✓ AVAILABLE IN BATTLE"}</span>
              <p>{ar ? plant.descriptionAr : plant.description}</p>
              <div className="collection-meta">
                <span>{ar ? "تكلفة الزراعة" : "Planting cost"}: {plant.energyCost} {ar ? "طاقة" : "energy"}</span>
                {(ar ? plant.statsAr : plant.stats).map((stat) => <span key={stat}>{stat}</span>)}
              </div>
            </article>
          ))}
        </div>

        <nav className="info-nav collection-back">
          <Link className="secondary-link" href="/">{ar ? "القائمة الرئيسية" : "Main Menu"}</Link>
          <Link className="secondary-link" href="/monsters">{ar ? "قائمة الوحوش" : "Monster Collection"}</Link>
        </nav>
      </section>
    </main>
  );
}
