"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buildAssetDependencyReport } from "../../../../game/studio/assetDependencies.mjs";
import "../../studio.css";

const TYPE_LABELS = { plant: "نبات", monster: "وحش", plantProjectile: "قذيفة نبات", monsterProjectile: "قذيفة وحش", effect: "مؤثر", item: "عنصر", audio: "صوت" };
const STATUS_LABELS = { draft: "مسودة", testing: "جاهز للاختبار", approved: "بانتظار المراجعة", published: "منشور", archived: "مؤرشف" };
const BEHAVIOR_LABELS = { projectile: "إطلاق مقذوفات", melee: "هجوم قريب", contact: "ضرر تلامسي", blocker: "حاجز دفاعي", energy: "منتج طاقة" };
function DetailRow({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return <div className="studio-detail-row"><span>{label}</span><b>{String(value)}</b></div>;
}
export default function StudioAssetDetailsPage() {
  const { id } = useParams();
  const [assets, setAssets] = useState([]);
  const [asset, setAsset] = useState(null);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/studio/assets", { cache: "no-store", credentials: "same-origin" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "تعذر تحميل تفاصيل الأصل.");
        if (!active) return;
        const list = Array.isArray(data.assets) ? data.assets : [];
        const selected = list.find((item) => item.id === id);
        setAssets(list); setAsset(selected || null); setState(selected ? "ready" : "missing");
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message); setState("error");
      }
    })();
    return () => { active = false; };
  }, [id]);
  const report = useMemo(() => asset ? buildAssetDependencyReport(assets, asset.id) : null, [assets, asset]);
  if (state === "loading") return <main className="studio-shell" dir="rtl"><section className="studio-detail-panel">جارٍ تحميل تفاصيل الأصل…</section></main>;
  if (state === "error") return <main className="studio-shell" dir="rtl"><section className="studio-detail-panel"><h1>تعذر فتح صفحة الأصل</h1><p>{error}</p><Link href="/studio">العودة إلى Studio</Link>{error.toLowerCase().includes("unauthorized") && <p>سجّل الدخول إلى Studio أولاً ثم افتح صفحة التفاصيل.</p>}</section></main>;
  if (state === "missing" || !asset) return <main className="studio-shell" dir="rtl"><section className="studio-detail-panel"><h1>الأصل غير موجود</h1><p>قد يكون قد نُقل أو أُزيل من سجل Studio.</p><Link href="/studio">العودة إلى مكتبة الأصول</Link></section></main>;
  const mediaUrl = asset.previewUrl || asset.path;
  const combat = asset.combat || {};
  return <main className="studio-shell" dir="rtl">
    <header className="studio-head"><div><small>STUDIO · ASSET DETAILS</small><h1>{asset.name || asset.id}</h1><p>{asset.id} · {TYPE_LABELS[asset.type] || asset.type} · v{asset.revision || 1}</p></div><Link href="/studio">العودة إلى مكتبة الأصول</Link></header>
    <section className="studio-detail-hero">
      <div className="studio-detail-media">{asset.type === "audio" ? <><span className="studio-detail-audio-icon">🔊</span><audio controls preload="metadata" src={mediaUrl} /></> : <img src={mediaUrl} alt={asset.name || asset.id} />}</div>
      <div className="studio-detail-summary"><span className="studio-detail-status">{STATUS_LABELS[asset.status] || asset.status || "غير محدد"}</span><h2>معلومات الأصل</h2>
        <DetailRow label="المعرّف" value={asset.id} /><DetailRow label="النوع" value={TYPE_LABELS[asset.type] || asset.type} /><DetailRow label="اسم الملف" value={asset.filename} /><DetailRow label="مسار الملف" value={asset.path} /><DetailRow label="تاريخ الإنشاء" value={asset.createdAt} /><DetailRow label="آخر تعديل" value={asset.updatedAt} /><DetailRow label="تم نسخه من" value={asset.clonedFrom} />
      </div>
    </section>
    {asset.type === "monster" && asset.monsterProfile && <section className="studio-detail-panel"><h2>خصائص الوحش في المعركة</h2><div className="studio-detail-grid"><DetailRow label="نموذج السلوك" value={asset.monsterProfile.baseArchetype}/><DetailRow label="مضاعف الصحة" value={asset.monsterProfile.hpMultiplier}/><DetailRow label="مضاعف السرعة" value={asset.monsterProfile.speedMultiplier}/><DetailRow label="مضاعف الضرر" value={asset.monsterProfile.damageMultiplier}/><DetailRow label="مضاعف زمن الهجوم" value={asset.monsterProfile.attackIntervalMultiplier}/><DetailRow label="مقياس العرض" value={asset.monsterProfile.widthScale}/><DetailRow label="مقياس الارتفاع" value={asset.monsterProfile.heightScale}/><DetailRow label="وزن الظهور" value={asset.monsterProfile.spawnWeight}/><DetailRow label="أول موجة" value={asset.monsterProfile.firstWave}/></div><p className="studio-detail-muted">وزن الظهور صفر يعني أن الوحش غير مضاف إلى جدول الموجات.</p></section>}
    {asset.type === "plant" && <section className="studio-detail-panel"><h2>إعدادات النبتة داخل اللعبة</h2><div className="studio-detail-grid">
      <DetailRow label="نظام السلوك" value={BEHAVIOR_LABELS[combat.mode] || combat.mode} /><DetailRow label="حجم النبتة" value={(combat.sizePercent ?? 100) + "%"} /><DetailRow label="تكلفة الزراعة" value={combat.energyCost} /><DetailRow label="نقاط الصحة" value={combat.hp} /><DetailRow label="الضرر" value={combat.damage} /><DetailRow label="المدى" value={combat.range} /><DetailRow label="فترة التهدئة" value={combat.cooldownMs && combat.cooldownMs + " ms"} /><DetailRow label="سرعة المقذوف" value={combat.projectileSpeed} /><DetailRow label="ارتفاع مسار المقذوف" value={combat.projectileHeight} /><DetailRow label="لون تأثير المقذوف" value={combat.projectileEffectColor} /><DetailRow label="دوران المقذوف" value={combat.projectileRotation && combat.projectileRotation + "°"} /><DetailRow label="صفوف Sprite Sheet" value={asset.rows} /><DetailRow label="أعمدة Sprite Sheet" value={asset.columns} />
    </div>{combat.projectile && <div className="studio-detail-related"><h3>القذيفة المرتبطة</h3><DetailRow label="معرّف القذيفة" value={combat.projectile.id} /><DetailRow label="مصدر القذيفة" value={combat.projectile.managed ? "أصل مستقل من مكتبة Studio" : "ملف مضمّن مع النبتة"} /><DetailRow label="اسم الملف" value={combat.projectile.filename} /><DetailRow label="مسار القذيفة" value={combat.projectile.path} /></div>}</section>}
    {(asset.type === "plant" || asset.type === "monster") && asset.spriteSheet && asset.animationProfile && <section className="studio-detail-panel"><h2>ملف الأنيميشن المحفوظ</h2><div className="studio-detail-grid"><div><b>الخمول</b><p>{asset.animationProfile.idle?.startFrame ?? 0}–{asset.animationProfile.idle?.endFrame ?? 0}</p><small>{asset.animationProfile.idle?.fps ?? 6} FPS · تكرار مستمر</small></div>{asset.type === "monster" && <div><b>التنقل</b><p>{asset.animationProfile.move?.startFrame ?? 0}–{asset.animationProfile.move?.endFrame ?? 0}</p><small>{asset.animationProfile.move?.fps ?? 10} FPS · تكرار مستمر</small></div>}<div><b>الهجوم</b><p>{asset.animationProfile.attack?.startFrame ?? 0}–{asset.animationProfile.attack?.endFrame ?? 0}</p><small>{asset.animationProfile.attack?.fps ?? 12} FPS · تشغيل مرة واحدة</small></div></div></section>}
    <section className="studio-detail-panel"><h2>العلاقات والتبعيات</h2>
      {report?.warnings?.length > 0 && <ul className="studio-detail-warnings">{report.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
      <div className="studio-detail-grid"><div><b>التبعيات التي يستخدمها هذا الأصل</b><p>{report?.dependencies.length || 0}</p></div><div><b>الأصول التي تعتمد عليه</b><p>{report?.dependents.length || 0}</p></div><div><b>الملفات المشتركة</b><p>{report?.sharedFiles.length || 0}</p></div><div><b>يمكن استبداله؟</b><p>{report?.canReplace ? "نعم" : "لا"}</p></div></div>
      <h3>التبعيات</h3>{report?.dependencies.length ? <ul className="studio-detail-list">{report.dependencies.map((dependency, index) => <li key={index}><b>{dependency.targetName}</b><span>{dependency.relation} · {dependency.path || "لا يوجد مسار"}</span><em>{dependency.resolved ? "تم التحقق" : "غير مكتملة"}</em></li>)}</ul> : <p className="studio-detail-muted">لا توجد تبعيات مسجلة لهذا الأصل.</p>}
      <h3>الأصول المعتمدة عليه</h3>{report?.dependents.length ? <ul className="studio-detail-list">{report.dependents.map((dependent) => <li key={dependent.assetId}><b>{dependent.assetName}</b><span>{dependent.assetId} · {TYPE_LABELS[dependent.assetType] || dependent.assetType}</span><em>يعتمد على هذا الأصل</em></li>)}</ul> : <p className="studio-detail-muted">لا توجد أصول أخرى تشير إليه بمعرّف مباشر.</p>}
      {report?.sharedFiles.length > 0 && <><h3>ملفات مشتركة مع نسخ أخرى</h3><ul className="studio-detail-list">{report.sharedFiles.map((shared) => <li key={shared.path}><b>{shared.path}</b><span>{shared.usedBy.map((use) => use.assetName).join("، ")}</span><em>ملف immutable مشترك</em></li>)}</ul></>}
      <p className="studio-detail-muted">{report?.canArchive ? "لا توجد مراجع مباشرة تمنع الأرشفة، مع بقاء ضوابط حالة النشر." : "توجد مراجع أو حالة نشر تستلزم مراجعة قبل الأرشفة."}</p>
    </section>
    <section className="studio-detail-panel"><h2>سجل الإصدارات</h2>{Array.isArray(asset.versions) && asset.versions.length ? <ul className="studio-detail-list">{asset.versions.map((version) => <li key={version.versionNumber}><b>الإصدار {version.versionNumber}</b><span>{version.savedAt || "تاريخ غير متاح"} · {version.filename || version.path}</span><em>محفوظ</em></li>)}</ul> : <p className="studio-detail-muted">لا توجد إصدارات سابقة محفوظة لهذا الأصل.</p>}</section>
  </main>;
}
