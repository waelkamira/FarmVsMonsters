"use client";
import Link from "next/link";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import { STAGE_ONE_PLANTS } from "../../game/data/stageOnePlants.mjs";
import CatalogThumb from "../components/CatalogThumb";
export default function PlantsPage(){
 const {locale}=useLocale(); const ar=locale==="ar";
 const plants = STAGE_ONE_PLANTS.filter((plant) => plant.implemented === true);
 return <main className="plant-codex" dir={ar?"rtl":"ltr"}>
  <header className="plant-codex-topbar"><Link href="/" className="plant-codex-back">{ar?"← الرئيسية":"← Home"}</Link><span className="plant-codex-brand">FARM VS MONSTERS <i>/ CODEX</i></span><LanguageToggle/></header>
  <section className="plant-codex-hero"><div className="plant-codex-heading"><span className="plant-codex-kicker">{ar?"دليل المزرعة الميداني":"FIELD GUIDE · BOTANICAL ARCHIVE"}</span><h1>{ar?"موسوعة النباتات":"Plant Codex"}</h1><p>{ar?"تعرّف إلى رفاقك في ساحة المعركة، وقدراتهم وتكلفة نشرهم.":"Meet your battlefield allies, compare their abilities and check deployment costs."}</p></div><div className="plant-codex-count"><strong>{String(plants.length).padStart(2,"0")}</strong><span>{ar?"نباتات جاهزة للمعركة":"BATTLE-READY PLANTS"}</span></div></section>
  <section className="plant-codex-grid" aria-label={ar?"النباتات المتاحة":"Available plants"}>{plants.map((plant,index)=><article className="plant-entry" key={plant.id}><div className="plant-entry-art"><span className="plant-entry-index">{String(index+1).padStart(2,"0")}</span><CatalogThumb id={plant.id} label={ar?plant.nameAr:plant.name} className="plant-entry-thumb"/></div><div className="plant-entry-content"><div className="plant-entry-title-row"><h2>{ar?plant.nameAr:plant.name}</h2><span className="plant-entry-ready" title={ar?"متاح في المعركة":"Available in battle"}>●</span></div><p>{ar?plant.descriptionAr:plant.description}</p><div className="plant-entry-footer"><span className="plant-entry-cost"><b>{plant.energyCost}</b> {ar?"طاقة":"ENERGY"}</span><div className="plant-entry-stats">{(ar?plant.statsAr:plant.stats).slice(0,2).map(stat=><span key={stat}>{stat}</span>)}</div></div></div></article>)}</section>
  <footer className="plant-codex-footer"><span>{ar?"تعرض هذه الموسوعة النباتات المكتملة والقابلة للاستخدام في المعركة فقط.":"Showing completed plants that are available for battle."}</span><nav><Link href="/monsters">{ar?"موسوعة الوحوش ←":"Monster Codex →"}</Link><Link href="/">{ar?"العودة للعبة":"Back to game"}</Link></nav></footer>
 </main>;
}