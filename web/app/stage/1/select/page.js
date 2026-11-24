"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, LanguageToggle } from "../../../LocaleProvider";
import { loadUnlockedPlantIds } from "../../../../game/rules/phaseOneRules.mjs";

const PLANTS = [
  { id: "radish", name: "Radish Level 1", ar: "الفجل المستوى الأول", role: "Lane attacker", roleAr: "مهاجم للمسار", cost: 35, image: "/assets/plants/radish-level-1.png" },
  { id: "mushroom", name: "Energy Mushroom", ar: "فطر الطاقة", role: "Energy producer · Required", roleAr: "منتج الطاقة · أساسي", cost: 50, image: "/assets/plants/mushroom.png", required: true },
  { id: "pumpkin", name: "Pumpkin", ar: "اليقطين", role: "Heavy blocker", roleAr: "حاجز دفاعي", cost: 75, image: "/assets/plants/pumpkin.png" },
  { id: "pineapple", name: "Pineapple L1", ar: "الأناناس L1", role: "Arcing bomb attacker", roleAr: "قاذف قنابل مقوسة", cost: 70, image: "/assets/plants/pineapple-level-1.png" },
  { id: "hazelnut", name: "Hazelnut L1", ar: "البندق L1", role: "Arcing bomb attacker", roleAr: "قاذف قنابل مقوسة", cost: 65, image: "/assets/plants/hazelnut-level-1.png" },
  { id: "mango", name: "Mango L1", ar: "المانجو L1", role: "Arcing bomb attacker", roleAr: "قاذف قنابل مقوسة", cost: 70, image: "/assets/plants/mango-level-1.png" },
  { id: "snow-thrower", name: "Snow Thrower L1", ar: "قاذف الثلج L1", role: "Freeze support", roleAr: "دعم بالتجميد", cost: 90, image: "/assets/plants/Snow-thrower-level-1.png" },
  { id: "electric-mushroom", name: "Electric Mushroom L1", ar: "الفطر الكهربائي L1", role: "Electric lane attacker", roleAr: "مهاجم كهربائي للمسار", cost: 85, image: "/assets/plants/Electric-mushroom-level-1.png", spriteSheet: true },
];

const STARTER_LOADOUT = ["radish", "mushroom"];
const MAX_SEEDS = 7;

export default function StageOneSeedSelectionPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [unlockedIds, setUnlockedIds] = useState(STARTER_LOADOUT);
  const [selected, setSelected] = useState(STARTER_LOADOUT);
  const [plantCatalog, setPlantCatalog] = useState(PLANTS);
  const [notice, setNotice] = useState("");
  const selectedPlants = useMemo(() => plantCatalog.filter((plant) => unlockedIds.includes(plant.id) && selected.includes(plant.id)), [plantCatalog, selected, unlockedIds]);

  useEffect(() => {
    let active = true;
    const readCatalog = async (url) => {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data.plants) ? data.plants : [];
      } catch { return []; }
    };
    (async () => {
      const [published, testing, stageSettings] = await Promise.all([
        readCatalog("/assets/studio-plant-catalog.json"),
        readCatalog("/api/studio/assets?catalog=testing"),
        fetch("/api/studio/stage-encounters", { cache: "no-store" }).then(response => response.ok ? response.json() : null).catch(() => null)
      ]);
      if (!active) return;
      const studioPlants = [...published, ...testing].map((plant) => ({
        id: plant.id,
        name: plant.name || plant.id,
        ar: plant.nameAr || plant.name || plant.id,
        role: plant.combat?.mode === "projectile" ? "Projectile attacker"
          : plant.combat?.mode === "blocker" ? "Defensive blocker"
          : plant.combat?.mode === "energy" ? "Energy producer"
          : plant.combat?.mode === "contact" ? "Contact defender" : "Close-range attacker",
        roleAr: plant.combat?.mode === "projectile" ? "مهاجم بالمقذوفات"
          : plant.combat?.mode === "blocker" ? "حاجز دفاعي"
          : plant.combat?.mode === "energy" ? "منتج للطاقة"
          : plant.combat?.mode === "contact" ? "مدافع بضرر تلامسي" : "مهاجم قريب",
        cost: plant.combat?.energyCost ?? 60,
        image: plant.path,
        spriteSheet: Boolean(plant.spriteSheet),
        studio: true,
        testing: testing.some((candidate) => candidate.id === plant.id)
      }));
      const plantMap = new Map([...PLANTS, ...studioPlants].map((plant) => [plant.id, plant]));
      const configuredStage = stageSettings?.stages?.["1"];
      const nextPlants = configuredStage?.plantsConfigured
        ? [...plantMap.values()].filter(plant => configuredStage.plants.some(entry => entry.enabled !== false && entry.id === plant.id))
        : [...plantMap.values()];
      setPlantCatalog(nextPlants);
      let unlocked = STARTER_LOADOUT;
      try { unlocked = loadUnlockedPlantIds(window.localStorage); } catch { /* Starter seeds remain available. */ }
      const studioIds = studioPlants.map((plant) => plant.id);
      // Temporary open-roster mode: all current built-in and Studio catalog plants are unlocked.
      const safeUnlocked = [...new Set([...STARTER_LOADOUT, ...unlocked, ...nextPlants.map((plant) => plant.id), ...studioIds])];
      setUnlockedIds(safeUnlocked);
      try {
        const saved = JSON.parse(window.localStorage.getItem("farmVsMonsters.selectedPlants") || "null");
        const validSaved = Array.isArray(saved)
          ? saved.filter((id) => safeUnlocked.includes(id) && nextPlants.some((plant) => plant.id === id))
          : [];
        const defaultStudioPlants = studioPlants.map((plant) => plant.id);
        // Newly published Studio plants are unlocked and equipped by default;
        // the seven-slot limit applies only to the active loadout, not the catalog.
        setSelected([...new Set([...STARTER_LOADOUT, ...defaultStudioPlants, ...validSaved])].slice(0, MAX_SEEDS));
      } catch {
        setSelected([...new Set([...STARTER_LOADOUT, ...studioPlants.map((plant) => plant.id)])].slice(0, MAX_SEEDS));
      }
    })();
    return () => { active = false; };
  }, []);

  function togglePlant(plant) {
    if (plant.required) return;
    setNotice("");
    if (selected.includes(plant.id)) {
      setSelected(selected.filter((id) => id !== plant.id));
      return;
    }
    if (selected.length >= MAX_SEEDS) {
      setNotice(ar ? "يمكنك تجهيز ٧ نباتات فقط في هذه المعركة." : "You can bring only 7 plants into this battle.");
      return;
    }
    setSelected([...selected, plant.id]);
  }

  function beginBattle() {
    if (!selected.includes("mushroom") || selected.length < 2) {
      setNotice(ar ? "احتفظ بفطر الطاقة واختر نبتة أخرى على الأقل." : "Keep the Energy Mushroom and choose at least one other plant.");
      return;
    }
    try {
      window.localStorage.setItem("farmVsMonsters.selectedPlants", JSON.stringify(selectedPlants.map((plant) => plant.id)));
      router.push("/game");
    } catch {
      setNotice(ar ? "تعذر حفظ التشكيلة. تحقق من إعدادات التخزين في المتصفح." : "Could not save your loadout. Check browser storage settings.");
    }
  }

  return (
    <main className="seed-select-shell" dir={ar ? "rtl" : "ltr"}>
      <header className="seed-select-topbar">
        <Link href="/stage/1" className="seed-select-back">{ar ? "← تفاصيل المرحلة" : "← Stage briefing"}</Link>
        <LanguageToggle />
      </header>
      <section className="seed-select-panel">
        <div className="seed-select-kicker">{ar ? "جهّز فريقك قبل المعركة" : "PREPARE YOUR DEFENDERS"}</div>
        <h1>{ar ? "اختر نباتاتك" : "Choose Your Plants"}</h1>
        <p className="seed-select-intro">{ar
          ? "اختر حتى ٧ نباتات لتحملها إلى ساحة المعركة. فكر في مزيج من الهجوم والدفاع وإنتاج الطاقة."
          : "Choose up to 7 plants to take into battle. Build a balanced team of attackers, defenders, and energy support."}</p>

        <div className="seed-select-status">
          <span>{ar ? "النباتات المختارة" : "SELECTED SEEDS"}</span>
          <strong>{selected.length} / {MAX_SEEDS}</strong>
          <div className="seed-select-meter"><i style={{ width: (selected.length / MAX_SEEDS * 100) + "%" }} /></div>
        </div>

        <div className="seed-select-grid seed-select-catalog-scroll">
          {plantCatalog.map((plant) => {
            const unlocked = true;
            const active = selected.includes(plant.id);
            return (
              <button
                type="button"
                key={plant.id}
                className={"seed-select-card" + (active ? " is-selected" : "") + (plant.required ? " is-required" : "") + (!unlocked ? " is-locked" : "")}
                onClick={() => togglePlant(plant)}
                aria-pressed={active}
                aria-disabled={!unlocked}
                aria-label={(ar ? plant.ar : plant.name) + (active ? (ar ? " مختار" : " selected") : (ar ? " غير مختار" : " not selected"))}
              >
                <span className="seed-select-check">{!unlocked ? "🔒" : active ? "✓" : "+"}</span>
                <span
                  className={"seed-select-art" + ((["radish", "pineapple", "hazelnut", "mango", "snow-thrower"].includes(plant.id) || plant.spriteSheet) ? " is-sprite-sheet" : "")}
                  style={(["radish", "pineapple", "hazelnut", "mango", "snow-thrower"].includes(plant.id) || plant.spriteSheet)
                    ? { aspectRatio: plant.id === "radish" ? "302 / 359" : "1 / 1" }
                    : undefined}
                >
                  <img src={plant.image} alt="" />
                </span>
                <strong>{ar ? plant.ar : plant.name}</strong>
                <small>{ar ? plant.roleAr : plant.role}</small>
                <span className="seed-select-cost">🍄 {plant.cost}</span>
                {plant.required && <em>{ar ? "أساسي" : "REQUIRED"}</em>}{plant.testing && <em className="seed-select-testing">{ar ? "اختبار محلي" : "LOCAL TEST"}</em>}
                {!unlocked && <em className="seed-select-locked-label">{ar ? "مقفلة" : "LOCKED"}</em>}
              </button>
            );
          })}
        </div>

        <div className="seed-select-loadout">
          <strong>{ar ? "تشكيلتك" : "YOUR LOADOUT"}</strong>
          <div>{selectedPlants.map((plant) => <span key={plant.id}>{ar ? plant.ar : plant.name}</span>)}</div>
        </div>

        {notice && <p className="seed-select-notice" role="alert">{notice}</p>}
        <footer className="seed-select-actions">
          <Link href="/stage/1" className="seed-select-secondary">{ar ? "رجوع" : "Back"}</Link>
          <button type="button" className="seed-select-start" onClick={beginBattle}>{ar ? "ابدأ المعركة ←" : "Start Battle →"}</button>
        </footer>
      </section>
    </main>
  );
}
