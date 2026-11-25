"use client";

import Link from "next/link";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import { PHASE_ONE_WAVE_SIZES } from "../../game/rules/phaseOneCombatContract.mjs";

export default function HowToPlayPage() {
  const { t, locale } = useLocale();
  const arabic = locale === "ar";
  const ordinaryMonsterCount = PHASE_ONE_WAVE_SIZES.reduce((total, count) => total + count, 0);

  return (
    <main className="info-shell">
      <article className="info-card">
        <LanguageToggle />
        <p className="eyebrow">{t("FIELD GUIDE")}</p>
        <h1>{t("How to Play")}</h1>
        <p>
          {arabic
            ? `دافع عن المزرعة خلال خمس موجات. تضم المرحلة الأولى ${ordinaryMonsterCount} وحشاً عادياً موزعين على الموجات: ${PHASE_ONE_WAVE_SIZES.join("، ")}. بعد هزيمة جميع الوحوش، يصل المزارع إلى زوجته وينقذها.`
            : `Defend the farmhouse through five waves. Stage 1 has ${ordinaryMonsterCount} ordinary monsters across the waves: ${PHASE_ONE_WAVE_SIZES.join(", ")}. After all monsters are defeated, the farmer reaches his wife and rescues her.`}
        </p>

        <h2>{t("1. Choose your plant")}</h2>
        <p>{t("Select the Radish card (35 energy) to plant an automatic lane defender, or the Energy Mushroom card (50 energy) to grow a resource producer. You begin with 150 energy, and each defeated monster rewards you with 8 coins.")}</p>

        <h2>{t("2. Plant and collect")}</h2>
        <p>{t("Choose an empty soil cell. The caveman runs there, plants your selected seed, and returns to his original position. Radishes stay rooted and automatically attack monsters. Every Energy Mushroom produces a 15-energy collectible every 12 seconds. Click the glowing mushroom pickup to collect it within 12 seconds before it disappears. If your energy is already full, the pickup cannot add more. Energy is capped at 300.")}</p>

        <h2>{t("3. Protect the farmhouse")}</h2>
        <p>{t("Monsters stop to eat plants blocking their lane. If they break through, they attack the farmhouse over time. The battle is lost only when farmhouse health reaches zero.")}</p>

        <h2>{t("4. Emergency club combat")}</h2>
        <p>{t("If every defensive plant is destroyed, the caveman can use his club. Planting a new defender successfully ends emergency combat immediately.")}</p>

        <h2>{t("Rescue")}</h2>
        <p>
          {arabic
            ? "بعد هزيمة الوحوش الثلاثين في الموجات الخمس، يتجه المزارع إلى زوجته وينقذها، ثم يعودان إلى المزرعة."
            : "After all 30 monsters across the five waves are defeated, the farmer reaches his wife and rescues her. They return to the farm together."}
        </p>

        <h2>{t("Controls")}</h2>
        <ul>
          {[
            "W A S D or Arrow keys: move the caveman.",
            "Space: use the club when emergency combat is active.",
            "P: pause or open the pause menu.",
            "Mouse: select Radish or Energy Mushroom, then plant in an empty cell; click produced mushroom energy to collect it."
          ].map((item) => <li key={item}>{t(item)}</li>)}
        </ul>
        <nav className="info-nav">
          <Link className="primary-link" href="/game">{t("Start Game")}</Link>
          <Link className="secondary-link" href="/">{t("Main Menu")}</Link>
        </nav>
      </article>
    </main>
  );
}
