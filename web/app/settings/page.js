"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const controls = [
  { key: "musicVolume", label: "Background music", initial: 70 },
  { key: "effectsVolume", label: "Sound effects", initial: 80 },
  { key: "projectileVolume", label: "Projectile sounds", initial: 65 }
];

export default function SettingsPage() {
  const [values, setValues] = useState({ musicVolume: 70, effectsVolume: 80, projectileVolume: 65 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = {};
    controls.forEach(({ key, initial }) => {
      const stored = Number(window.localStorage.getItem("farmVsMonsters.audio." + key));
      next[key] = Number.isFinite(stored) && window.localStorage.getItem("farmVsMonsters.audio." + key) !== null
        ? Math.max(0, Math.min(100, stored)) : initial;
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
    <main className="info-shell">
      <section className="info-card">
        <p className="eyebrow">GAME PREFERENCES</p>
        <h1>Settings</h1>
        <p>Adjust each sound channel independently. Changes are saved in this browser and will be used when the next battle starts.</p>
        {controls.map(({ key, label }) => (
          <label className="settings-row" key={key}>
            <span>{label}</span>
            <input aria-label={label} type="range" min="0" max="100" step="1" value={values[key]} disabled={!ready} onChange={(event) => changeVolume(key, event.target.value)} />
            <output>{values[key]}%</output>
          </label>
        ))}
        <p>Set a slider to 0% to mute that channel. These preferences use the same browser storage keys as the battle audio controls.</p>
        <nav className="info-nav"><Link className="primary-link" href="/game">Return to Battle</Link><Link className="secondary-link" href="/">Main Menu</Link></nav>
      </section>
    </main>
  );
}
