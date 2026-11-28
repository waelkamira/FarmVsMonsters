"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import "./review.css";
export default function StageReleaseReviewPage(){
 const params=useSearchParams();
 const stage=String(Math.max(1,Math.min(100,Number(params.get("stage"))||1)));
 const kind=params.get("kind")==="monster"?"monsters":"plants";
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[tested,setTested]=useState(false),[reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[result,setResult]=useState(null);
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/studio/stage-release?stage="+stage,{cache:"no-store",credentials:"same-origin"});const d=await r.json();if(!r.ok)throw Error(d.error||"تعذر تحميل تقرير الإصدار");setData(d);}catch(e){setError(e.message);}finally{setLoading(false);}},[stage]);
 useEffect(()=>{let active=true;Promise.resolve().then(()=>{if(active)load();});return()=>{active=false;};},[load]);
 const draft=useMemo(()=>data?.draft||{},[data]),published=useMemo(()=>data?.published||{},[data]);
 const plants=draft.plants||[],monsters=draft.monsters||[];
 const visiblePlants=plants.filter(x=>x.visible!==false&&x.enabled!==false),activeMonsters=monsters.filter(x=>x.enabled!==false);
 const changes=useMemo(()=>{
  const rows=[];
  if(!data?.published){rows.push("هذه مرحلة جديدة وغير موجودة في إصدار اللاعبين الحالي.");}
  const beforePlants=new Map((published.plants||[]).map(x=>[x.id,x]));
  const afterPlants=new Map((draft.plants||[]).map(x=>[x.id,x]));
  for(const [id,item] of afterPlants){const prev=beforePlants.get(id);if(!prev)rows.push("إضافة نبتة: "+id+" (عدد "+(item.count||1)+").");else{
   if((prev.count||1)!==(item.count||1))rows.push("تغيير عدد "+id+" من "+(prev.count||1)+" إلى "+(item.count||1)+".");
   if((prev.visible!==false&&prev.enabled!==false)!==(item.visible!==false&&item.enabled!==false))rows.push((item.visible===false||item.enabled===false?"إخفاء":"إظهار")+" النبتة "+id+".");
   if((prev.unlocked!==false)!==(item.unlocked!==false))rows.push((item.unlocked===false?"قفل":"فتح")+" النبتة "+id+".");
  }}
  for(const id of beforePlants.keys())if(!afterPlants.has(id))rows.push("إزالة نبتة من المرحلة: "+id+".");
  const keyOf=(x,i)=>String(x.key||x.id+"-wave-"+(x.wave||1)+"-"+i);
  const beforeMonsters=new Map((published.monsters||[]).map((x,i)=>[keyOf(x,i),x]));
  const afterMonsters=new Map((draft.monsters||[]).map((x,i)=>[keyOf(x,i),x]));
  for(const [key,item] of afterMonsters){const prev=beforeMonsters.get(key);if(!prev)rows.push("إضافة ظهور وحش: "+item.id+"، الموجة "+(item.wave||1)+"، العدد "+(item.count||1)+".");else{
   for(const field of ["count","wave","spawnIntervalMs","firstSpawnDelayMs","hpMultiplier","speedMultiplier","damageMultiplier","attackIntervalMultiplier","enabled"])if((prev[field]??null)!==(item[field]??null))rows.push("تعديل "+field+" للوحش "+item.id+" في الموجة "+(item.wave||1)+": "+String(prev[field])+" ← "+String(item[field])+".");
  }}
  for(const key of beforeMonsters.keys())if(!afterMonsters.has(key))rows.push("إزالة ظهور وحش: "+(beforeMonsters.get(key).id||key)+".");
  if((published.background||"")!==(draft.background||""))rows.push("تغيير خلفية المرحلة.");
  if((published.plantsConfigured===true)!==(draft.plantsConfigured===true))rows.push("تغيير حالة إعداد قائمة النباتات.");
  if((published.monstersConfigured===true)!==(draft.monstersConfigured===true))rows.push("تغيير حالة إعداد موجات الوحوش.");
  return rows;
 },[data,published,draft]);
 async function createRelease(){setBusy(true);setError("");try{const r=await fetch("/api/studio/stage-release",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({stage:Number(stage),confirmedTested:tested,confirmedReport:reviewed})});const d=await r.json();if(!r.ok)throw Error(d.error||"تعذر إنشاء طلب الإصدار");setResult(d);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <main className="stage-review" dir="rtl">
  <header><div><small>FARM VS MONSTERS · RELEASE GATE</small><h1>مراجعة ونشر المرحلة {stage}</h1><p>هذه الصفحة هي بوابة انتقال التعديلات من جهازك إلى نسخة اللاعبين.</p></div><Link href={"/studio/stages/"+kind}>العودة لإدارة المرحلة</Link></header>
  <section className="stage-review-warning" role="alert"><b>تحذير قبل النشر</b><p>لا تنشئ طلب الإصدار إلا بعد أن تحفظ التعديلات، وتجرب المرحلة كاملة داخل اللعبة، وتتأكد بنفسك أن النباتات والوحوش والموجات والخلفية والتأثيرات تعمل جيداً. أي خلل يصل إلى نسخة اللاعبين بعد اعتماد الإصدار.</p><Link href={"/stage/1/select?stage="+stage+"&studioPlaytest=1"}>افتح اختبار المرحلة الآن</Link></section>
  {loading?<p>جارٍ تجهيز تقرير المقارنة…</p>:error&&!data?<p className="stage-review-error">{error}</p>:<>
   <section className="stage-review-stats"><article><small>النباتات المضافة</small><strong>{plants.length}</strong><span>{visiblePlants.length} ظاهرة · {plants.length-visiblePlants.length} مخفية</span></article><article><small>النباتات المفتوحة</small><strong>{visiblePlants.filter(x=>x.unlocked!==false).length}</strong><span>{visiblePlants.filter(x=>x.unlocked===false).length} مقفولة</span></article><article><small>الوحوش المفعلة</small><strong>{activeMonsters.length}</strong><span>{activeMonsters.reduce((n,x)=>n+(Number(x.count)||0),0)} إجمالي الظهور</span></article><article><small>حالة النسخة المنشورة</small><strong>{published.published?"منشورة":"غير منشورة"}</strong><span>الفرع: {data.releaseBranch}</span></article></section>
   <section className="stage-review-panel"><h2>تقرير محتويات المرحلة</h2><h3>النباتات</h3>{plants.length?<ul>{plants.map((p,i)=><li key={p.id+"-"+i}><b>{p.id}</b> — العدد {p.count||1} — {p.visible===false||p.enabled===false?"مخفي":p.unlocked===false?"ظاهر ومقفل":"ظاهر ومفتوح"}</li>)}</ul>:<p>لا توجد نباتات في المسودة.</p>}<h3>الوحوش والموجات</h3>{monsters.length?<ul>{monsters.map((m,i)=><li key={(m.key||m.id)+"-"+i}><b>{m.id}</b> — الموجة {m.wave||1} — العدد {m.count||1} — {m.enabled===false?"معطل":"مفعل"} — فاصل الظهور {m.spawnIntervalMs||0}ms — تأخير البداية {m.firstSpawnDelayMs||0}ms — الصحة ×{m.hpMultiplier||1} — السرعة ×{m.speedMultiplier||1} — الضرر ×{m.damageMultiplier||1}</li>)}</ul>:<p>لا توجد وحوش في المسودة.</p>}<h3>إعدادات أخرى</h3><p>الخلفية: {draft.background||"الافتراضية"}</p><p>المقارنة مع النسخة المنشورة: {changes.length?"توجد تغييرات":"لا توجد تغييرات ظاهرة"}</p><p>آخر نسخة إنتاج: <code>{data.releaseSha||"غير متاحة"}</code></p></section>
   <section className="stage-review-panel"><h2>ما الذي تغير؟</h2>{changes.length?<ul>{changes.map(x=><li key={x}>{x}</li>)}</ul>:<p>لا توجد اختلافات في إعداد المرحلة عن النسخة المنشورة.</p>}<p className="stage-review-note">هذا التقرير يعرض ملخصاً منظماً للمسودة الحالية ومقارنة حالة المرحلة. راجع تفاصيل الإعدادات أعلاه قبل المتابعة.</p></section>
   <section className="stage-review-confirm"><h2>تأكيدات إلزامية</h2><label><input type="checkbox" checked={tested} onChange={e=>setTested(e.target.checked)}/> أؤكد أنني شغّلت المرحلة ولعبتها بنفسي واختبرت عملها.</label><label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> أؤكد أنني راجعت تقرير المحتويات والتغييرات وأوافق على إصدار هذه المرحلة.</label><button type="button" disabled={busy||!tested||!reviewed||Boolean(result)} onClick={createRelease}>{busy?"جارٍ إنشاء طلب الإصدار…":"إنشاء طلب إصدار للمراجعة النهائية"}</button><p>هذا الإجراء لا ينشر مباشرة. ينشئ طلب Pull Request إلى فرع الإنتاج. لن يرى اللاعبون التغييرات إلا بعد اعتماد الطلب ودمجه واكتمال نشر Vercel.</p></section>
  </>}
  {error&&data&&<p className="stage-review-error">{error}</p>}
  {result&&<section className="stage-review-success"><h2>تم تجهيز طلب الإصدار</h2><p>{result.message}</p><a href={result.pullRequest} target="_blank" rel="noreferrer">فتح طلب الإصدار #{result.number}</a></section>}
 </main>;
}
