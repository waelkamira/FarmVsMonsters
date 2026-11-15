"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import { loadSavedCoins } from "../../game/rules/phaseOneRules.mjs";

const plants = [
  {
    id: "radish",
    icon: "🥬",
    en: "Radish Defender",
    ar: "الفجل المدافع",
    enDesc: "A rooted lane defender that automatically fires at monsters approaching in its lane.",
    arDesc: "مدافع ثابت في المسار يطلق المقذوفات تلقائياً على الوحوش القادمة.",
    cost: 35,
    costType: "energy"
  },
  {
    id: "energy-mushroom",
    icon: "🍄",
    en: "Energy Mushroom",
    ar: "فطر الطاقة",
    enDesc: "Produces a collectible energy pickup every 12 seconds. Each pickup restores 15 energy.",
    arDesc: "ينتج طاقة قابلة للجمع كل ١٢ ثانية، وتمنح كل مرة ١٥ نقطة طاقة.",
    cost: 50,
    costType: "energy"
  }
];

export default function PlantsPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    try { setCoins(loadSavedCoins(window.localStorage)); } catch { setCoins(0); }
    const refresh = () => {
      try { setCoins(loadSavedCoins(window.localStorage)); } catch { setCoins(0); }
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("farm-coins-change", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("farm-coins-change", refresh);
    };
  }, []);

  return (
    <main className="info-shell">
      <section className="info-card">
        <div className="stages-top">
          <span className="eyebrow">{ar ? "دليل المرحلة الأولى" : "STAGE ONE FIELD GUIDE"}</span>
          <LanguageToggle />
        </div>
        <h1>{ar ? "قائمة النباتات" : "Plant Collection"}</h1>
        <p className="collection-intro">
          {ar
            ? "هذه هي النباتات المعتمدة والمستخدمة فعلياً في المرحلة الأولى. حالة «مفعّل» تعني أنك تستطيع استخدامها داخل المعركة."
            : "These are the plants currently implemented in Stage 1. Active plants can be selected and used during the battle."}
        </p>
        <div className="collection-wallet">
          <strong>{ar ? "رصيدك الحالي" : "Your current balance"}</strong>
          <strong>🪙 {coins.toLocaleString()} {ar ? "عملة" : "COINS"}</strong>
        </div>

        <h2 className="collection-section-title">{ar ? "النباتات المفعّلة" : "Active plants"}</h2>
        <div className="collection-grid">
          {plants.map((plant) => (
            <article className="collection-card is-active" key={plant.id}>
              <div className="collection-art" aria-hidden="true">{plant.icon}</div>
              <h2>{ar ? plant.ar : plant.en}</h2>
              <p>{ar ? plant.arDesc : plant.enDesc}</p>
              <div className="collection-meta">
                <span>{ar ? "تكلفة الزراعة" : "Planting cost"}: {plant.cost} {ar ? "طاقة" : "energy"}</span>
              </div>
              <span className="collection-status">{ar ? "✓ مفعّل ومتاح" : "✓ ACTIVE · AVAILABLE"}</span>
            </article>
          ))}
        </div>

        <h2 className="collection-section-title">{ar ? "نباتات غير مفعّلة" : "Inactive plants"}</h2>
        <div className="collection-empty">
          {ar
            ? "لا توجد نباتات إضافية معتمدة للمرحلة الأولى حالياً. ستظهر هنا النباتات الجديدة بعد إضافة صورها وآلياتها وتوازنها داخل المعركة."
            : "There are no additional approved plants for Stage 1 yet. New plants will appear here once their artwork, gameplay behavior, and balance are implemented."}
        </div>

        <h2 className="collection-section-title">{ar ? "المتاح للشراء بالعملات" : "Available to buy with coins"}</h2>
        <div className="collection-empty">
          {ar
            ? "لا يوجد نبات قابل للشراء بالعملات في هذه المرحلة حالياً؛ الفجل وفطر الطاقة متاحان منذ البداية ويُزرعان باستخدام الطاقة داخل المعركة. لن نخصم عملاتك مقابل عنصر غير مطبّق."
            : "There are currently no coin-purchasable plants in this stage. Radish and Energy Mushroom are available from the start and use battle energy to plant. Your coins will not be charged for content that is not implemented."}
        </div>

        <nav className="info-nav collection-back">
          <Link className="secondary-link" href="/">{ar ? "القائمة الرئيسية" : "Main Menu"}</Link>
          <Link className="secondary-link" href="/monsters">{ar ? "قائمة الوحوش" : "Monster Collection"}</Link>
        </nav>
      </section>
    </main>
  );
}
