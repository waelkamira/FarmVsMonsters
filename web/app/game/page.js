"use client";
import Link from "next/link";
import PhaserGame from "../../game/PhaserGame";
import { useLocale, LanguageToggle } from "../LocaleProvider";
export default function GamePage() {
 const {t}=useLocale();
 return <main className="game-shell"><header className="game-header">
 <Link href="/" className="wordmark">Farm <span>Vs</span> Monsters</Link>
 <div className="control-hint">{t("Choose Radish or Mushroom · Click a soil plot to plant · Collect glowing Mushroom energy · WASD / arrows to move · SPACE: emergency club")}</div>
 <LanguageToggle/>
 </header>
 <section className="game-panel" aria-label={t("Stone age battle arena")}><PhaserGame/></section>
 <p className="prototype-note">{t("A prehistoric farm-defense battle. Gather mushroom energy, raise living defenders, and keep the tribe's home safe.")}</p>
 </main>;
}
