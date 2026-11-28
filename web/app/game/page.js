"use client";

import { useSyncExternalStore, useState, useEffect } from "react";
import PhaserGame from "../../game/PhaserGame";
import { loadUnlockedPlantIds } from "../../game/rules/phaseOneRules.mjs";
import {
  createDefaultSeedLoadout,
  normalizeSeedLoadout,
  MAX_SEED_PACKETS,
  SEED_LOADOUT_STORAGE_KEY
} from "../../game/rules/seedLoadout.mjs";
import { useLocale } from "../LocaleProvider";
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
const STAGE_PLANT_ALIASES = Object.freeze({
  "radish-level-1": "radish", "energy-mushroom": "mushroom",
  "pumpkin-level-1": "pumpkin", "pineapple-level-1": "pineapple",
  "hazelnut-level-1": "hazelnut", "mango-level-1": "mango",
  "snow-thrower-level-1": "snow-thrower", "electric-mushroom-level-1": "electric-mushroom"
});

function subscribeToLocation(callback) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getLocationSearchSnapshot() {
  return window.location.search;
}

function normalizeStageSeedLoadout(selectedIds, unlockedIds) {
  const allowed = new Set(Array.isArray(unlockedIds) ? unlockedIds : []);
  return [...new Set((Array.isArray(selectedIds) ? selectedIds : []).filter((id) => allowed.has(id)))].slice(0, MAX_SEED_PACKETS);
}

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
  const locationSearch = useSyncExternalStore(subscribeToLocation, getLocationSearchSnapshot, () => "");
  const stageParam = new URLSearchParams(locationSearch).get("stage");
  const isStagePlaytest = stageParam !== null && Number.isInteger(Number(stageParam)) && Number(stageParam) >= 1;
  const studioPlaytestRequested = new URLSearchParams(locationSearch).get("studioPlaytest") === "1";
  const [studioSession, setStudioSession] = useState({ checked: false, authenticated: false });
  const [stageEncounter, setStageEncounter] = useState(null);
  const [stageEncounterReady, setStageEncounterReady] = useState(false);
  const [stageAssetRecords, setStageAssetRecords] = useState([]);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setStageEncounterReady(false);
    });
    Promise.all([
      fetch("/api/studio/stage-encounters", { cache: "no-store" }).then((response) => response.ok ? response.json() : null),
      fetch("/api/studio/assets", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).catch(() => null)
    ]).then(([config, assets]) => {
      if (!active) return;
      setStageEncounter(config?.stages?.[String(stageParam === null ? 1 : Number(stageParam))] || null);
      setStageAssetRecords(Array.isArray(assets?.assets) ? assets.assets : []);
      setStageEncounterReady(true);
    }).catch(() => {
      if (active) {
        setStageEncounter(null);
        setStageAssetRecords([]);
        setStageEncounterReady(true);
      }
    });
    return () => { active = false; };
  }, [isStagePlaytest, stageParam]);
  useEffect(() => {
    let active = true;
    if (!studioPlaytestRequested) return () => { active = false; };
    fetch("/api/studio/session", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => { if (active) setStudioSession({ checked: true, authenticated: session?.authenticated === true }); })
      .catch(() => { if (active) setStudioSession({ checked: true, authenticated: false }); });
    return () => { active = false; };
  }, [studioPlaytestRequested]);
  const authorizedStudioPlaytest = studioPlaytestRequested && studioSession.checked && studioSession.authenticated;
  const blockStudioPlaytest = studioPlaytestRequested && (!studioSession.checked || !studioSession.authenticated);
  const { unlocked, selected, ready } = JSON.parse(loadoutSnapshot);
  const [selectedOverride, setSelectedOverride] = useState(null);
  const stageRosterConfigured = stageEncounter?.plantsConfigured === true;
  const stagePlantEntries = (stageEncounter?.plants || []).filter((entry) => entry.enabled !== false && entry.visible !== false);
  const stagePlantIds = stageRosterConfigured
    ? [...new Set(stagePlantEntries.map((entry) => STAGE_PLANT_ALIASES[entry.id] || entry.id))]
    : [];
  const stagePackets = stageRosterConfigured
    ? [
        ...PLANT_PACKETS.filter((plant) => stagePlantIds.includes(plant.id)),
        ...stagePlantEntries
          .filter((entry) => !PLANT_PACKETS.some((plant) => plant.id === (STAGE_PLANT_ALIASES[entry.id] || entry.id)))
          .map((entry) => {
            const asset = stageAssetRecords.find((item) => item.id === entry.id && item.type === "plant");
            return asset ? {
              id: entry.id,
              image: asset.previewUrl || asset.path || "",
              en: asset.name || entry.id,
              ar: asset.name || entry.id,
              cost: Math.max(0, Number(asset.combat?.energyCost) || 0),
              roleEn: "Stage plant",
              roleAr: "نبتة المرحلة"
            } : null;
          })
          .filter(Boolean)
      ]
    : PLANT_PACKETS;
  const stageUnlocked = stageRosterConfigured
    ? stagePlantEntries.filter((entry) => entry.unlocked !== false).map((entry) => STAGE_PLANT_ALIASES[entry.id] || entry.id)
    : unlocked;
  const selectionUnlocked = stageRosterConfigured ? stageUnlocked : unlocked;
  const initialStageSelection = stageRosterConfigured
    ? stagePackets.filter((plant) => stageUnlocked.includes(plant.id)).map((plant) => plant.id).slice(0, MAX_SEED_PACKETS)
    : selected;
  const activeSelected = selectedOverride ?? initialStageSelection;
  useEffect(() => {
    if (!stageRosterConfigured || !stageEncounterReady) return;
    Promise.resolve().then(() => {
      try {
        const key = "farmVsMonsters.selectedPlants.stage." + (stageParam === null ? 1 : Number(stageParam));
        const saved = window.localStorage.getItem(key);
        setSelectedOverride(saved ? normalizeStageSeedLoadout(JSON.parse(saved), selectionUnlocked) : null);
      } catch {
        setSelectedOverride(null);
      }
    });
  }, [stageRosterConfigured, stageEncounterReady, stageEncounter, stageParam, selectionUnlocked]);
  const [battleStarted, setBattleStarted] = useState(false);
  const showBattle = battleStarted || (isStagePlaytest && (!studioPlaytestRequested || authorizedStudioPlaytest));
  const [saveError, setSaveError] = useState(false);


  function togglePacket(id) {
    if (!selectionUnlocked.includes(id) || (!stageRosterConfigured && (id === "radish" || id === "mushroom"))) return;
    setSelectedOverride((currentValue) => {
      const current = currentValue ?? initialStageSelection;
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_SEED_PACKETS) return current;
      return stageRosterConfigured
        ? normalizeStageSeedLoadout([...current, id], selectionUnlocked)
        : normalizeSeedLoadout([...current, id], selectionUnlocked);
    });
  }

  function enterBattle() {
    const safeLoadout = stageRosterConfigured
      ? normalizeStageSeedLoadout(activeSelected, selectionUnlocked)
      : normalizeSeedLoadout(activeSelected, selectionUnlocked);
    try {
      const storageKey = stageRosterConfigured
        ? "farmVsMonsters.selectedPlants.stage." + (stageParam === null ? 1 : Number(stageParam))
        : SEED_LOADOUT_STORAGE_KEY;
      window.localStorage.setItem(storageKey, JSON.stringify(safeLoadout));
      setSaveError(false);
    } catch {
      setSaveError(true);
      return;
    }
    setSelectedOverride(safeLoadout);
    setBattleStarted(true);
  }

  return <main className="game-shell game-shell-seed-entry" dir={arabic ? "rtl" : "ltr"}>
    {blockStudioPlaytest ? <section className="seed-selection-shell" aria-live="polite"><h1>{studioSession.checked ? (arabic ? "غير مصرح بالوصول" : "Administrator access required") : (arabic ? "جارٍ التحقق من صلاحية الاستديو…" : "Verifying Studio access…")}</h1><p>{studioSession.checked ? (arabic ? "سجّل الدخول إلى الاستديو ثم أعد بدء اختبار المرحلة." : "Sign in to Studio, then restart this stage playtest.") : (arabic ? "لحظة من فضلك." : "Please wait.")}</p></section> : !showBattle ? <section className="seed-selection-shell" aria-labelledby="seed-selection-title">
      <div className="seed-selection-heading">
        <span className="seed-selection-eyebrow">{t("BEFORE THE BATTLE")}</span>
        <h1 id="seed-selection-title">{t("Choose your seed packets")}</h1>
        <p>{stageRosterConfigured ? (arabic ? "اختر من نباتات هذه المرحلة فقط. كل نبات أضفته مفتوح تلقائياً، وتظهر علامة القفل فقط على ما أغلقته من الاستديو." : "Choose from this stage’s plants only. Added plants are unlocked by default; a lock appears only on plants you locked in Studio.") : t("Build your battle loadout. You can bring up to six plants, and your two starter packets must stay selected.")}</p>
      </div>

      <div className="seed-selection-status">
        <span>{t("YOUR SEED BANK")}</span>
        <strong>{activeSelected.length} / {MAX_SEED_PACKETS}</strong>
      </div>

      <div className="seed-packet-grid">
        {stageRosterConfigured && !stageEncounterReady ? <p>{arabic ? "جارٍ تحميل نباتات المرحلة…" : "Loading stage plants…"}</p> : (stageRosterConfigured ? stagePackets : PLANT_PACKETS).map((plant) => {
          const isUnlocked = selectionUnlocked.includes(plant.id);
          const isSelected = activeSelected.includes(plant.id);
          const isRequired = !stageRosterConfigured && (plant.id === "radish" || plant.id === "mushroom");
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
            {!isUnlocked && <span className="seed-locked-label">{stageRosterConfigured ? (arabic ? "مقفولة في إعدادات المرحلة" : "Locked in stage settings") : t("Unlock through campaign")}</span>}
          </button>;
        })}
      </div>

      <div className="seed-selection-footer">
        <div className="seed-selection-tip"><span>🌱</span>{t("Tip: bring an attacker, an energy producer, and a mix of support plants.")}</div>
        <div className="seed-selection-actions">
          <button type="button" className="seed-start-button seed-start-button-clay" onClick={enterBattle} disabled={!ready || activeSelected.length < 2}>
            <span aria-hidden="true">⚔️</span>{t("Enter the battlefield")}
          </button>
        </div>
        {saveError && <p className="seed-save-error" role="alert">{t("Could not save your loadout. Check browser storage and try again.")}</p>}
      </div>
    </section> : <>
      <section className="game-panel" aria-label={t("Stone age battle arena")}><PhaserGame /></section>
      <p className="prototype-note">{t("A prehistoric farm-defense battle. Gather mushroom energy, raise living defenders, and keep the tribe's home safe.")}</p>
    </>}
    <style jsx global>{`
      .game-shell-seed-entry { min-height: 100dvh; padding: clamp(10px, 2vw, 24px); }
      .game-shell-seed-entry .seed-start-button-clay {
        position: relative; isolation: isolate; overflow: hidden;
        min-height: 62px; min-width: min(300px, 100%); padding: 13px 30px;
        gap: 12px; border: 3px solid #4a2b13; border-radius: 15px;
        outline: 1px solid #f8e8bd; outline-offset: -7px;
        background: linear-gradient(180deg, #f7dfaa 0%, #d5a45d 48%, #a96e36 100%);
        color: #38200e; font: inherit; font-size: 17px; font-weight: 1000;
        text-shadow: 0 1px 0 #fff0ca;
        box-shadow: inset 0 3px 0 #fff3d3, inset 0 -4px 0 #865022,
          0 6px 0 #39200f, 0 11px 20px #160c0788;
        cursor: pointer; transition: transform .16s ease, filter .16s ease, box-shadow .16s ease;
      }
      .game-shell-seed-entry .seed-start-button-clay::before {
        content: ""; position: absolute; inset: 5px; z-index: -1; pointer-events: none;
        border: 1px solid #fff0c477; border-radius: 9px;
        background: linear-gradient(110deg, #fff5d533, transparent 45%, #6e3d1718);
      }
      .game-shell-seed-entry .seed-start-button-clay:hover:not(:disabled) {
        transform: translateY(-3px); filter: brightness(1.08);
        box-shadow: inset 0 3px 0 #fff7df, inset 0 -4px 0 #865022,
          0 9px 0 #39200f, 0 15px 24px #160c07aa;
      }
      .game-shell-seed-entry .seed-start-button-clay:active:not(:disabled) {
        transform: translateY(3px);
        box-shadow: inset 0 2px 0 #fff3d3, 0 2px 0 #39200f;
      }
      .game-shell-seed-entry .seed-start-button-clay:focus-visible {
        outline: 3px solid #fff0a8; outline-offset: 4px;
      }
      .game-shell-seed-entry .seed-start-button-clay:disabled {
        filter: grayscale(.55); opacity: .62; cursor: not-allowed;
      }
      @media (max-width: 760px) {
        .game-shell-seed-entry .seed-selection-actions { align-items: stretch; }
        .game-shell-seed-entry .seed-start-button-clay { width: 100%; }
      }
    `}</style>
  </main>;
}
