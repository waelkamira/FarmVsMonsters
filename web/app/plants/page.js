"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import { loadSavedCoins } from "../../game/rules/phaseOneRules.mjs";
import { STAGE_ONE_PLANTS } from "../../game/data/stageOnePlants.mjs";
import CatalogThumb from "../components/CatalogThumb";

export default function PlantsPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    const refresh = () => {
      try { setCoins(loadSavedCoins(window.localStorage)); } catch { setCoins(0); }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("farm-coins-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("farm-coins-change", refresh);
    };
  }, []);

  const activePlants = STAGE_ONE_PLANTS.filter((plant) => plant.implemented);
  const plannedPlants = STAGE_ONE_PLANTS.filter((plant) => !plant.implemented);

  return (
    <main className="info-shell">
      <section className="info-card">
        <div className="stages-top">
          <span className="eyebrow">{ar ? "دليل نباتات المرحلة الأولى" : "STAGE ONE PLANT ENCYCLOPEDIA"}</span>
          <LanguageToggle />
        </div>
        <h1>{ar ? "موسوعة النباتات" : "Plant Encyclopedia"}</h1>
        <p className="collection-intro">
          {ar
            ? "جهزت قائمة النباتات المقترحة للمرحلة الأولى. النباتات المفعّلة تعمل داخل المعركة، أما النباتات المقفلة فهي خطة المحتوى القادم وسنضيف صورها وآلياتها تباعاً."
            : "The Stage 1 plant roster is now planned. Active plants already work in battle; locked plants are the upcoming roster and will be implemented as their artwork and gameplay are added."}
        </p>
        <div className="collection-wallet">
          <strong>{ar ? "رصيد العملات على هذا الجهاز" : "Coins saved on this device"}</strong>
          <strong>🪙 {coins.toLocaleString()} {ar ? "عملة" : "COINS"}</strong>
        </div>

        <div className="collection-summary">
          <span>{ar ? "النباتات المفعّلة" : "ACTIVE"}: <strong>{activePlants.length}</strong></span>
          <span>{ar ? "قيد التجهيز" : "IN DEVELOPMENT"}: <strong>{plannedPlants.length}</strong></span>
          <span>{ar ? "الإجمالي" : "TOTAL"}: <strong>{STAGE_ONE_PLANTS.length}</strong></span>
          <span>{ar ? "قابل للشراء الآن" : "BUYABLE NOW"}: <strong>{STAGE_ONE_PLANTS.filter((plant) => plant.purchasable).length}</strong></span>
        </div>

        <h2 className="collection-section-title">{ar ? "النباتات المفعّلة داخل المعركة" : "Active in battle"}</h2>
        <div className="collection-grid">
          {activePlants.map((plant) => (
            <article className="collection-card is-active" key={plant.id}>
              <CatalogThumb id={plant.id} label={ar ? plant.nameAr : plant.name} className="plant-thumb" />
              <h2>{ar ? plant.nameAr : plant.name}</h2>
              <span className="collection-status">{ar ? "✓ مفعّل في اللعبة" : "✓ ACTIVE IN GAME"}</span>
              <p>{ar ? plant.descriptionAr : plant.description}</p>
              <div className="collection-meta">
                <span>{ar ? "تكلفة الزراعة" : "Planting cost"}: {plant.energyCost} {ar ? "طاقة" : "energy"}</span>
                {(ar ? plant.statsAr : plant.stats).map((stat) => <span key={stat}>{stat}</span>)}
              </div>
            </article>
          ))}
        </div>

        <h2 className="collection-section-title">{ar ? "النباتات القادمة — غير مفعّلة بعد" : "Upcoming plants — not active yet"}</h2>
        <p className="collection-intro">
          {ar
            ? "هذه النباتات جزء من قائمة التصميم. وضعت لها أدواراً وأسعاراً مبدئية بالعملات، لكنها لن تُشترى أو تظهر في ساحة القتال حتى نضيف صورها ونبرمج قدراتها ونختبر توازنها."
            : "These are planned designs with proposed coin prices and gameplay roles. They will not be purchasable or appear in battle until their artwork, abilities, and balance are implemented."}
        </p>
        <div className="collection-grid">
          {plannedPlants.map((plant) => {
            const price = plant.coinPrice;
            const canAfford = coins >= price;
            return (
              <article className="collection-card is-locked" key={plant.id}>
                <CatalogThumb id={plant.id} label={ar ? plant.nameAr : plant.name} className="plant-thumb is-planned" />
                <h2>{ar ? plant.nameAr : plant.name}</h2>
                <span className="collection-status">{ar ? "🔒 غير مفعّل" : "🔒 NOT IMPLEMENTED"}</span>
                <p><strong>{ar ? plant.roleAr : plant.role}</strong></p>
                <p>{ar ? plant.descriptionAr : plant.description}</p>
                <div className="collection-meta">
                  <span>{ar ? "سعر مقترح" : "Proposed price"}: 🪙 {price}</span>
                  <span>{ar ? "تكلفة زراعة مقترحة" : "Proposed planting cost"}: {plant.energyCost} {ar ? "طاقة" : "energy"}</span>
                  {(ar ? plant.statsAr : plant.stats).map((stat) => <span key={stat}>{stat}</span>)}
                </div>
                <button className="plant-locked-button" type="button" disabled title={ar ? "سيتم تفعيل الشراء بعد اكتمال الصورة والبرمجة" : "Purchases unlock after artwork and gameplay implementation"}>
                  {canAfford
                    ? (ar ? "متاح لاحقاً — لم يُفعّل الشراء" : "Affordable later · purchase disabled")
                    : (ar ? "رصيدك لا يكفي بعد" : "Not enough coins yet")}
                </button>
              </article>
            );
          })}
        </div>

        <div className="collection-empty collection-note">
          {ar
            ? "مهم: الأسعار المعروضة للنباتات القادمة مبدئية وليست خصماً فعلياً. لن تُخصم أي عملات قبل اعتمادك للأسعار واكتمال صور النباتات وآلياتها."
            : "Important: prices for upcoming plants are proposals only, not active purchases. No coins will be deducted until you approve the prices and each plant's art and gameplay are complete."}
        </div>

        <nav className="info-nav collection-back">
          <Link className="secondary-link" href="/">{ar ? "القائمة الرئيسية" : "Main Menu"}</Link>
          <Link className="secondary-link" href="/monsters">{ar ? "قائمة الوحوش" : "Monster Collection"}</Link>
        </nav>
      </section>
    </main>
  );
}
