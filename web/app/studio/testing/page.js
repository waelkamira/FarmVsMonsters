"use client";
import { useState } from "react";
import Link from "next/link";

const LABELS = {
  ready: "متوافق مع العقد",
  warning: "يحتاج مراجعة",
  blocked: "محظور",
  excluded: "مستبعد"
};
export default function StudioTestingPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function runAudit() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/studio/testing", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تشغيل الفحص.");
      setReport(data);
    } catch (cause) {
      setError(cause.message || "تعذر تشغيل الفحص.");
    } finally {
      setBusy(false);
    }
  }
  return <main className="studio-shell studio-testing-shell" dir="rtl">
    <header className="studio-head">
      <div><small>FARM VS MONSTERS · QUALITY CONTROL</small><h1>مختبر اختبار الأصول</h1><p>افحص سجل Studio وعقود التوافق قبل تجهيز الأصل للاختبار أو طلب نشره.</p></div>
      <div className="studio-head-actions"><Link href="/stage/1/select">فتح ساحة اختبار اللعبة ↗</Link><Link href="/studio">العودة إلى الاستوديو ↗</Link></div>
    </header>
    <section className="studio-testing-intro">
      <div><b>ما الذي يفحصه المختبر؟</b><p>المعرّفات والمسارات، شبكات Sprite Sheet، ملفات القتال والأنيميشن، ملفات الوحوش، علاقات القذائف والتبعيات، وحالة دورة حياة كل أصل.</p></div>
      <button type="button" disabled={busy} onClick={runAudit}>{busy ? "جارٍ فحص المكتبة..." : "تشغيل فحص المكتبة الآن"}</button>
    </section>
    {error && <p className="studio-testing-error" role="alert">{error}</p>}
    {!report && !error && <section className="studio-testing-empty"><b>لم يتم تشغيل الفحص بعد</b><p>اضغط زر الفحص لقراءة سجل Studio الحالي وإظهار الأصول المتوافقة والمشكلات التي تحتاج إلى إصلاح.</p></section>}
    {report && <>
      <section className="studio-testing-summary">
        <article><small>إجمالي الأصول</small><b>{report.total}</b></article>
        <article><small>متوافق</small><b>{report.ready}</b></article>
        <article><small>تحذيرات</small><b>{report.warning}</b></article>
        <article><small>مشكلات مانعة</small><b>{report.blocked}</b></article>
        <article><small>مستبعد / مؤرشف</small><b>{report.excluded}</b></article>
      </section>
      <section className="studio-testing-report">
        <div className="studio-testing-report-head"><div><h2>نتيجة الفحص</h2><small>{new Date(report.checkedAt).toLocaleString()} · التخزين: {report.storage}</small></div><span>{report.blocked === 0 ? "لا توجد أخطاء مانعة" : "توجد أصول تحتاج إلى إصلاح"}</span></div>
        {report.assets.length === 0 ? <div className="studio-testing-empty">لا توجد أصول في سجل Studio الحالي.</div> : <div className="studio-testing-list">
          {report.assets.map(asset => <article className="studio-testing-asset" key={asset.id || asset.name}>
            <div className="studio-testing-asset-head"><div><b>{asset.name}</b><small>{asset.id || "بدون معرّف"} · {asset.type} · {asset.status}</small></div><em data-readiness={asset.readiness}>{LABELS[asset.readiness] || asset.readiness}</em></div>
            <div className="studio-testing-relations"><span>تبعيات: {asset.dependencyCount}</span><span>أصول تعتمد عليه: {asset.dependentCount}</span><span>{asset.canArchive ? "يمكن أرشفته" : "الأرشفة محمية"}</span><span>{asset.canReplace ? "يمكن استبداله" : "الاستبدال محمي"}</span></div>
            {asset.errors.length > 0 && <div className="studio-testing-messages studio-testing-errors"><b>أخطاء مانعة</b><ul>{asset.errors.map((message,index)=><li key={index}>{message}</li>)}</ul></div>}
            {asset.warnings.length > 0 && <div className="studio-testing-messages studio-testing-warnings"><b>تنبيهات</b><ul>{asset.warnings.map((message,index)=><li key={index}>{message}</li>)}</ul></div>}
            {asset.id && <Link href={"/studio/assets/"+encodeURIComponent(asset.id)}>فتح تفاصيل الأصل ↗</Link>{(asset.type === "plant" || asset.type === "monster") && asset.status === "testing" && asset.readiness !== "blocked" && <Link href="/stage/1/select">اختبار داخل اللعبة ↗</Link>}}
          </article>)}
        </div>}
      </section>
      <p className="studio-testing-limit">{report.note}</p>
    </>}
  </main>;
}
