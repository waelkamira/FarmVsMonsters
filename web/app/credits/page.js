"use client";
import Link from "next/link";
import { useLocale, LanguageToggle } from "../LocaleProvider";
export default function CreditsPage() {
 const {t}=useLocale();
 return <main className="info-shell"><article className="info-card">
 <LanguageToggle/><p className="eyebrow">{t("THE PEOPLE AND TOOLS BEHIND THE FARM")}</p><h1>{t("Credits")}</h1>
 <p>{t("Farm Vs Monsters is an independent game project built around a hand-drawn prehistoric farm-defense adventure.")}</p>
 <h2>{t("Game project")}</h2><p><strong>{t("Title:")}</strong> Farm Vs Monsters</p><p><strong>{t("Design and development:")}</strong> Farm Vs Monsters project</p>
 <h2>{t("Technology")}</h2><ul><li>{t("Phaser 3 — 2D game framework")}</li><li>{t("Next.js and React — web application and menus")}</li></ul>
 <h2>{t("Art, sound, and contributors")}</h2><p>{t("Visual assets, animation, sound, and additional contributor credits will be listed here as the final production assets and contributors are approved.")}</p>
 <nav className="info-nav"><Link className="primary-link" href="/game">{t("Play Game")}</Link><Link className="secondary-link" href="/">{t("Main Menu")}</Link></nav>
 </article></main>;
}