"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale, LanguageToggle } from "../LocaleProvider";
const controls = [
  { key: "musicVolume", label: "Background music", initial: 70 },
  { key: "effectsVolume", label: "Sound effects", initial: 80 },
  { key: "projectileVolume", label: "Projectile sounds", initial: 65 }
];
export default function SettingsPage() {
  const { t } = useLocale();
  const [values, setValues] = useState({ musicVolume: 70, effectsVolume: 80, projectileVolume: 65 });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const next = {};
    controls.forEach(({ key, initial }) => {
      let raw = null;
      try {
        raw = window.localStorage.getItem("farmVsMonsters.audio." + key);
      } catch {
        raw = null;
      }
      const stored = Number(raw);
      next[key] = raw !== null && Number.isFinite(stored) ? Math.max(0, Math.min(100, stored)) : initial;
    });
    queueMicrotask(() => {
      if (!active) return;
      setValues(next);
      setReady(true);
    });
    return () => { active = false; };
  }, []);
  function changeVolume(key, value) {
    const volume = Number(value);
    setValues((current) => ({ ...current, [key]: volume }));
    window.localStorage.setItem("farmVsMonsters.audio." + key, String(volume));
  }
  return <main className="info-shell"><section className="info-card">
    <LanguageToggle />
    <p className="eyebrow">{t("GAME PREFERENCES")}</p><h1>{t("Settings")}</h1>
    <p>{t("Adjust each sound channel independently. Changes are saved in this browser and will be used when the next battle starts.")}</p>
    {controls.map(({key,label}) => <label className="settings-row" key={key}><span>{t(label)}</span><input aria-label={t(label)} type="range" min="0" max="100" step="1" value={values[key]} disabled={!ready} onChange={e=>changeVolume(key,e.target.value)}/><output>{values[key]}%</output></label>)}
    <p>{t("Set a slider to 0% to mute that channel. These preferences use the same browser storage keys as the battle audio controls.")}</p>
    <nav className="info-nav"><Link className="primary-link" href="/game">{t("Return to Battle")}</Link><Link className="secondary-link" href="/">{t("Main Menu")}</Link></nav>
  </section></main>;
}