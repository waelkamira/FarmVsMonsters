"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, LanguageToggle } from "../LocaleProvider";

const controls = [
  { key: "musicVolume", label: "Background music", labelAr: "الموسيقى الخلفية", icon: "🎵", initial: 70 },
  { key: "effectsVolume", label: "Sound effects", labelAr: "المؤثرات الصوتية", icon: "🔊", initial: 80 },
  { key: "projectileVolume", label: "Projectile sounds", labelAr: "أصوات المقذوفات", icon: "💥", initial: 65 }
];

export default function SettingsPage() {
  const { t, locale } = useLocale();
  const ar = locale === "ar";
  const [values, setValues] = useState({ musicVolume: 70, effectsVolume: 80, projectileVolume: 65 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = {};
    controls.forEach(({ key, initial }) => {
      const raw = window.localStorage.getItem("farmVsMonsters.audio." + key);
      const stored = Number(raw);
      next[key] = raw !== null && Number.isFinite(stored) ? Math.max(0, Math.min(100, stored)) : initial;
    });
    setValues(next);
    setReady(true);
  }, []);

  function changeVolume(key, value) {
    const volume = Number(value);
    setValues((current) => ({ ...current, [key]: volume }));
    window.localStorage.setItem("farmVsMonsters.audio." + key, String(volume));
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
              <span className="codex-volume-copy"><strong>{ar ? labelAr : t(label)}</strong><small>{values[key] === 0 ? (ar ? "صامت" : "Muted") : (ar ? "مستوى الصوت" : "Volume level")}</small></span>
              <input aria-label={ar ? labelAr : t(label)} type="range" min="0" max="100" step="1" value={values[key]} disabled={!ready} onChange={(e) => changeVolume(key,e.target.value)} />
              <output>{values[key]}%</output>
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
