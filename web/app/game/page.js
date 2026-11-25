"use client";

import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import PhaserGame from "../../game/PhaserGame";
import { loadUnlockedPlantIds } from "../../game/rules/phaseOneRules.mjs";
import {
  createDefaultSeedLoadout,
  normalizeSeedLoadout,
  MAX_SEED_PACKETS,
  SEED_LOADOUT_STORAGE_KEY
} from "../../game/rules/seedLoadout.mjs";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import SpriteThumbnail from "../components/SpriteThumbnail.jsx";
import { readStorageSnapshot, subscribeToBrowserStorage } from "../../game/hooks/browserStorage.mjs";

const PLANT_PACKETS = [
  { id: "radish", image: "/assets/plants/radish-level-1.png", rows: 3, columns: 3, frameCount: 9, en: "Radish", ar: "الفجل", cost: 35, roleEn: "Lane attacker", roleAr: "مهاجم المسار" },
  { id: "mushroom", image: "/assets/plants/mushroom.png", en: "Energy Mushroom", ar: "فطر الطاقة", cost: 50, roleEn: "Produces energy", roleAr: "ينتج الطاقة" },
  { id: "pumpkin", image: "/assets/plants/pumpkin.png", en: "Pumpkin", ar: "اليقطين", cost: 75, roleEn: "Defensive wall", roleAr: "جدار دفاعي" },
  { id: "pineapple", image: "/assets/plants/pineapple-level-1.png", rows: 3, columns: 3, frameCount: 9, en: "Pineapple", ar: "الأناناس", cost: 70, roleEn: "Heavy projectile", roleAr: "قذيفة قوية" },
  { id: "hazelnut", image: "/assets/plants/hazelnut-level-1.png", rows: 3, columns: 3, frameCount: 9, en: "Hazelnut", ar: "البندق", cost: 65, roleEn: "Lane shooter", roleAr: "قاذف في المسار" },
  { id: "mango", image: "/assets/plants/mango-level-1.png", rows: 3, columns: 3, frameCount: 9, en: "Mango", ar: "المانجو", cost: 70, roleEn: "Curved projectile", roleAr: "قذيفة منحنية" },
  { id: "snow-thrower", image: "/assets/plants/Snow-thrower-level-1.png", rows: 3, columns: 3, frameCount: 9, en: "Snow Thrower", ar: "قاذف الثلج", cost: 90, roleEn: "Freezes monsters", roleAr: "يجمد الوحوش" },
  { id: "electric-mushroom", image: "/assets/plants/Electric-mushroom-level-1.png", rows: 3, columns: 3, frameCount: 9, en: "Electric Mushroom", ar: "الفطر الكهربائي", cost: 80, roleEn: "Electric lane attacker", roleAr: "مهاجم كهربائي للمسار" }
];


const LOADOUT_SERVER_SNAPSHOT = JSON.stringify({ ready: false, unlocked: ["radish", "mushroom"], selected: ["radish", "mushroom"] });

function getLoadoutSnapshot() {
  let unlocked = ["radish", "mushroom"];
  try {
    unlocked = loadUnlockedPlantIds(window.localStorage);
    const raw = readStorageSnapshot(SEED_LOADOUT_STORAGE_KEY, null);
    const saved = raw ? JSON.parse(raw) : null;
    const selected = Array.isArray(saved)
      ? normalizeSeedLoadout(saved, unlocked)
      : createDefaultSeedLoadout(unlocked);
    return JSON.stringify({ ready: true, unlocked, selected });
  } catch {
    return JSON.stringify({ ready: true, unlocked, selected: ["radish", "mushroom"] });
  }
}

export default function GamePage() {
  const { t, locale } = useLocale();
  const arabic = locale === "ar";
  const loadoutSnapshot = useSyncExternalStore(subscribeToBrowserStorage, getLoadoutSnapshot, () => LOADOUT_SERVER_SNAPSHOT);
  const { unlocked, selected, ready } = JSON.parse(loadoutSnapshot);
  const [selectedOverride, setSelectedOverride] = useState(null);
  const activeSelected = selectedOverride ?? selected;
  const [battleStarted, setBattleStarted] = useState(false);
  const [saveError, setSaveError] = useState(false);

  function togglePacket(id) {
    if (!unlocked.includes(id) || id === "radish" || id === "mushroom") return;
    setSelectedOverride((currentValue) => {
      const current = currentValue ?? selected;
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_SEED_PACKETS) return current;
      return normalizeSeedLoadout([...current, id], unlocked);
    });
  }

  function enterBattle() {
    const safeLoadout = normalizeSeedLoadout(activeSelected, unlocked);
    try {
      window.localStorage.setItem(SEED_LOADOUT_STORAGE_KEY, JSON.stringify(safeLoadout));
      setSaveError(false);
    } catch {
      setSaveError(true);
      return;
    }
    setSelectedOverride(safeLoadout);
    setBattleStarted(true);
  }

  return <main className="game-shell" dir={arabic ? "rtl" : "ltr"}>
    <header className="game-header">
      <Link href="/" className="wordmark farm-game-logo-link" aria-label="Farm Vs Monsters home"><img className="farm-game-logo farm-game-logo-header" src="/assets/items/ui/logo.png" alt="Farm Vs Monsters" /></Link>
      <div className="control-hint">{battleStarted
        ? t("Choose a plant card · Click an empty soil plot to plant · Collect Mushroom energy")
        : t("Prepare your seed packets before entering the battlefield")}</div>
      <LanguageToggle />
    </header>

    {!battleStarted ? <section className="seed-selection-shell" aria-labelledby="seed-selection-title">
      <div className="seed-selection-heading">
        <span className="seed-selection-eyebrow">{t("BEFORE THE BATTLE")}</span>
        <h1 id="seed-selection-title">{t("Choose your seed packets")}</h1>
        <p>{t("Build your battle loadout. You can bring up to six plants, and your two starter packets must stay selected.")}</p>
      </div>

      <div className="seed-selection-status">
        <span>{t("YOUR SEED BANK")}</span>
        <strong>{activeSelected.length} / {MAX_SEED_PACKETS}</strong>
      </div>

      <div className="seed-packet-grid">
        {PLANT_PACKETS.map((plant) => {
          const isUnlocked = unlocked.includes(plant.id);
          const isSelected = activeSelected.includes(plant.id);
          const isRequired = plant.id === "radish" || plant.id === "mushroom";
          return <button
            type="button"
            key={plant.id}
            className={`seed-choice-card ${isSelected ? "is-selected" : ""} ${!isUnlocked ? "is-locked" : ""}`}
            onClick={() => togglePacket(plant.id)}
            disabled={!ready || !isUnlocked || isRequired}
            aria-pressed={isSelected}
            aria-label={`${arabic ? plant.ar : plant.en}: ${isSelected ? t("Selected") : t("Not selected")}`}
          >
            <span className="seed-choice-check">{!isUnlocked ? "🔒" : isSelected ? "✓" : "+"}</span>
            <span className="seed-choice-art"><SpriteThumbnail src={plant.image} rows={plant.rows || 1} columns={plant.columns || 1} frameCount={plant.frameCount || 1} alt="" className="seed-choice-art-media" decorative /></span>
            <strong>{arabic ? plant.ar : plant.en}</strong>
            <small>{arabic ? plant.roleAr : plant.roleEn}</small>
            <span className="seed-choice-cost">🍄 {plant.cost}</span>
            {isRequired && <span className="seed-required-label">{t("STARTER")}</span>}
            {!isUnlocked && <span className="seed-locked-label">{t("Unlock through campaign")}</span>}
          </button>;
        })}
      </div>

      <div className="seed-selection-footer">
        <div className="seed-selection-tip"><span>🌱</span>{t("Tip: bring an attacker, an energy producer, and a mix of support plants.")}</div>
        <div className="seed-selection-actions">
          <Link href="/" className="secondary-link">{t("Main Menu")}</Link>
          <button type="button" className="seed-start-button" onClick={enterBattle} disabled={!ready || activeSelected.length < 2}>
            <span>⚔️</span>{t("Enter the battlefield")}
          </button>
        </div>
        {saveError && <p className="seed-save-error" role="alert">{t("Could not save your loadout. Check browser storage and try again.")}</p>}
      </div>
    </section> : <>
      <section className="game-panel" aria-label={t("Stone age battle arena")}><PhaserGame /></section>
      <p className="prototype-note">{t("A prehistoric farm-defense battle. Gather mushroom energy, raise living defenders, and keep the tribe's home safe.")}</p>
    </>}
  </main>;
}
