/* eslint-disable @next/next/no-img-element -- أيقونات SVG صغيرة ثابتة، لا تستفيد من next/image */
"use client";

import { useEffect, useRef, useState } from "react";
import { EFFECT_TRIGGERS } from "../../game/vfx/effects/effectLibrary.mjs";
import { createEffectPreview } from "../../game/vfx/effects/effectPreview.mjs";

/** بطاقة تأثير: أيقونة + اسم + شرح + معاينة متحركة وصوت. تُستخدم في المكتبة وفي منتقي الأصل. */
export default function EffectCard({ effect, selected = false, onToggle = null, disabled = false }) {
  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const timerRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => {
    previewRef.current?.stop();
    clearTimeout(timerRef.current);
  }, []);

  function preview() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      if (!previewRef.current) previewRef.current = createEffectPreview(canvas, effect, { loop: false });
      previewRef.current.replay();
      setPlaying(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPlaying(false), 1800);
    } catch {
      // المعاينة اختيارية؛ فشلها لا يعطّل الاختيار.
    }
    try {
      const audio = new Audio(effect.soundPath);
      audio.volume = Math.min(1, 0.85 * (effect.sound?.volume ?? 1));
      audio.play().catch(() => {});
    } catch {
      // قد يمنع المتصفح التشغيل قبل أي تفاعل.
    }
  }

  const trigger = EFFECT_TRIGGERS[effect.trigger];
  return (
    <article className={"fx-card" + (selected ? " fx-card-selected" : "")} data-effect-id={effect.id}>
      <div className="fx-card-visual" onMouseEnter={preview}>
        <img className="fx-card-icon" src={effect.iconPath} alt="" width="64" height="64" loading="lazy" />
        <canvas ref={canvasRef} width="240" height="150" className={"fx-card-canvas" + (playing ? " fx-card-canvas-on" : "")} aria-hidden="true" />
        <button type="button" className="fx-card-play" onClick={preview} aria-label={"معاينة الشكل والصوت: " + effect.nameAr}>▶ معاينة</button>
      </div>
      <div className="fx-card-body">
        <h3>{effect.nameAr}</h3>
        <div className="fx-card-badges">
          <span className="fx-badge fx-badge-trigger">{trigger?.label}</span>
          <span className="fx-badge">{effect.category}</span>
        </div>
        <p>{effect.descriptionAr}</p>
        {onToggle && (
          <button type="button" className="fx-card-toggle" disabled={disabled} aria-pressed={selected} onClick={() => onToggle(effect)}>
            {selected ? "✓ مُطبَّق — اضغط للإزالة" : "تطبيق على هذا الأصل"}
          </button>
        )}
      </div>
    </article>
  );
}
