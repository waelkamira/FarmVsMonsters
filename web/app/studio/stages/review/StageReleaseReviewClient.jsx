"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useSearchParams} from "next/navigation";
import "./review.css";

const BUILT_INS={
 plants:{
  radish:{name:"الفجل",path:"/assets/plants/radish-level-1.png",combat:{mode:"projectile",hp:150,damage:30,energyCost:60,cooldownMs:1800,range:180}},
  mushroom:{name:"فطر الطاقة",path:"/assets/plants/mushroom.png",combat:{mode:"resource",hp:150,energyAmount:15,energyIntervalMs:12000}},
  pineapple:{name:"الأناناس",path:"/assets/plants/pineapple-level-1.png"},
  pumpkin:{name:"اليقطين",path:"/assets/plants/pumpkin.png"},
  hazelnut:{name:"البندق",path:"/assets/plants/hazelnut-level-1.png"},
  mango:{name:"المانجو",path:"/assets/plants/mango-level-1.png"},
  "snow-thrower":{name:"قاذف الثلج",path:"/assets/plants/Snow-thrower-level-1.png"},
  "electric-mushroom":{name:"الفطر الكهربائي",path:"/assets/plants/Electric-mushroom-level-1.png"}
 },
 monsters:{"01":{name:"الوحش 01",path:"/assets/characters/monsters/01/01.png"}}
};
const fmt=(value,suffix="")=>value===undefined||value===null||value===""?"—":String(value)+suffix;
const multiplier=value=>"×"+(Number(value)||1);
function Stat({label,value,detail}){return <div className="sr-stat"><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>}
function StatePill({children,tone="neutral"}){return <span className={"sr-pill sr-pill-"+tone}>{children}</span>}
function Detail({label,value}){return <div className="sr-detail"><span>{label}</span><b>{value}</b></div>}
function AssetCard({entry,asset,kind,index}){
 const meta=asset||BUILT_INS[kind]?.[entry.id]||{};
 const name=meta.name&&meta.name!==entry.id?meta.name:entry.id;
 const active=kind==="plants"?(entry.visible!==false&&entry.enabled!==false):entry.enabled!==false;
 const unlocked=entry.unlocked!==false;
 const combat=meta.combat||{};
 const anim=meta.animationProfile||{};
 const states=Object.keys(anim);
 const effects=Array.isArray(meta.effects)?meta.effects:[];
 return <article className="sr-asset-card" key={(entry.key||entry.id)+"-"+index}>
  <div className="sr-asset-top">
   <div className="sr-art"><img src={meta.path||meta.previewUrl||"/assets/placeholder.png"} alt={name} onError={e=>{e.currentTarget.style.visibility="hidden";}}/></div>
   <div className="sr-asset-title"><strong>{name}</strong><code>{entry.id}</code><div className="sr-pills"><StatePill tone={active?"green":"red"}>{active?"مفعّل":"معطّل / مخفي"}</StatePill>{kind==="plants"&&<StatePill tone={unlocked?"blue":"amber"}>{unlocked?"مفتوح":"مقفل"}</StatePill>}</div></div>
   <div className="sr-quantity"><small>العدد</small><b>{entry.count??1}</b></div>
  </div>
  {kind==="monsters"?<div className="sr-detail-grid">
   <Detail label="الموجة" value={fmt(entry.wave, " · Wave")}/>
   <Detail label="فاصل الظهور" value={fmt(entry.spawnIntervalMs," ms")}/>
   <Detail label="تأخير أول ظهور" value={fmt(entry.firstSpawnDelayMs," ms")}/>
   <Detail label="الصحة" value={multiplier(entry.hpMultiplier)}/>
   <Detail label="السرعة" value={multiplier(entry.speedMultiplier)}/>
   <Detail label="الضرر" value={multiplier(entry.damageMultiplier)}/>
   <Detail label="فاصل الهجوم" value={multiplier(entry.attackIntervalMultiplier)}/>
   <Detail label="معامل الحجم" value={multiplier(meta.monsterProfile?.widthScale)}/>
  </div>:<div className="sr-detail-grid">
   <Detail label="نمط الهجوم" value={combat.mode||"غير محدد"}/>
   <Detail label="نقاط الصحة" value={fmt(combat.hp)}/>
   <Detail label="الضرر" value={fmt(combat.damage)}/>
   <Detail label="تكلفة الطاقة" value={fmt(combat.energyCost)}/>
   <Detail label="زمن التهدئة" value={fmt(combat.cooldownMs," ms")}/>
   <Detail label="المدى" value={fmt(combat.range)}/>
   <Detail label="سرعة المقذوف" value={fmt(combat.projectileSpeed)}/>
   <Detail label="إنتاج الطاقة" value={combat.energyAmount?fmt(combat.energyAmount)+" / "+fmt(combat.energyIntervalMs," ms"):"—"}/>
  </div>}
  <footer className="sr-asset-foot"><span>الأنيميشن: {states.length?states.join("، "):"غير محدد"}</span><span>المؤثرات: {effects.length?effects.map((effect,i)=>typeof effect==="string"?effect:(effect.name||effect.id||effect.type||"تأثير "+(i+1))).join("، "):"لا توجد مؤثرات مسجلة"}</span><span>الملف: {meta.path||"غير مرتبط"}</span></footer>
  <details className="sr-raw"><summary>عرض سجل الأصل الكامل وبيانات الحركة والتأثيرات</summary><pre>{JSON.stringify(meta,null,2)}</pre></details>
  <details className="sr-raw"><summary>عرض إعداد هذا العنصر داخل المرحلة</summary><pre>{JSON.stringify(entry,null,2)}</pre></details>
 </article>;
}
export default function StageReleaseReviewPage(){
 const params=useSearchParams();
 const stage=String(Math.max(1,Math.min(100,Number(params.get("stage"))||1)));
 const kind=params.get("kind")==="monster"?"monsters":"plants";
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[tested,setTested]=useState(false),[reviewed,setReviewed]=useState(false),[busy,setBusy]=useState(false),[result,setResult]=useState(null);
 const load=useCallback(async()=>{setLoading(true);setError("");try{const r=await fetch("/api/studio/stage-release?stage="+stage,{cache:"no-store",credentials:"same-origin"});const d=await r.json();if(!r.ok)throw Error(d.error||"تعذر تحميل تقرير الإصدار");setData(d);}catch(e){setError(e.message);}finally{setLoading(false);}},[stage]);
 useEffect(()=>{let active=true;Promise.resolve().then(()=>{if(active)load();});return()=>{active=false;};},[load]);
 const draft=data?.draft||{},published=data?.published||{};
 const plants=draft.plants||[],monsters=draft.monsters||[];
 const plantCatalog=useMemo(()=>new Map((data?.plantCatalog?.plants||[]).flatMap(x=>[[x.id,x],[String(x.id).replace(/-level-\d+$/,""),x]])),[data]);
 const monsterCatalog=useMemo(()=>new Map((data?.monsterCatalog?.monsters||[]).flatMap(x=>[[x.id,x],[String(x.id).replace(/-level-\d+$/,""),x]])),[data]);
 const visiblePlants=plants.filter(x=>x.visible!==false&&x.enabled!==false),activeMonsters=monsters.filter(x=>x.enabled!==false);
 const waves=useMemo(()=>[...new Set(monsters.map(x=>Number(x.wave)||1))].sort((a,b)=>a-b),[monsters]);
 const changes=useMemo(()=>{
  const rows=[];
  if(!data?.published)rows.push({type:"new",label:"هذه المرحلة غير موجودة في نسخة اللاعبين الحالية."});
  const beforePlants=new Map((published.plants||[]).map(x=>[x.id,x])),afterPlants=new Map((draft.plants||[]).map(x=>[x.id,x]));
  for(const [id,item] of afterPlants){const prev=beforePlants.get(id);if(!prev)rows.push({type:"add",label:"إضافة نبتة: "+id+" · العدد "+(item.count||1)});else{
   if((prev.count||1)!==(item.count||1))rows.push({type:"edit",label:"تغيير عدد "+id+" من "+(prev.count||1)+" إلى "+(item.count||1)});
   if((prev.visible!==false&&prev.enabled!==false)!==(item.visible!==false&&item.enabled!==false))rows.push({type:"edit",label:(item.visible===false||item.enabled===false?"إخفاء":"إظهار")+" النبتة "+id});
   if((prev.unlocked!==false)!==(item.unlocked!==false))rows.push({type:"edit",label:(item.unlocked===false?"قفل":"فتح")+" النبتة "+id});
  }}
  for(const id of beforePlants.keys())if(!afterPlants.has(id))rows.push({type:"remove",label:"إزالة نبتة من المرحلة: "+id});
  const keyOf=(x,i)=>String(x.key||x.id+"-wave-"+(x.wave||1)+"-"+i);
  const beforeMonsters=new Map((published.monsters||[]).map((x,i)=>[keyOf(x,i),x])),afterMonsters=new Map((draft.monsters||[]).map((x,i)=>[keyOf(x,i),x]));
  for(const [key,item] of afterMonsters){const prev=beforeMonsters.get(key);if(!prev)rows.push({type:"add",label:"إضافة ظهور وحش: "+item.id+" · الموجة "+(item.wave||1)+" · العدد "+(item.count||1)});else for(const field of ["count","wave","spawnIntervalMs","firstSpawnDelayMs","hpMultiplier","speedMultiplier","damageMultiplier","attackIntervalMultiplier","enabled"])if((prev[field]??null)!==(item[field]??null))rows.push({type:"edit",label:"تعديل "+field+" للوحش "+item.id+" · "+String(prev[field])+" ← "+String(item[field])});}
  for(const key of beforeMonsters.keys())if(!afterMonsters.has(key))rows.push({type:"remove",label:"إزالة ظهور وحش: "+(beforeMonsters.get(key).id||key)});
  if((published.background||"")!==(draft.background||""))rows.push({type:"background",label:"تغيير خلفية المرحلة"});
  if((published.plantsConfigured===true)!==(draft.plantsConfigured===true))rows.push({type:"edit",label:"تغيير إعداد قائمة النباتات"});
  if((published.monstersConfigured===true)!==(draft.monstersConfigured===true))rows.push({type:"edit",label:"تغيير إعداد موجات الوحوش"});
  return rows;
 },[data,published,draft]);
 const background=draft.background||"/assets/backgrounds/farm-battlefield-clean.svg";
 const totalSpawns=monsters.reduce((n,x)=>n+(Number(x.count)||0),0);
 async function createRelease(){setBusy(true);setError("");try{const r=await fetch("/api/studio/stage-release",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({stage:Number(stage),confirmedTested:tested,confirmedReport:reviewed})});const d=await r.json();if(!r.ok)throw Error(d.error||"تعذر إنشاء طلب الإصدار");setResult(d);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <main className="stage-review" dir="rtl">
  <header className="sr-header"><div><div className="sr-eyebrow">FARM VS MONSTERS <i/> STUDIO RELEASE CENTER</div><h1>مراجعة إصدار المرحلة <span>#{stage}</span></h1><p>مركز تدقيق بيانات المرحلة ومقارنة المسودة مع إصدار اللاعبين قبل فتح طلب النشر.</p></div><div className="sr-header-actions"><Link href={"/studio/stages/"+kind}>العودة إلى إدارة المرحلة</Link><Link className="sr-play" href={"/stage/1/select?stage="+stage+"&studioPlaytest=1"}>▶ اختبار المرحلة</Link></div></header>
  <section className="sr-alert"><div className="sr-alert-icon">!</div><div><strong>توقف وتحقق قبل إنشاء طلب الإصدار</strong><p>لا تنشئ الطلب قبل حفظ المسودة ولعب المرحلة بنفسك. اختبر اختيار النباتات، فتحها وإغلاقها، كل موجة وتوقيت ظهور الوحوش، الخلفية، والهجمات والتأثيرات. إنشاء الطلب لا ينشر فوراً، لكنه يجهّز تغييرات المرحلة للمراجعة والدمج إلى اللاعبين.</p></div></section>
  {loading?<div className="sr-loading"><span/> جارٍ قراءة إعدادات المرحلة والكتالوجات الفعلية…</div>:error&&!data?<section className="sr-error"><b>تعذر تحميل تقرير المرحلة</b><p>{error}</p><button onClick={load}>إعادة المحاولة</button></section>:<>
   <section className="sr-overview">
    <div className="sr-overview-title"><div><small>STAGE SNAPSHOT</small><h2>ملخص المرحلة الحالية</h2></div><StatePill tone={draft.published?"green":"amber"}>{draft.published?"معلّمة كمنشورة":"مسودة تحتاج مراجعة"}</StatePill></div>
    <div className="sr-stats"><Stat label="نباتات المرحلة" value={plants.length} detail={visiblePlants.length+" ظاهرة · "+(plants.length-visiblePlants.length)+" مخفية"}/><Stat label="النباتات المفتوحة" value={visiblePlants.filter(x=>x.unlocked!==false).length} detail={visiblePlants.filter(x=>x.unlocked===false).length+" مقفولة"}/><Stat label="تكوينات الوحوش" value={monsters.length} detail={activeMonsters.length+" مفعّلة"}/><Stat label="إجمالي الوحوش" value={totalSpawns} detail={waves.length+" موجات مهيأة"}/></div>
    <div className="sr-meta"><span>رقم المرحلة <b>{stage}</b></span><span>إعداد النباتات <b>{draft.plantsConfigured?"مخصص من Studio":"افتراضي"}</b></span><span>إعداد الوحوش <b>{draft.monstersConfigured?"مخصص من Studio":"افتراضي"}</b></span><span>فرع الإنتاج <b>{data.releaseBranch||"—"}</b></span></div>
   </section>
   <section className="sr-background"><div><small>ARENA BACKGROUND</small><h2>ساحة المعركة</h2><p>{background}</p></div><div className="sr-background-preview"><img src={background} alt="خلفية المرحلة" onError={e=>{e.currentTarget.style.display="none";}}/></div></section>
   <section className="sr-section"><div className="sr-section-head"><div><small>PLANT ROSTER</small><h2>نباتات المرحلة</h2></div><StatePill tone="blue">{plants.length} عنصر</StatePill></div>{plants.length?<div className="sr-card-grid">{plants.map((p,i)=><AssetCard key={p.id+"-"+i} entry={p} asset={plantCatalog.get(p.id)} kind="plants" index={i}/>)}</div>:<div className="sr-empty">لا توجد نباتات مضبوطة في مسودة هذه المرحلة.</div>}</section>
   <section className="sr-section"><div className="sr-section-head"><div><small>MONSTER WAVES</small><h2>الوحوش وتوزيع الموجات</h2></div><StatePill tone="purple">{waves.length} موجات · {totalSpawns} ظهور</StatePill></div>{monsters.length?<div className="sr-wave-list">{waves.map(wave=><div className="sr-wave" key={wave}><div className="sr-wave-heading"><b>الموجة {wave}</b><span>{monsters.filter(x=>(Number(x.wave)||1)===wave).reduce((n,x)=>n+(Number(x.count)||0),0)} وحش</span></div><div className="sr-card-grid">{monsters.map((m,i)=>(Number(m.wave)||1)===wave?<AssetCard key={(m.key||m.id)+"-"+i} entry={m} asset={monsterCatalog.get(m.id)} kind="monsters" index={i}/>:null)}</div></div>)}</div>:<div className="sr-empty">لا توجد موجات وحوش مضبوطة في مسودة هذه المرحلة.</div>}</section>
   <section className="sr-section"><div className="sr-section-head"><div><small>CHANGELOG</small><h2>مقارنة المسودة مع نسخة اللاعبين</h2></div><StatePill tone={changes.length?"amber":"green"}>{changes.length} تغيير</StatePill></div><div className="sr-change-list">{changes.length?changes.map((change,i)=><div className="sr-change" key={i}><StatePill tone={change.type==="add"?"green":change.type==="remove"?"red":"amber"}>{change.type==="add"?"إضافة":change.type==="remove"?"إزالة":"تعديل"}</StatePill><span>{change.label}</span></div>):<div className="sr-empty">لا توجد اختلافات بين المسودة والنسخة المنشورة.</div>}</div><div className="sr-version">نسخة الإنتاج المقارنة · SHA <code>{data.releaseSha||"غير متاح"}</code></div></section>
   <section className="sr-confirm"><div className="sr-section-head"><div><small>FINAL RELEASE CHECKLIST</small><h2>مراجعتك قبل إصدار المرحلة</h2></div><StatePill tone="red">تأكيد يدوي مطلوب</StatePill></div><label><input type="checkbox" checked={tested} onChange={e=>setTested(e.target.checked)}/><span><b>لقد لعبت المرحلة بنفسي</b><small>اختبرت سير اللعب والنباتات والوحوش والموجات والخلفية والتأثيرات.</small></span></label><label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/><span><b>راجعت كل البيانات والتغييرات أعلاه</b><small>أوافق على تجهيز طلب إصدار هذه المرحلة بعد مراجعتي للتقرير.</small></span></label><button type="button" disabled={busy||!tested||!reviewed||Boolean(result)} onClick={createRelease}>{busy?"جارٍ إنشاء طلب الإصدار…":"إنشاء طلب الإصدار للمراجعة النهائية"}</button><p>لن تظهر التغييرات للاعبين بمجرد الضغط. سيُنشأ طلب Pull Request منفصل؛ يجب مراجعته ودمجه ثم انتظار نجاح نشر Vercel.</p></section>
  </>}
  {error&&data&&<div className="sr-inline-error">{error}</div>}
  {result&&<section className="sr-success"><h2>تم إنشاء طلب الإصدار</h2><p>{result.message}</p><a href={result.pullRequest} target="_blank" rel="noreferrer">فتح طلب الإصدار #{result.number} ↗</a></section>}
 </main>;
}
