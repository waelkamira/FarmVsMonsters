import { STUDIO_ASSET_TYPES, STUDIO_ID_PATTERN } from "./assetTypes.mjs";
import { validateStudioPlantCombatProfile } from "./plantProfiles.mjs";
import { validateStudioAnimationProfile } from "./animationProfiles.mjs";
import { validateSkeletalRigProfile } from "./skeletalAnimation.mjs";
import { createStudioMonsterProfile } from "./monsterProfiles.mjs";
import { buildAssetDependencyReport } from "./assetDependencies.mjs";

export function safeAssetPath(value) {
  if (typeof value !== "string" || !value.startsWith("/assets/")) return false;
  if (/[?#\\\x00-\x1f\x7f]/.test(value) || /%(?:2f|5c)/i.test(value)) return false;
  let decoded;
  try { decoded = decodeURIComponent(value); }
  catch { return false; }
  if (!decoded.startsWith("/assets/") || /[?#\\\x00-\x1f\x7f]/.test(decoded)) return false;
  const segments = decoded.slice("/assets/".length).split("/");
  return segments.length > 0 && segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}function addMessage(list, message) {
  if (!list.includes(message)) list.push(message);
}
export function auditStudioAssetRegistry(input) {
  const assets = Array.isArray(input) ? input : [];
  const idCounts = new Map();
  for (const asset of assets) {
    if (asset?.id) idCounts.set(String(asset.id), (idCounts.get(String(asset.id)) || 0) + 1);
  }
  const reports = assets.map((asset) => {
    const errors = [];
    const warnings = [];
    const type = String(asset?.type || "");
    const config = STUDIO_ASSET_TYPES[type];
    const id = String(asset?.id || "");
    if (!config) errors.push("نوع الأصل غير مدعوم في Studio.");
    if (!STUDIO_ID_PATTERN.test(id)) errors.push("المعرّف البرمجي غير صالح.");
    if ((idCounts.get(id) || 0) > 1) errors.push("يوجد أكثر من أصل يحمل المعرّف نفسه.");
    if (!safeAssetPath(asset?.path)) errors.push("مسار ملف الأصل غير صالح أو غير آمن.");
    const frameCount = Math.max(1, Number(asset?.rows || 1) * Number(asset?.columns || 1));
    if (config?.spriteSheet && (!Number.isInteger(Number(asset.rows)) || !Number.isInteger(Number(asset.columns)) ||
        Number(asset.rows) < 1 || Number(asset.columns) < 1 || frameCount > 100)) {
      errors.push("شبكة Sprite Sheet غير صالحة؛ يجب أن يكون مجموع الإطارات بين 1 و100.");
    }
    if (type === "plant") {
      const combat = asset.combat || {};
      const validation = validateStudioPlantCombatProfile({
        ...combat,
        behavior: combat.mode,
        projectile: combat.projectile || null
      });
      if (!validation.valid) validation.errors.forEach((message) => errors.push("إعدادات النبتة: " + message));
      if (combat.mode !== "projectile" && combat.projectile) errors.push("يوجد رابط قذيفة رغم أن سلوك النبتة لا يطلق مقذوفات.");
      if (combat.projectile && !safeAssetPath(combat.projectile.path)) errors.push("مسار القذيفة المرتبطة غير صالح أو غير آمن.");
      if (combat.projectile?.managed === true) {
        const linked = assets.find((candidate) => candidate?.id === combat.projectile.id && candidate.type === "plantProjectile");
        if (!linked) errors.push("القذيفة المُدارة المرتبطة غير موجودة في مكتبة الأصول.");
        else if (linked.status === "archived") errors.push("القذيفة المرتبطة مؤرشفة ولا يمكن استخدامها.");
        else if (!safeAssetPath(linked.path)) errors.push("مسار أصل القذيفة المُدارة غير صالح أو غير آمن.");
        else if (linked.path !== combat.projectile.path) errors.push("مسار القذيفة المحفوظ في النبتة لا يطابق مسار أصل القذيفة الحالي.");
      }
    }
    if (asset?.rigProfile) {
      if (type !== "plant" && type !== "monster") errors.push("ملف الهيكل متاح للنباتات والوحوش فقط.");
      const rigValidation = validateSkeletalRigProfile(asset.rigProfile);
      if (!rigValidation.valid) rigValidation.errors.forEach((message) => errors.push("ملف الهيكل: " + message));
      else {
        for (const bone of rigValidation.profile.bones) {
          if (!bone.part) continue;
          const part = assets.find((candidate) => candidate?.id === bone.part.assetId);
          if (!part || part.status === "archived" || !safeAssetPath(part.path)) {
            errors.push("جزء الهيكل " + bone.id + " غير متاح أو مؤرشف: " + bone.part.assetId + ".");
          }
        }
      }
    }
    if (type === "monster") {
      try { createStudioMonsterProfile(asset.monsterProfile); }
      catch (error) { errors.push("إعدادات الوحش: " + error.message); }
    }
    if (config?.spriteSheet && (type === "plant" || type === "monster")) {
      if (!asset.animationProfile) warnings.push("لا يوجد ملف أنيميشن محفوظ؛ سيستخدم المحرك الإعداد الافتراضي الآمن.");
      else {
        const validation = validateStudioAnimationProfile(asset.animationProfile, frameCount);
        if (!validation.valid) validation.errors.forEach((message) => errors.push("ملف الأنيميشن: " + message));
      }
    }
    const dependencyReport = id ? buildAssetDependencyReport(assets, id) : null;
    for (const dependency of dependencyReport?.unresolved || []) {
      errors.push("تبعية غير محلولة: " + dependency.targetName + ".");
    }
    for (const shared of dependencyReport?.sharedFiles || []) {
      warnings.push("ملف مشترك مع " + shared.usedBy.map((item) => item.assetName).join("، ") + "؛ الاستبدال آمن لأنه ينشئ مساراً جديداً.");
    }
    if (asset.status === "archived") addMessage(warnings, "الأصل مؤرشف ومستبعد من الاختبار والنشر.");
    else if (asset.status === "draft") addMessage(warnings, "مسودة: لم تُجهّز بعد للاختبار داخل اللعبة.");
    else if (asset.status === "testing") addMessage(warnings, "مهيأ للاختبار فقط؛ ليس منشوراً للاعبين.");
    else if (asset.status === "approved") addMessage(warnings, "طلب النشر بانتظار المراجعة والدمج.");
    else if (asset.status !== "published") addMessage(warnings, "حالة الأصل غير معروفة؛ راجع دورة حياته.");
    const readiness = asset.status === "archived" ? "excluded" : errors.length ? "blocked" : warnings.length ? "warning" : "ready";
    return {
      id,
      name: String(asset?.name || id || "أصل بلا معرّف"),
      type,
      status: String(asset?.status || "unknown"),
      readiness,
      errors: [...new Set(errors)],
      warnings: [...new Set(warnings)],
      dependencyCount: dependencyReport?.dependencies?.length || 0,
      dependentCount: dependencyReport?.dependents?.length || 0,
      canArchive: dependencyReport?.canArchive ?? false,
      canReplace: dependencyReport?.canReplace ?? false
    };
  });
  const count = (readiness) => reports.filter((report) => report.readiness === readiness).length;
  return {
    total: reports.length,
    ready: count("ready"),
    warning: count("warning"),
    blocked: count("blocked"),
    excluded: count("excluded"),
    assets: reports
  };
}
