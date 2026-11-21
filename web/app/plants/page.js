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
      try {
        setCoins(loadSavedCoins(window.localStorage));
      } catch { setCoins(0); }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("farm-coins-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("farm-coins-change", refresh);
    };
  }, []);

  // The full plant encyclopedia is open during the current development/playtest period.
  const activePlants = STAGE_ONE_PLANTS;
  const plannedPlants = STAGE_ONE_PLANTS.filter((plant) => !plant.implemented);

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
            ? "جميع نباتات القائمة مفتوحة حاليًا للعرض والاختيار حيثما كانت آلياتها منفذة. النباتات التي ما زالت قيد التطوير تظهر بوضوح دون ادعاء أنها جاهزة للمعركة."
            : "All plants are currently visible in the roster. Plants with implemented gameplay can be selected for battle; concepts still in development remain clearly marked."}
        </p>
        <div className="collection-wallet">
          <strong>{ar ? "رصيد العملات على هذا الجهاز" : "Coins saved on this device"}</strong>
          <strong>🪙 {coins.toLocaleString()} {ar ? "عملة" : "COINS"}</strong>
        </div>

        <div className="collection-summary">
          <span>{ar ? "النباتات المفتوحة" : "UNLOCKED"}: <strong>{activePlants.length}</strong></span>
          <span>{ar ? "قيد التجهيز" : "IN DEVELOPMENT"}: <strong>{plannedPlants.length}</strong></span>
          <span>{ar ? "الإجمالي" : "TOTAL"}: <strong>{STAGE_ONE_PLANTS.length}</strong></span>
          <span>{ar ? "قابل للشراء الآن" : "BUYABLE NOW"}: <strong>{STAGE_ONE_PLANTS.filter((plant) => plant.purchasable).length}</strong></span>
        </div>

        <h2 className="collection-section-title">{ar ? "النباتات المتاحة لديك" : "Available plants"}</h2>
        <div className="collection-grid active-plant-grid">
          {activePlants.map((plant) => (
            <article className="collection-card is-active" key={plant.id}>
              <CatalogThumb id={plant.id} label={ar ? plant.nameAr : plant.name} className="plant-thumb active-plant-thumb" />
              <h2>{ar ? plant.nameAr : plant.name}</h2>
              <span className="collection-status">{plant.implemented ? (ar ? "✓ مفتوحة ومتاحة" : "✓ UNLOCKED") : (ar ? "◷ مفتوحة في القائمة · قيد التنفيذ" : "◷ VISIBLE · IN DEVELOPMENT")}</span>
              <p>{ar ? plant.descriptionAr : plant.description}</p>
              <div className="collection-meta">
                <span>{ar ? "تكلفة الزراعة" : "Planting cost"}: {plant.energyCost} {ar ? "طاقة" : "energy"}</span>
                {(ar ? plant.statsAr : plant.stats).map((stat) => <span key={stat}>{stat}</span>)}
              </div>
            </article>
          ))}
        </div>

        <div className="collection-empty collection-note">
          {ar
            ? "جميع النباتات ظاهرة الآن. النباتات قيد التطوير ليست بالضرورة قابلة للاستخدام داخل المعركة حتى تكتمل برمجتها."
            : "All plants are visible now. Plants still in development are not necessarily usable in battle until their gameplay is implemented."}
        </div>

        <nav className="info-nav collection-back">
          <Link className="secondary-link" href="/">{ar ? "القائمة الرئيسية" : "Main Menu"}</Link>
          <Link className="secondary-link" href="/monsters">{ar ? "قائمة الوحوش" : "Monster Collection"}</Link>
        </nav>
      </section>
    </main>
  );
}
