import { DEFAULT_PLANT_EFFECTS, getEffect, normalizeEffectIds } from "./effectLibrary.mjs";

/**
 * يحدد التأثيرات المعيّنة لكائن:
 *  - كائن من الاستوديو: القائمة المحفوظة في بياناته (effects).
 *  - نبتة أساسية مدمجة: القائمة الافتراضية في DEFAULT_PLANT_EFFECTS.
 *  - غير ذلك: لا شيء.
 */
export function resolveAssignedEffectIds({ studioEntry = null, builtinPlantType = null } = {}) {
  if (studioEntry && Array.isArray(studioEntry.effects)) return normalizeEffectIds(studioEntry.effects);
  if (!studioEntry && builtinPlantType && DEFAULT_PLANT_EFFECTS[builtinPlantType]) {
    return normalizeEffectIds([...DEFAULT_PLANT_EFFECTS[builtinPlantType]]);
  }
  return [];
}

export function effectsForTrigger(effectIds, trigger) {
  return normalizeEffectIds(effectIds).filter((id) => getEffect(id)?.trigger === trigger);
}

/**
 * يتحقق من اختيار المستخدم قبل الحفظ.
 * يرفض: معرفات مجهولة، تأثيراً لا ينطبق على نوع الأصل، أو أكثر من الحد.
 */
export function validateEffectSelection(assetType, effectIds, max = 4) {
  if (assetType !== "plant" && assetType !== "monster") {
    return { ok: false, error: "التأثيرات متاحة للنباتات والوحوش فقط." };
  }
  if (!Array.isArray(effectIds)) return { ok: false, error: "قائمة التأثيرات غير صالحة." };
  const seen = new Set();
  for (const id of effectIds) {
    const effect = typeof id === "string" ? getEffect(id) : null;
    if (!effect) return { ok: false, error: "تأثير غير معروف: " + String(id).slice(0, 40) };
    if (!effect.appliesTo.includes(assetType)) return { ok: false, error: "التأثير \"" + effect.nameAr + "\" لا ينطبق على هذا النوع." };
    seen.add(id);
  }
  if (seen.size > max) return { ok: false, error: "الحد الأقصى " + max + " تأثيرات لكل أصل." };
  return { ok: true, effects: [...seen] };
}
