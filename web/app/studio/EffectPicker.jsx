/* eslint-disable @next/next/no-img-element -- أيقونات SVG صغيرة ثابتة، لا تستفيد من next/image */
"use client";

import { useMemo, useState } from "react";
import { EFFECT_TRIGGERS, MAX_EFFECTS_PER_ASSET, getEffect, listEffects } from "../../game/vfx/effects/effectLibrary.mjs";
import EffectCard from "./EffectCard.jsx";
import "./effects.css";

/**
 * اختيار تأثيرات لنبتة أو وحش: اضغط على التأثير فيُحفظ ويُطبَّق مباشرة.
 * التأثيرات تجميلية (صورة + صوت) ولا تغيّر قوة الكائن.
 */
export default function EffectPicker({ asset, onSaved }) {
  const [selected, setSelected] = useState(() => (Array.isArray(asset.effects) ? asset.effects : []));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ kind: "", text: "" });
  const [filter, setFilter] = useState("all");

  const kindLabel = asset.type === "monster" ? "الوحش" : "النبتة";
  const available = useMemo(() => listEffects({ appliesTo: asset.type }), [asset.type]);
  const shown = filter === "all" ? available : available.filter((effect) => effect.trigger === filter);
  const locked = asset.status === "archived";

  async function save(next) {
    const previous = selected;
    setSelected(next);
    setSaving(true);
    setMessage({ kind: "", text: "" });
    try {
      const response = await fetch("/api/studio/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: asset.id, operation: "set-effects", effects: next })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ التأثيرات.");
      setSelected(Array.isArray(data.asset?.effects) ? data.asset.effects : next);
      setMessage({ kind: "ok", text: data.message || "تم الحفظ." });
      onSaved?.(data.asset);
    } catch (error) {
      setSelected(previous);
      setMessage({ kind: "error", text: error.message || "تعذر حفظ التأثيرات." });
    } finally {
      setSaving(false);
    }
  }

  function toggle(effect) {
    if (saving || locked) return;
    if (selected.includes(effect.id)) return save(selected.filter((id) => id !== effect.id));
    if (selected.length >= MAX_EFFECTS_PER_ASSET) {
      setMessage({ kind: "error", text: "الحد الأقصى " + MAX_EFFECTS_PER_ASSET + " تأثيرات لكل أصل. أزل تأثيراً أولاً." });
      return;
    }
    return save([...selected, effect.id]);
  }

  return (
    <section className="studio-detail-panel fx-picker" data-testid="effect-picker">
      <h2>✨ تأثيرات {kindLabel} (صورة وصوت)</h2>
      <p className="fx-picker-hint">
        اضغط على أي تأثير لتطبيقه مباشرة على هذا الأصل، واضغط عليه مرة أخرى لإزالته. «▶ معاينة» تعرض الشكل وتشغّل الصوت.
        التأثيرات تجميلية فقط ولا تغيّر قوة {kindLabel} أو الضرر. الحد الأقصى {MAX_EFFECTS_PER_ASSET}.
      </p>

      <div className="fx-selected" aria-live="polite">
        <b>المطبّق الآن ({selected.length}/{MAX_EFFECTS_PER_ASSET}):</b>
        {selected.length === 0 && <span className="fx-none">لا يوجد — اختر من القائمة أدناه</span>}
        {selected.map((id) => {
          const effect = getEffect(id);
          return effect ? (
            <button key={id} type="button" className="fx-chip" disabled={saving || locked} onClick={() => toggle(effect)} title="اضغط للإزالة">
              <img src={effect.iconPath} alt="" width="22" height="22" />
              {effect.nameAr} <span aria-hidden="true">×</span>
            </button>
          ) : null;
        })}
        {saving && <em className="fx-saving">جارٍ الحفظ…</em>}
      </div>
      {message.text && <p className={"fx-message fx-message-" + (message.kind || "info")} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
      {locked && <p className="fx-message fx-message-error">الأصل مؤرشف. استعده أولاً لتعديل تأثيراته.</p>}

      <div className="fx-filters" role="tablist" aria-label="تصفية التأثيرات">
        <button type="button" className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>الكل ({available.length})</button>
        {Object.values(EFFECT_TRIGGERS).map((trigger) => {
          const count = available.filter((effect) => effect.trigger === trigger.id).length;
          return count ? <button key={trigger.id} type="button" className={filter === trigger.id ? "on" : ""} onClick={() => setFilter(trigger.id)}>{trigger.label} ({count})</button> : null;
        })}
      </div>

      <div className="fx-grid">
        {shown.map((effect) => (
          <EffectCard key={effect.id} effect={effect} selected={selected.includes(effect.id)} onToggle={toggle} disabled={saving || locked} />
        ))}
      </div>
    </section>
  );
}
