"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, LanguageToggle } from "../../../LocaleProvider";

const PLANTS = [
  { id: "radish", name: "Radish", ar: "الفجل", role: "Lane attacker", roleAr: "مهاجم للمسار", cost: 35, image: "/assets/plants/radish.png" },
  { id: "mushroom", name: "Energy Mushroom", ar: "فطر الطاقة", role: "Energy producer · Required", roleAr: "منتج الطاقة · أساسي", cost: 50, image: "/assets/plants/mushroom.png", required: true },
  { id: "tomato", name: "Tomato", ar: "الطماطم", role: "Ranged attacker", roleAr: "مهاجم بعيد", cost: 55, image: "/assets/plants/tomato.png" },
  { id: "pumpkin", name: "Pumpkin", ar: "اليقطين", role: "Heavy blocker", roleAr: "حاجز دفاعي", cost: 75, image: "/assets/plants/pumpkin.png" },
  { id: "onion", name: "Onion", ar: "البصل", role: "Heavy ranged attacker", roleAr: "مهاجم بعيد ثقيل", cost: 65, image: "/assets/plants/Onion.png" },
  { id: "pineapple", name: "Pineapple L1", ar: "الأناناس L1", role: "Arcing bomb attacker", roleAr: "قاذف قنابل مقوسة", cost: 70, image: "/assets/plants/pineapple-level-1.png" },
  { id: "hazelnut", name: "Hazelnut L1", ar: "البندق L1", role: "Arcing bomb attacker", roleAr: "قاذف قنابل مقوسة", cost: 65, image: "/assets/plants/hazelnut-level-1.png" },
  { id: "mango", name: "Mango L1", ar: "المانجو L1", role: "Arcing bomb attacker", roleAr: "قاذف قنابل مقوسة", cost: 70, image: "/assets/plants/mango-level-1.png" }
];

const DEFAULT_LOADOUT = ["radish", "mushroom", "tomato", "pumpkin", "onion", "pineapple", "mango"];
const MAX_SEEDS = 7;

export default function StageOneSeedSelectionPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [selected, setSelected] = useState(DEFAULT_LOADOUT);
  const [notice, setNotice] = useState("");
  const selectedPlants = useMemo(() => PLANTS.filter((plant) => selected.includes(plant.id)), [selected]);

  function togglePlant(plant) {
    if (plant.required) return;
    setNotice("");
    setSelected((current) => {
      if (current.includes(plant.id)) return current.filter((id) => id !== plant.id);
      if (current.length >= MAX_SEEDS) {
        setNotice(ar ? "يمكنك تجهيز ٧ نباتات فقط في هذه المعركة." : "You can bring only 7 plants into this battle.");
        return current;
      }
      return [...current, plant.id];
    });
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

        <div className="seed-select-grid">
          {PLANTS.map((plant) => {
            const active = selected.includes(plant.id);
            return (
              <button
                type="button"
                key={plant.id}
                className={"seed-select-card" + (active ? " is-selected" : "") + (plant.required ? " is-required" : "")}
                onClick={() => togglePlant(plant)}
                aria-pressed={active}
                aria-label={(ar ? plant.ar : plant.name) + (active ? (ar ? " مختار" : " selected") : (ar ? " غير مختار" : " not selected"))}
              >
                <span className="seed-select-check">{active ? "✓" : "+"}</span>
                <span className="seed-select-art"><img src={plant.image} alt="" /></span>
                <strong>{ar ? plant.ar : plant.name}</strong>
                <small>{ar ? plant.roleAr : plant.role}</small>
                <span className="seed-select-cost">🍄 {plant.cost}</span>
                {plant.required && <em>{ar ? "أساسي" : "REQUIRED"}</em>}
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
