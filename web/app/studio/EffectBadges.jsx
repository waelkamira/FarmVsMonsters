/* eslint-disable @next/next/no-img-element -- أيقونات SVG صغيرة ثابتة، لا تستفيد من next/image */
import { getEffect } from "../../game/vfx/effects/effectLibrary.mjs";

/** صف أيقونات صغير يبيّن التأثيرات المعيّنة لأصل. */
export default function EffectBadges({ ids = [] }) {
  const effects = (Array.isArray(ids) ? ids : []).map(getEffect).filter(Boolean);
  if (!effects.length) return null;
  return (
    <div className="fx-badges-row" aria-label="التأثيرات المطبّقة">
      <small>التأثيرات:</small>
      {effects.map((effect) => (
        <span key={effect.id} className="fx-mini" title={effect.nameAr + " — " + effect.descriptionAr}>
          <img src={effect.iconPath} alt="" width="22" height="22" />
          <b>{effect.nameAr}</b>
        </span>
      ))}
    </div>
  );
}
