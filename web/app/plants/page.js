"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import { loadSavedCoins, loadUnlockedPlantIds } from "../../game/rules/phaseOneRules.mjs";
import { STAGE_ONE_PLANTS } from "../../game/data/stageOnePlants.mjs";
import CatalogThumb from "../components/CatalogThumb";

export default function PlantsPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [coins, setCoins] = useState(0);
  const [unlockedIds, setUnlockedIds] = useState(["radish", "energy-mushroom"]);

  useEffect(() => {
    const refresh = () => {
      try {
        setCoins(loadSavedCoins(window.localStorage));
        const saved = new Set(loadUnlockedPlantIds(window.localStorage));
        const aliases = { "energy-mushroom": "mushroom", "pumpkin-guard": "pumpkin" };
        setUnlockedIds(STAGE_ONE_PLANTS.map((plant) => plant.id).filter((id) => saved.has(aliases[id] || id)));
      } catch { setCoins(0); setUnlockedIds(["radish", "energy-mushroom"]); }
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
  const lockedPlants = [];

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
          <span>{ar ? "النباتات المفعّلة" : "ACTIVE"}: <strong>{activePlants.length}</strong></span>
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

        {lockedPlants.length > 0 && <h2 className="collection-section-title">{ar ? "النباتات المقفلة" : "Locked plants"}</h2>}
        <p className="collection-intro">
          {ar
            ? "هذه النباتات جزء من قائمة التصميم. وضعت لها أدواراً وأسعاراً مبدئية بالعملات، لكنها لن تُشترى أو تظهر في ساحة القتال حتى نضيف صورها ونبرمج قدراتها ونختبر توازنها."
            : "These are planned designs with proposed coin prices and gameplay roles. They will not be purchasable or appear in battle until their artwork, abilities, and balance are implemented."}
        </p>
        {lockedPlants.length > 0 && <div className="collection-grid">
          {lockedPlants.map((plant) => {
            const price = plant.coinPrice;
            const canAfford = coins >= price;
            return (
              <article className="collection-card is-locked" key={plant.id}>
                <CatalogThumb id={plant.id} label={ar ? plant.nameAr : plant.name} className="plant-thumb is-planned" />
                <h2>{ar ? plant.nameAr : plant.name}</h2>
                <span className="collection-status">{plant.implemented ? (ar ? "🔒 مقفل حتى فتح مكافأته" : "🔒 LOCKED · CAMPAIGN REWARD") : (ar ? "🔒 قيد التطوير" : "🔒 IN DEVELOPMENT")}</span>
                <p><strong>{ar ? plant.roleAr : plant.role}</strong></p>
                <p>{ar ? plant.descriptionAr : plant.description}</p>
                <div className="collection-meta">
                  {plant.implemented
                    ? <span>{ar ? "مكافأة إنهاء المرحلة الأولى" : "Reward for completing Stage 1"}</span>
                    : <span>{ar ? "سعر مقترح" : "Proposed price"}: 🪙 {price}</span>}
                  <span>{ar ? "تكلفة الزراعة" : "Planting cost"}: {plant.energyCost} {ar ? "طاقة" : "energy"}</span>
                  {(ar ? plant.statsAr : plant.stats).map((stat) => <span key={stat}>{stat}</span>)}
                </div>
                <button className="plant-locked-button" type="button" disabled title={plant.implemented ? (ar ? "أكمل المرحلة الأولى لفتح هذه النبتة" : "Complete Stage 1 to unlock this plant") : (ar ? "لم يكتمل تنفيذ هذه النبتة بعد" : "This plant is not implemented yet")}>
                  {plant.implemented
                    ? (ar ? "مقفلة — أكمل المرحلة الأولى" : "LOCKED · COMPLETE STAGE 1")
                    : (canAfford ? (ar ? "غير متاحة للشراء حالياً" : "Not available for purchase") : (ar ? "قيد التطوير" : "IN DEVELOPMENT"))}
                </button>
              </article>
            );
          })}
        </div>}

        <div className="collection-empty collection-note">
          {ar
            ? "جميع النباتات ظاهرة الآن. النباتات قيد التطوير ليست بالضرورة قابلة للاستخدام داخل المعركة حتى تكتمل برمجتها."
            : "Campaign-reward plants remain locked until their unlock condition is met. Unimplemented concepts are informational only and cannot be purchased."}
        </div>

        <nav className="info-nav collection-back">
          <Link className="secondary-link" href="/">{ar ? "القائمة الرئيسية" : "Main Menu"}</Link>
          <Link className="secondary-link" href="/monsters">{ar ? "قائمة الوحوش" : "Monster Collection"}</Link>
        </nav>
      </section>
    </main>
  );
}
