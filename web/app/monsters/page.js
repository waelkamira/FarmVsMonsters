"use client";

import Link from "next/link";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import CatalogThumb from "../components/CatalogThumb";

import { STAGE_ONE_MONSTERS, FUTURE_MONSTERS, MONSTER_ROSTER_TOTAL } from "../../game/data/monsterRoster.mjs";

export default function MonstersPage() {
  const { locale } = useLocale();
  const ar = locale === "ar";

  return (
    <main className="info-shell">
      <section className="info-card codex-bestiary-page">
        <div className="stages-top">
          <span className="eyebrow">{ar ? "دليل أعداء المرحلة الأولى" : "STAGE ONE ENEMY GUIDE"}</span>
          <LanguageToggle />
        </div>
        <h1>{ar ? "موسوعة الوحوش" : "Enemy Bestiary"}</h1>
        <p className="collection-intro">
          {ar
            ? "تضم الموسوعة ١٠٠ خانة للوحوش. الأنواع المنفّذة فقط تظهر كأعداء جاهزين؛ أما بقية الخانات فمعلّمة بوضوح بأنها تصاميم مستقبلية وليست قابلة للعب أو الشراء."
            : "The encyclopedia reserves 100 monster entries. Only implemented types are shown as ready enemies; all remaining entries are clearly marked as future designs, not playable or purchasable."}
        </p>
        <div className="collection-summary">
          <span>{ar ? "أنواع منفّذة" : "IMPLEMENTED"}: <strong>{STAGE_ONE_MONSTERS.length}</strong></span>
          <span>{ar ? "تصاميم مستقبلية" : "PLANNED"}: <strong>{FUTURE_MONSTERS.length}</strong></span>
          <span>{ar ? "إجمالي الخانات" : "TOTAL ENTRIES"}: <strong>{MONSTER_ROSTER_TOTAL}</strong></span>
        </div>
        <h2 className="collection-section-title">{ar ? "الوحوش المعروفة في المرحلة الأولى" : "Known Stage 1 enemies"}</h2>
        <div className="collection-grid">
          {STAGE_ONE_MONSTERS.map((monster) => (
            <article className="collection-card is-active" key={monster.id}>
              <CatalogThumb id={monster.icon} label={ar ? monster.nameAr : monster.name} className="monster-thumb" />
              <h2>{ar ? monster.nameAr : monster.name}</h2>
              <span className="collection-status">{ar ? "✓ منفّذ في اللعبة" : "✓ IMPLEMENTED"}</span>
              <p><strong>{ar ? monster.roleAr : monster.role}</strong></p>
              <p>{ar ? monster.descriptionAr : monster.description}</p>
              <div className="collection-meta">
                <span>{ar ? monster.statsAr : monster.stats}</span>
                {monster.spawnNote && <span>{ar ? monster.spawnNoteAr : monster.spawnNote}</span>}
              </div>
            </article>
          ))}
        </div>
        <h2 className="collection-section-title">{ar ? "الوحوش المجهولة" : "Unknown enemies"}</h2>
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
