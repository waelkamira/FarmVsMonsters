"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import CatalogThumb from "../components/CatalogThumb";

import { STAGE_ONE_MONSTERS, FUTURE_MONSTERS, MONSTER_ROSTER_TOTAL } from "../../game/data/monsterRoster.mjs";
import { loadDiscoveredMonsterIds } from "../../game/rules/phaseOneRules.mjs";

export default function MonstersPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [discoveredIds, setDiscoveredIds] = useState([]);
  useEffect(() => {
    try { setDiscoveredIds(loadDiscoveredMonsterIds(window.localStorage)); } catch { setDiscoveredIds([]); }
  }, []);
  const discoveredCount = STAGE_ONE_MONSTERS.filter((monster) => discoveredIds.includes(monster.id)).length;

  return (
    <main className="info-shell">
      <section className="info-card codex-bestiary-page">
        <div className="stages-top">
          <span className="eyebrow">{ar ? "موسوعة المخلوقات المكتشفة" : "YOUR ENEMY BESTIARY"}</span>
          <LanguageToggle />
        </div>
        <h1>{ar ? "موسوعة الوحوش" : "Enemy Bestiary"}</h1>
        <p className="collection-intro">
          {ar
            ? "تُسجّل الموسوعة كل نوع تراه في المعركة. ابدأ باكتشاف الوحوش واحداً تلو الآخر؛ أما الأنواع غير المكتشفة فتبقى ظلالاً مجهولة حتى تواجهها."
            : "The bestiary records each enemy type when it first enters battle. Discover the creatures one by one; unseen enemies remain mysterious silhouettes until encountered."}
        </p>
        <div className="collection-summary">
          <span>{ar ? "مكتشفة" : "DISCOVERED"}: <strong>{discoveredCount}/{STAGE_ONE_MONSTERS.length}</strong></span>
          <span>{ar ? "لم تكتشف بعد" : "UNKNOWN"}: <strong>{STAGE_ONE_MONSTERS.length - discoveredCount}</strong></span>
          <span>{ar ? "إجمالي الخانات" : "TOTAL ENTRIES"}: <strong>{MONSTER_ROSTER_TOTAL}</strong></span>
        </div>
        <h2 className="collection-section-title">{ar ? "سجل الاكتشافات" : "DISCOVERY RECORD"}</h2>
        <div className="collection-grid">
          {STAGE_ONE_MONSTERS.map((monster) => {
            const discovered = discoveredIds.includes(monster.id);
            return discovered ? (
              <article className="collection-card is-active codex-discovered-enemy" key={monster.id}>
                <CatalogThumb id={monster.icon} label={ar ? monster.nameAr : monster.name} className="monster-thumb" />
                <h2>{ar ? monster.nameAr : monster.name}</h2>
                <span className="collection-status">{ar ? "✓ تم اكتشافه" : "✓ DISCOVERED"}</span>
                <p><strong>{ar ? monster.roleAr : monster.role}</strong></p>
                <p>{ar ? monster.descriptionAr : monster.description}</p>
                <div className="collection-meta">
                  <span>{ar ? monster.statsAr : monster.stats}</span>
                  {monster.spawnNote && <span>{ar ? monster.spawnNoteAr : monster.spawnNote}</span>}
                </div>
              </article>
            ) : (
              <article className="collection-card is-locked codex-unknown-enemy" key={monster.id}>
                <div className="catalog-thumb monster-thumb codex-enemy-silhouette" aria-label={ar ? "وحش لم تكتشفه بعد" : "Undiscovered enemy"}><span>?</span><b>🔒</b></div>
                <h2>{ar ? "هوية مجهولة" : "Unknown Creature"}</h2>
                <span className="collection-status">{ar ? "لم تتم مواجهته" : "NOT ENCOUNTERED"}</span>
                <p>{ar ? "واجه المزيد من الوحوش في المعركة لكشف هويته." : "Encounter this creature in battle to reveal its identity."}</p>
              </article>
            );
          })}
        </div>
        <h2 className="collection-section-title">{ar ? "مخلوقات قادمة" : "Future Creatures"}</h2>
        <p className="collection-intro">
          {ar
            ? "هذه الخانات تحجز مكان الأنواع القادمة في خطة اللعبة. لم نعتمد أسماءها أو قدراتها أو صورها بعد، ولن تظهر في المعركة حتى يكتمل تنفيذها واختبارها."
            : "These entries reserve space for future roster additions. Their names, abilities, and artwork are not approved yet, and they will not appear in battle until implemented and tested."}
        </p>
        <div className="collection-grid">
          {FUTURE_MONSTERS.map((monster) => (
            <article className="collection-card is-locked" key={monster.id}>
              <div className="catalog-thumb monster-thumb is-planned" role="img" aria-label={ar ? "وحش قيد التصميم" : "Monster in design"}>
                <span aria-hidden="true" style={{fontSize: "2.2rem"}}>🔒</span>
              </div>
              <h2>{ar ? monster.nameAr : monster.name}</h2>
              <span className="collection-status">{ar ? "قيد التصميم · غير قابل للعب" : "IN DESIGN · NOT PLAYABLE"}</span>
              <p>{ar ? "لم تُحدد الشخصية أو آلياتها بعد. هذه خانة تنظيمية فقط ضمن قائمة المئة." : "Character concept and gameplay are not defined yet. This is a roster placeholder only."}</p>
            </article>
          ))}
        </div>
        <h2 className="collection-section-title">{ar ? "زعيم المرحلة" : "Stage boss"}</h2>
        <div className="collection-card">
          <CatalogThumb id="dragon" label={ar ? "التنين الشرير" : "The Evil Dragon"} className="monster-thumb boss-thumb" />
          <h2>{ar ? "التنين الشرير" : "The Evil Dragon"}</h2>
          <p>{ar ? "زعيم مستقل عن عدد الوحوش العادية. يظهر في الموجة الخامسة، ويجب هزيمته بعد أتباعه لتحرير الأميرة." : "A separate boss, not included in the ordinary monster count. It appears in Wave 5 and must be defeated after its followers to rescue the princess."}</p>
          <span className="collection-status">{ar ? "زعيم المرحلة الأولى" : "STAGE ONE BOSS"}</span>
        </div>
        <nav className="info-nav collection-back">
          <Link className="secondary-link" href="/">{ar ? "القائمة الرئيسية" : "Main Menu"}</Link>
          <Link className="secondary-link" href="/plants">{ar ? "قائمة النباتات" : "Plant Collection"}</Link>
        </nav>
      </section>
    </main>
  );
}
