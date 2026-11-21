"use client";

import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import { useLocale, LanguageToggle } from "../LocaleProvider";
import { readStorageSnapshot, subscribeToBrowserStorage } from "../../game/hooks/browserStorage.mjs";

const controls = [
  { key: "musicVolume", label: "Background music", labelAr: "الموسيقى الخلفية", icon: "🎵", initial: 70 },
  { key: "effectsVolume", label: "Sound effects", labelAr: "المؤثرات الصوتية", icon: "🔊", initial: 80 },
  { key: "projectileVolume", label: "Projectile sounds", labelAr: "أصوات المقذوفات", icon: "💥", initial: 65 }
];

export default function SettingsPage() {
  const { t, locale } = useLocale();
  const ar = locale === "ar";
  const settingsSnapshot = useSyncExternalStore(subscribeToBrowserStorage, getSettingsSnapshot, () => SETTINGS_SERVER_SNAPSHOT);
  const { values, ready } = JSON.parse(settingsSnapshot);
  const [localValues, setLocalValues] = useState(values);

  function changeVolume(key, value) {
    const volume = Number(value);
    setLocalValues((current) => ({ ...current, [key]: volume }));
    window.localStorage.setItem("farmVsMonsters.audio." + key, String(volume));
    window.dispatchEvent(new Event("farm-storage-change"));
  }

  return (
    <main className="info-shell codex-settings-shell" dir={ar ? "rtl" : "ltr"}>
      <section className="info-card codex-settings-page">
        <header className="codex-page-heading">
          <div><span className="eyebrow">{ar ? "دفتر المزرعة" : "FARM JOURNAL"}</span><h1>{ar ? "الإعدادات" : "Game Options"}</h1></div>
          <LanguageToggle />
        </header>
        <p className="codex-settings-intro">{ar ? "اضبط أصوات عالمك كما تحب. تُحفظ التغييرات في هذا المتصفح وتُستخدم عند بدء المعركة التالية." : "Tune the sounds of your world. Changes are saved in this browser and used when your next battle begins."}</p>
        <div className="codex-settings-board codex-settings-navigation">
          <h2>{ar ? "القائمة" : "GAME MENU"}</h2>
          <div className="codex-settings-links">
            <Link href="/stages">{ar ? "🗺️ خريطة العوالم" : "🗺️ World Map"}</Link>
            <Link href="/plants">{ar ? "🌱 موسوعة النباتات" : "🌱 Plant Inventory"}</Link>
            <Link href="/monsters">{ar ? "🐾 موسوعة الوحوش" : "🐾 Enemy Bestiary"}</Link>
            <Link href="/how-to-play">{ar ? "📜 دليل اللعب" : "📜 Field Guide"}</Link>
            <Link href="/account">{ar ? "☁️ الحساب والحفظ" : "☁️ Account & Save"}</Link>
          </div>
        </div>
        <div className="codex-settings-board">
          <h2>{ar ? "مستويات الصوت" : "SOUND MIXER"}</h2>
          {controls.map(({key,label,labelAr,icon}) => (
            <label className="codex-volume-row" key={key}>
              <span className="codex-volume-icon" aria-hidden="true">{icon}</span>
              <span className="codex-volume-copy"><strong>{ar ? labelAr : t(label)}</strong><small>{localValues[key] === 0 ? (ar ? "صامت" : "Muted") : (ar ? "مستوى الصوت" : "Volume level")}</small></span>
              <input aria-label={ar ? labelAr : t(label)} type="range" min="0" max="100" step="1" value={localValues[key]} disabled={!ready} onChange={(e) => changeVolume(key,e.target.value)} />
              <output>{localValues[key]}%</output>
            </label>
          ))}
        </div>
        <p className="codex-settings-footnote">{ar ? "اجعل أي شريط عند 0٪ لكتم قناته الصوتية. تستخدم هذه الخيارات مفاتيح التخزين نفسها التي تعتمد عليها أصوات المعركة." : "Set any slider to 0% to mute its channel. These options use the same browser storage keys as the battle audio controls."}</p>
        <nav className="info-nav codex-settings-nav">
          <Link className="secondary-link" href="/">{ar ? "العودة إلى القائمة الرئيسية" : "Main Menu"}</Link>
        </nav>
      </section>
    </main>
  );
}
