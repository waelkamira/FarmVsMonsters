"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import CatalogThumb from "../components/CatalogThumb";
import { STAGE_ONE_MONSTERS, FUTURE_MONSTERS, MONSTER_ROSTER_TOTAL } from "../../game/data/monsterRoster.mjs";
import { loadDiscoveredMonsterIds } from "../../game/rules/phaseOneRules.mjs";
import { subscribeToBrowserStorage } from "../../game/hooks/browserStorage.mjs";

function getDiscoveredSnapshot() {
  try {
    return JSON.stringify(loadDiscoveredMonsterIds(window.localStorage));
  } catch {
    return "[]";
  }
}

export default function MonstersPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const discoveredSnapshot = useSyncExternalStore(subscribeToBrowserStorage, getDiscoveredSnapshot, () => "[]");
  const discoveredIds = JSON.parse(discoveredSnapshot);
  const discoveredCount = STAGE_ONE_MONSTERS.filter((monster) => discoveredIds.includes(monster.id)).length;
  const progress = MONSTER_ROSTER_TOTAL ? Math.round((discoveredCount / MONSTER_ROSTER_TOTAL) * 100) : 0;

  return (
    <main className="monster-codex">
      <header className="monster-codex-topbar">
        <Link href="/" className="monster-codex-back">{ar ? "العودة للقائمة" : "Back to menu"}</Link>
        <span className="monster-codex-brand">FARM <i>VS</i> MONSTERS</span>
        <LanguageToggle />
      </header>

      <section className="monster-codex-hero">
        <div className="monster-codex-heading">
          <span className="monster-codex-kicker">{ar ? "أرشيف المواجهات · سجل المخلوقات" : "ENCOUNTER ARCHIVE · CREATURE INDEX"}</span>
          <h1>{ar ? "موسوعة الوحوش" : "Monster Bestiary"}</h1>
          <p>{ar
            ? "اكتشف خصوم المزرعة وسجّل ظهورهم في المعارك. تظهر تفاصيل الوحش بعد مواجهته، بينما تبقى الكائنات المجهولة مخفية."
            : "Record the creatures threatening the farm. A monster's profile is revealed after your first encounter; unknown creatures remain hidden."}</p>
        </div>
        <div className="monster-codex-total">
          <strong>{String(discoveredCount).padStart(2, "0")}<small> / {MONSTER_ROSTER_TOTAL}</small></strong>
          <span>{ar ? "مخلوقات مكتشفة" : "CREATURES FOUND"}</span>
        </div>
      </section>

      <section className="monster-codex-progress" aria-label={ar ? "تقدم الاكتشاف" : "Discovery progress"}>
        <div className="monster-codex-progress-label">
          <span>{ar ? "تقدم الموسوعة" : "CODEX COMPLETION"}</span>
          <strong>{progress}%</strong>
        </div>
        <div className="monster-codex-progress-track"><span style={{ width: progress + "%" }} /></div>
        <div className="monster-codex-stats">
          <span><i className="is-found" />{ar ? "مكتشف" : "Discovered"} <b>{discoveredCount}</b></span>
          <span><i className="is-hidden" />{ar ? "مجهول" : "Unknown"} <b>{STAGE_ONE_MONSTERS.length - discoveredCount}</b></span>
          <span><i className="is-planned" />{ar ? "قيد التصميم" : "In design"} <b>{FUTURE_MONSTERS.length}</b></span>
        </div>
      </section>

      <section className="monster-codex-section">
        <div className="monster-codex-section-heading">
          <div><span>{ar ? "01 / سجل المواجهات" : "01 / FIELD RECORD"}</span><h2>{ar ? "الوحوش التي واجهتها" : "Encountered creatures"}</h2></div>
          <b>{discoveredCount} / {STAGE_ONE_MONSTERS.length}</b>
        </div>
        <div className="monster-codex-grid">
          {STAGE_ONE_MONSTERS.map((monster, index) => {
            const discovered = discoveredIds.includes(monster.id);
            return (
              <article className={"monster-entry" + (discovered ? " is-discovered" : " is-unknown")} key={monster.id}>
                <div className="monster-entry-art">
                  <span className="monster-entry-index">{String(index + 1).padStart(2, "0")}</span>
                  {discovered
                    ? <CatalogThumb id={monster.icon} label={ar ? monster.nameAr : monster.name} className="monster-entry-thumb" />
                    : <div className="monster-entry-silhouette" aria-label={ar ? "وحش غير مكتشف" : "Undiscovered monster"}>?</div>}
                </div>
                <div className="monster-entry-copy">
                  <span className="monster-entry-status">{discovered
                    ? (ar ? "✓ تم الاكتشاف" : "✓ DISCOVERED")
                    : (ar ? "مجهول · لم تتم مواجهته" : "UNKNOWN · NOT ENCOUNTERED")}</span>
                  <h3>{discovered ? (ar ? monster.nameAr : monster.name) : (ar ? "هوية مجهولة" : "Unknown creature")}</h3>
                  <p>{discovered
                    ? (ar ? monster.descriptionAr : monster.description)
                    : (ar ? "واجه هذا الوحش في المعركة لكشف ملفه." : "Encounter this monster in battle to reveal its profile.")}</p>
                  {discovered && <div className="monster-entry-tags">
                    <span>{ar ? monster.roleAr : monster.role}</span>
                    <span>{ar ? monster.statsAr : monster.stats}</span>
                  </div>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="monster-codex-section monster-future-section">
        <div className="monster-codex-section-heading">
          <div><span>{ar ? "02 / قائمة العالم القادمة" : "02 / EXPANDING WORLD"}</span><h2>{ar ? "مخلوقات قادمة" : "Creatures yet to come"}</h2></div>
          <b>{FUTURE_MONSTERS.length} {ar ? "خانة" : "SLOTS"}</b>
        </div>
        <p className="monster-future-note">{ar
          ? "هذه خانات مستقبلية ضمن خطة الموسوعة. لن تُعرض كشخصيات قابلة للعب أو كأعداء في المراحل قبل اكتمال تصميمها واعتمادها."
          : "Future roster slots only. These are not playable or active enemies until their designs and gameplay are approved."}</p>
        <div className="monster-future-grid">
          {FUTURE_MONSTERS.map((monster, index) => (
            <div className="monster-future-slot" key={monster.id} title={ar ? monster.nameAr : monster.name}>
              <span>{String(index + 2).padStart(2, "0")}</span><i>?</i>
            </div>
          ))}
        </div>
      </section>

      <nav className="monster-codex-nav">
        <Link href="/plants">{ar ? "موسوعة النباتات" : "Plant encyclopedia"} <span>←</span></Link>
        <Link href="/stage/1/select">{ar ? "اختيار النباتات" : "Choose plants"} <span>←</span></Link>
      </nav>
    </main>
  );
}
