"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import "./stage-roster.css";

const EMPTY={version:1,stages:{"1":{monsters:[],plants:[]}}};
const BUILT_INS={plant:[["radish","الفجل"],["mushroom","فطر الطاقة"],["pumpkin","اليقطين"],["pineapple","الأناناس"],["hazelnut","البندق"],["mango","المانجو"],["snow-thrower","قاذف الثلج"],["electric-mushroom","الفطر الكهربائي"]],monster:[["cave-brute","الوحش المتوازن"],["dust-skitter","الوحش السريع"],["stonehide","الوحش المدرع"],["alpha-brute","الوحش العملاق"]]};
const makeKey=()=> "entry-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
export default function StageRosterManager({kind}){
 const isMonster=kind==="monster";
 const [stage,setStage]=useState(1),[assets,setAssets]=useState([]),[config,setConfig]=useState(EMPTY),[sha,setSha]=useState(null);
 const [selectedId,setSelectedId]=useState(""),[quantity,setQuantity]=useState(1),[wave,setWave]=useState(1);
 const [interval,setInterval]=useState(5000),[delay,setDelay]=useState(0);
 const [hp,setHp]=useState(1),[speed,setSpeed]=useState(1),[damage,setDamage]=useState(1),[attack,setAttack]=useState(1);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const entries=config.stages?.[String(stage)]?.[isMonster?"monsters":"plants"]||[];
 const available=useMemo(()=>[...BUILT_INS[kind].map(([id,name])=>({id,name,type:kind,builtin:true})),...assets.filter(a=>a.type===kind&&a.status!=="archived"&&(a.status==="published"||a.status==="testing"))].filter((item,index,all)=>all.findIndex(other=>other.id===item.id)===index),[assets,kind]);
 const load=useCallback(async()=>{
  const [a,c]=await Promise.all([
   fetch("/api/studio/assets",{cache:"no-store",credentials:"same-origin"}),
   fetch("/api/studio/stage-encounters",{cache:"no-store",credentials:"same-origin"})
  ]);
  const ad=await a.json(),cd=await c.json();
  if(!a.ok)throw Error(ad.error||"تعذر تحميل مكتبة الأصول");
  if(!c.ok)throw Error(cd.error||"تعذر تحميل إعدادات المراحل");
  setAssets(ad.assets||[]);setConfig(cd);setSha(cd.sha||null);
  setSelectedId(current=>current||(BUILT_INS[kind][0]?.[0]||""));
 },[kind]);
 useEffect(()=>{load().catch(e=>setMessage(e.message));},[load]);
 function updateEntries(next){
  setConfig(current=>({...current,stages:{...current.stages,[String(stage)]:{...(current.stages?.[String(stage)]||{monsters:[],plants:[]}),[isMonster?"monsters":"plants"]:next,[isMonster?"monstersConfigured":"plantsConfigured"]:true}}}));
 }
 function add(){
  if(!selectedId)return;
  const existing=entries.find(x=>x.id===selectedId&&(isMonster?x.wave===wave:true));
  let next;
  if(existing){
   next=entries.map(x=>x===existing?{...x,count:Math.min(500,x.count+quantity),enabled:true}:x);
  }else{
   next=[...entries,{...(isMonster?{key:makeKey(),wave,spawnIntervalMs:interval,firstSpawnDelayMs:delay,hpMultiplier:hp,speedMultiplier:speed,damageMultiplier:damage,attackIntervalMultiplier:attack}:{ }),id:selectedId,count:quantity,enabled:true}];
  }
  updateEntries(next);setMessage("أضفنا "+quantity+" إلى إعدادات المرحلة "+stage+". احفظ التغييرات لتطبيقها.");
 }
 function patch(index,changes){updateEntries(entries.map((entry,i)=>i===index?{...entry,...changes}:entry));}
 function remove(index){updateEntries(entries.filter((_,i)=>i!==index));}
 async function save(){
  setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/studio/stage-encounters",{method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({config,sha})});
   const data=await response.json();if(!response.ok)throw Error(data.error||"تعذر الحفظ");
   setConfig(data.config);setSha(data.sha||null);setMessage("تم حفظ إعدادات المرحلة "+stage+" بنجاح.");
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 return <main className="stage-roster-shell" dir="rtl">
  <header className="stage-roster-head"><div><small>FARM VS MONSTERS · STUDIO</small><h1>{isMonster?"إدارة وحوش المراحل":"إدارة نباتات المراحل"}</h1><p>{isMonster?"حدد الوحوش التي تظهر في كل مرحلة، عددها، قوتها، وتوقيت دخولها.":"اعرف النباتات المتاحة في المرحلة، أضفها أو أخفها وحدد عدد مرات استخدامها دون حذف الأصل من المكتبة."}</p></div><Link href="/studio">العودة إلى الاستديو</Link></header>
  <section className="stage-roster-toolbar">
   <label>رقم المرحلة<input type="number" min="1" max="100" value={stage} onChange={e=>setStage(Math.max(1,Math.min(100,Number(e.target.value)||1)))}/></label>
   <label>اختر {isMonster?"الوحش":"النبتة"}<select value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">اختر من المكتبة</option>{available.map(a=><option key={a.id} value={a.id}>{a.name||a.id} · {a.id}</option>)}</select></label>
   <label>العدد<input type="number" min="1" max="500" value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(500,Number(e.target.value)||1)))}/><small>الافتراضي 1 — يمكنك إضافة حتى 500</small></label>
   {isMonster&&<><label>رقم الموجة<input type="number" min="1" max={stage===1?5:10} value={wave} onChange={e=>setWave(Math.max(1,Math.min(stage===1?5:10,Number(e.target.value)||1)))}/></label><label>الفاصل بين الظهور (مللي ثانية)<input type="number" min="100" max="60000" step="100" value={interval} onChange={e=>setInterval(Math.max(100,Number(e.target.value)||100))}/></label><label>تأخير أول ظهور (مللي ثانية)<input type="number" min="0" max="120000" step="100" value={delay} onChange={e=>setDelay(Math.max(0,Number(e.target.value)||0))}/></label></>}
   <button type="button" onClick={add} disabled={!selectedId}>＋ إضافة {isMonster?"الوحش":"النبتة"}</button>
  </section>
  {isMonster&&<section className="stage-roster-strength"><h2>قوة الوحش عند الإضافة</h2><label>الصحة ×<input type="number" min=".1" max="10" step=".1" value={hp} onChange={e=>setHp(Number(e.target.value)||1)}/></label><label>السرعة ×<input type="number" min=".1" max="5" step=".1" value={speed} onChange={e=>setSpeed(Number(e.target.value)||1)}/></label><label>الضرر ×<input type="number" min=".1" max="10" step=".1" value={damage} onChange={e=>setDamage(Number(e.target.value)||1)}/></label><label>فاصل الهجوم ×<input type="number" min=".1" max="10" step=".1" value={attack} onChange={e=>setAttack(Number(e.target.value)||1)}/></label></section>}
  <section className="stage-roster-list"><div className="stage-roster-list-head"><h2>{isMonster?"وحوش المرحلة":"نباتات المرحلة"} {stage}</h2><span>{entries.length} نوع · {entries.reduce((sum,x)=>sum+x.count,0)} إجمالي</span></div>
   {entries.length===0?<p className="stage-roster-empty">لا توجد {isMonster?"وحوش":"نباتات"} مضافة يدوياً لهذه المرحلة بعد. أضف من المكتبة أعلاه.</p>:entries.map((entry,index)=>{const asset=available.find(a=>a.id===entry.id);return <article className={!entry.enabled?"is-hidden":""} key={entry.key||entry.id+"-"+index}><div className="stage-roster-asset"><b>{asset?.name||entry.id}</b><small>{entry.id} · {entry.enabled?"ظاهر في المرحلة":"مخفي من المرحلة"}</small></div><label>العدد<input type="number" min="1" max="500" value={entry.count} onChange={e=>patch(index,{count:Math.max(1,Math.min(500,Number(e.target.value)||1))})}/></label>{isMonster&&<><label>الموجة<input type="number" min="1" max={stage===1?5:10} value={entry.wave} onChange={e=>patch(index,{wave:Math.max(1,Math.min(stage===1?5:10,Number(e.target.value)||1))})}/></label><label>فاصل الظهور ms<input type="number" min="100" max="60000" value={entry.spawnIntervalMs} onChange={e=>patch(index,{spawnIntervalMs:Math.max(100,Number(e.target.value)||100)})}/></label><label>تأخير أول ظهور ms<input type="number" min="0" max="120000" value={entry.firstSpawnDelayMs} onChange={e=>patch(index,{firstSpawnDelayMs:Math.max(0,Number(e.target.value)||0)})}/></label><label>الصحة ×<input type="number" min=".1" max="10" step=".1" value={entry.hpMultiplier} onChange={e=>patch(index,{hpMultiplier:Number(e.target.value)||1})}/></label><label>السرعة ×<input type="number" min=".1" max="5" step=".1" value={entry.speedMultiplier} onChange={e=>patch(index,{speedMultiplier:Number(e.target.value)||1})}/></label><label>الضرر ×<input type="number" min=".1" max="10" step=".1" value={entry.damageMultiplier} onChange={e=>patch(index,{damageMultiplier:Number(e.target.value)||1})}/></label><label>فاصل الهجوم ×<input type="number" min=".1" max="10" step=".1" value={entry.attackIntervalMultiplier} onChange={e=>patch(index,{attackIntervalMultiplier:Number(e.target.value)||1})}/></label></>}
   <div className="stage-roster-actions"><button type="button" onClick={()=>patch(index,{enabled:!entry.enabled})}>{entry.enabled?"إخفاء من المرحلة":"إظهار في المرحلة"}</button><button type="button" className="danger" onClick={()=>remove(index)}>إزالة من إعداد المرحلة</button></div></article>})}
  </section>
  <footer className="stage-roster-footer"><span>{message}</span><button type="button" onClick={save} disabled={busy}>{busy?"جارٍ الحفظ…":"حفظ إعدادات المرحلة"}</button></footer>
  <p className="stage-roster-note">الإخفاء والإزالة هنا يخصان المرحلة المحددة فقط. لا يتم حذف أي ملف أو أصل من مكتبة الأصول. المعركة الموصولة حالياً بالمحرك هي المرحلة الأولى؛ إعدادات أرقام المراحل الأخرى تُحفظ لتوصيلها عند تجهيز معاركها.</p>
 </main>;
}
