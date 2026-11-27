"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import "../studio.css";
import "../effects.css";
import EffectCard from "../EffectCard.jsx";
import { EFFECT_LIBRARY, EFFECT_TRIGGERS, listEffectsByCategory } from "../../../game/vfx/effects/effectLibrary.mjs";

export default function EffectsLibraryPage() {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const q = query.trim();
    return listEffectsByCategory()
      .map(({ category, effects }) => ({
        category,
        effects: effects.filter((effect) =>
          (filter === "all" || effect.trigger === filter) &&
          (!q || effect.nameAr.includes(q) || effect.descriptionAr.includes(q) || effect.category.includes(q)))
      }))
      .filter((group) => group.effects.length);
  }, [filter, query]);

  return (
    <main className="studio-shell" dir="rtl">
      <header className="studio-head">
        <div>
          <small>STUDIO · EFFECTS LIBRARY</small>
          <h1>مكتبة التأثيرات</h1>
          <p>{EFFECT_LIBRARY.length} تأثيراً بصرياً وصوتياً جاهزاً. مرّر الفأرة أو اضغط «معاينة» لترى الشكل وتسمع الصوت.</p>
        </div>
        <div className="studio-head-actions"><Link href="/studio">العودة إلى الاستوديو ↗</Link></div>
      </header>

      <section className="studio-detail-panel fx-howto">
        <h2>كيف أطبّق تأثيراً على نبتة أو وحش؟</h2>
        <ol>
          <li>ارفع النبتة أو الوحش من الاستوديو كالمعتاد (أو افتح أصلاً موجوداً من «مكتبة الأصول» ← «تفاصيل الأصل»).</li>
          <li>انزل إلى قسم <b>«✨ تأثيرات النبتة/الوحش»</b> واضغط على التأثير الذي تريده، فيُحفظ ويُطبَّق مباشرة.</li>
          <li>اضغط «اختبار داخل اللعبة» لترى التأثير ويسمع صوته أثناء المعركة، ثم انشر.</li>
        </ol>
        <p className="studio-detail-muted">
          كل تأثير يعمل تلقائياً في لحظته المناسبة (عند الإطلاق، أو الإصابة، أو الظهور، أو الموت...). الأصوات مولَّدة برمجياً بترخيص CC0 (بلا حقوق)،
          ويمكنك استبدال أي صوت بتسجيل حقيقي بنفس الاسم داخل <code>public/assets/audio/effects</code>.
        </p>
      </section>

      <section className="studio-detail-panel">
        <div className="fx-toolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو الوصف…" aria-label="بحث في التأثيرات" />
          <div className="fx-filters" role="tablist" aria-label="تصفية حسب وقت التشغيل">
            <button type="button" className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>الكل</button>
            {Object.values(EFFECT_TRIGGERS).map((trigger) => (
              <button key={trigger.id} type="button" className={filter === trigger.id ? "on" : ""} onClick={() => setFilter(trigger.id)} title={trigger.hint}>{trigger.label}</button>
            ))}
          </div>
        </div>
        {groups.length === 0 && <p className="studio-detail-muted">لا توجد تأثيرات تطابق البحث.</p>}
        {groups.map(({ category, effects }) => (
          <div key={category} className="fx-group">
            <h3>{category}</h3>
            <div className="fx-grid">{effects.map((effect) => <EffectCard key={effect.id} effect={effect} />)}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
