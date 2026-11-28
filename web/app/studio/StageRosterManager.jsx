"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./stage-roster.css";
import { resolveSpriteThumbnailGrid, resolveThumbnailSources } from "../../game/studio/spriteSheetGrid.mjs";

const EMPTY={version:1,stages:{"1":{monsters:[],plants:[]}}};
const BUILT_INS={
 plant:[["radish","الفجل"],["mushroom","فطر الطاقة"],["pumpkin","اليقطين"],["pineapple","الأناناس"],["hazelnut","البندق"],["mango","المانجو"],["snow-thrower","قاذف الثلج"],["electric-mushroom","الفطر الكهربائي"]],
 monster:[["monster-01","الوحش 01"]]
};
const BUILTIN_IMAGES={
 plant:{
  radish:"/assets/plants/radish-level-1.png",mushroom:"/assets/plants/mushroom.png",pumpkin:"/assets/plants/pumpkin.png",
  pineapple:"/assets/plants/pineapple-level-1.png",hazelnut:"/assets/plants/hazelnut-level-1.png",mango:"/assets/plants/mango-level-1.png",
  "snow-thrower":"/assets/plants/Snow-thrower-level-1.png"
 },
 monster:{"monster-01":"/assets/characters/monsters/01/01.png"}
 };
const BUILTIN_SHEETS=new Set(["radish","pineapple","hazelnut","mango","snow-thrower"]);
const makeKey=()=> "entry-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
function assetImage(asset,kind){if(asset?.id==="electric-mushroom"&&/Electric-mushroom-level-1\.png/i.test(asset?.path||""))return asset?.previewUrl||"";return asset?.previewUrl||asset?.path||BUILTIN_IMAGES[kind]?.[asset?.id]||"";}
function AssetImage({asset,kind,large=false}) {
 const {primarySrc,fallbackSrc}=resolveThumbnailSources({...asset,path:assetImage(asset,kind)});
 const [imageState,setImageState]=useState({source:primarySrc,src:primarySrc,failed:false});
 const currentState=imageState.source===primarySrc?imageState:{source:primarySrc,src:primarySrc,failed:false};
 const src=currentState.src;
 const failed=currentState.failed;
 const frameCount=Math.max(1,Number(asset?.frameCount)||((Number(asset?.rows)||1)*(Number(asset?.columns)||1)));
 // Any multi-frame plant/monster artwork is a sprite sheet for thumbnail purposes,
 // even when older registry entries are missing the explicit spriteSheet flag.
 const spriteSheet=frameCount>1;
 const fallbackGrid=BUILTIN_SHEETS.has(asset?.id)?{rows:3,columns:3}:{rows:1,columns:1};
 const {rows,columns}=resolveSpriteThumbnailGrid(
  frameCount,
  Number(asset?.rows)||fallbackGrid.rows,
  Number(asset?.columns)||fallbackGrid.columns
 );
 function handleImageError(){
  if(fallbackSrc && src!==fallbackSrc){setImageState({source:primarySrc,src:fallbackSrc,failed:false});return;}
  setImageState({source:primarySrc,src,failed:true});
 }
 const showImage=Boolean(src&&!failed);
 return <div className={"stage-roster-image"+(large?" is-large":"")}>
  {showImage?(spriteSheet?<><img className="stage-roster-image-probe" src={src} alt="" aria-hidden="true" onError={handleImageError}/><div role="img" aria-label={asset?.name||asset?.id||"صورة الأصل"} className="stage-roster-first-frame" style={{backgroundImage:"url("+JSON.stringify(src)+")",backgroundSize:(columns*100)+"% "+(rows*100)+"%",backgroundPosition:"left top"}}/></>:<img src={src} alt={asset?.name||asset?.id||"صورة الأصل"} loading="lazy" onError={handleImageError}/>):<span aria-hidden="true">{asset?.id==="electric-mushroom"?"⚡🍄":kind==="monster"?"👾":"🌱"}</span>}
 </div>;
}
export default function StageRosterManager({kind}){
 const router=useRouter();
 const isMonster=kind==="monster";
 const [stage,setStage]=useState(1),[assets,setAssets]=useState([]),[config,setConfig]=useState(EMPTY),[sha,setSha]=useState(null);
 const [selectedId,setSelectedId]=useState(BUILT_INS[kind][0][0]),[quantity,setQuantity]=useState(1),[wave,setWave]=useState(1);
 const [interval,setInterval]=useState(5000),[delay,setDelay]=useState(0);
 const [hp,setHp]=useState(1),[speed,setSpeed]=useState(1),[damage,setDamage]=useState(1),[attack,setAttack]=useState(1);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[storage,setStorage]=useState("local");
 const stageSettings=config.stages?.[String(stage)]||{};
 const entries=stageSettings[isMonster?"monsters":"plants"]||[];
 const selectable=useMemo(()=>[...BUILT_INS[kind].map(([id,name])=>({id,name,type:kind,builtin:true,...(BUILTIN_SHEETS.has(id)?{spriteSheet:true,rows:3,columns:3,frameCount:9}:{})})),...assets.filter(a=>a.type===kind&&a.status!=="archived"&&(a.status==="published"||a.status==="testing"))].filter((item,index,all)=>all.findIndex(other=>other.id===item.id)===index),[assets,kind]);
 const assetById=useMemo(()=>new Map([...BUILT_INS[kind].map(([id,name])=>[id,{id,name,type:kind,builtin:true,...(BUILTIN_SHEETS.has(id)?{spriteSheet:true,rows:3,columns:3,frameCount:9}:{})}]),...assets.filter(a=>a.type===kind)]),[assets,kind]);
 const load=useCallback(async()=>{
  try{
   const [a,c]=await Promise.all([
    fetch("/api/studio/assets",{cache:"no-store",credentials:"same-origin"}),
    fetch("/api/studio/stage-encounters",{cache:"no-store",credentials:"same-origin"})
   ]);
   const ad=await a.json(),cd=await c.json();
   if(!a.ok)throw Error(ad.error||"تعذر تحميل مكتبة الأصول");
   if(!c.ok)throw Error(cd.error||"تعذر تحميل إعدادات المراحل");
   setAssets(ad.assets||[]);setConfig(cd);setSha(cd.sha||null);setStorage(cd.storage||ad.storage||"local");setMessage("");
  }catch(error){setMessage(error.message);}finally{setLoading(false);}
 },[]);
 useEffect(()=>{let active=true;Promise.resolve().then(()=>{if(active)load();});return()=>{active=false;};},[load]);
 function updateEntries(next){
  setConfig(current=>({...current,stages:{...current.stages,[String(stage)]:{...(current.stages?.[String(stage)]||{monsters:[],plants:[]}),[isMonster?"monsters":"plants"]:next,[isMonster?"monstersConfigured":"plantsConfigured"]:true,published:false}}}));
 }
 function add(){
  if(!selectedId)return;
  const existing=entries.find(x=>x.id===selectedId&&(isMonster?x.wave===wave:true));
  const next=existing?entries.map(x=>x===existing?{...x,count:Math.min(500,x.count+quantity),enabled:true,visible:true,unlocked:true}:x):
   [...entries,{...(isMonster?{key:makeKey(),wave,spawnIntervalMs:interval,firstSpawnDelayMs:delay,hpMultiplier:hp,speedMultiplier:speed,damageMultiplier:damage,attackIntervalMultiplier:attack}:{}),id:selectedId,count:quantity,enabled:true,visible:true,unlocked:true}];
  updateEntries(next);setMessage("أضفنا "+quantity+" إلى إعدادات المرحلة "+stage+". احفظ التغييرات لتطبيقها.");
 }
 function patch(index,changes){updateEntries(entries.map((entry,i)=>i===index?{...entry,...changes}:entry));}
 function updateStageSettings(changes){setConfig(current=>({...current,stages:{...current.stages,[String(stage)]:{...(current.stages?.[String(stage)]||{monsters:[],plants:[]}),...changes,published:false}}}));}
 function remove(index){updateEntries(entries.filter((_,i)=>i!==index));}
 async function persistConfig(){
  const response=await fetch("/api/studio/stage-encounters",{method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({config,sha})});
  const data=await response.json();if(!response.ok)throw Error(data.error||"تعذر الحفظ");
  setConfig(data.config);setSha(data.sha||null);
  return true;
 }
 async function save(){
  setBusy(true);setMessage("");
  try{
   await persistConfig();
   setMessage("تم حفظ إعدادات المرحلة "+stage+" بنجاح.");
  }catch(error){setMessage(error.message);}finally{setBusy(false);}
 }
 async function testStage(){
  setBusy(true);setMessage("");
  try{
   await persistConfig();
   router.push("/stage/1/select?stage="+stage+"&studioPlaytest=1");
  }catch(error){
   setMessage("تعذر حفظ إعدادات المرحلة؛ لم نبدأ الاختبار. "+error.message);
  }finally{setBusy(false);}
 }
 return <main className="stage-roster-shell" dir="rtl">
  <header className="stage-roster-head"><div><small>FARM VS MONSTERS · STUDIO</small><h1>{isMonster?"إدارة وحوش المراحل":"إدارة نباتات المراحل"}</h1><p>{isMonster?"كوّن موجات الوحوش، شاهد صورها، واضبط العدد والقوة وتوقيت الظهور لكل مرحلة.":"اختر النباتات التي ستتاح للاعب في كل مرحلة، مع معاينة صورها وإدارة عددها."}</p></div><div className="stage-roster-head-actions"><button type="button" onClick={testStage} disabled={busy||loading}>{busy?"جارٍ تجهيز الاختبار…":"اختبار هذه المرحلة في المعركة"}</button><Link href="/studio">العودة إلى الاستديو</Link></div></header>
  <section className="stage-roster-toolbar">
   <label>رقم المرحلة<input type="number" min="1" max="100" value={stage} onChange={e=>setStage(Math.max(1,Math.min(100,Number(e.target.value)||1)))}/></label>
   {!isMonster&&<label>خلفية المرحلة<select value={stageSettings.background||"/assets/backgrounds/farm-battlefield-clean.svg"} onChange={e=>updateStageSettings({background:e.target.value})}><option value="/assets/backgrounds/farm-battlefield-clean.svg">مزرعة نظيفة (SVG)</option><option value="/assets/backgrounds/farm-battlefield.jpeg">المزرعة (JPEG)</option></select></label>}
   <label>اختر {isMonster?"الوحش":"النبتة"}<select value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">اختر من المكتبة</option>{selectable.map(a=><option key={a.id} value={a.id}>{a.name||a.id} · {a.id}</option>)}</select></label>
   <label>العدد<input type="number" min="1" max="500" value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(500,Number(e.target.value)||1)))}/><small>من 1 إلى 500</small></label>
   {isMonster&&<><label>رقم الموجة<input type="number" min="1" max={stage===1?5:10} value={wave} onChange={e=>setWave(Math.max(1,Math.min(stage===1?5:10,Number(e.target.value)||1)))}/></label><label>الفاصل بين الظهور (مللي ثانية)<input type="number" min="100" max="60000" step="100" value={interval} onChange={e=>setInterval(Math.max(100,Number(e.target.value)||100))}/></label><label>تأخير أول ظهور (مللي ثانية)<input type="number" min="0" max="120000" step="100" value={delay} onChange={e=>setDelay(Math.max(0,Number(e.target.value)||0))}/></label></>}
   <button type="button" onClick={add} disabled={!selectedId||!selectable.some(a=>a.id===selectedId)}>＋ إضافة {isMonster?"الوحش":"النبتة"}</button>
  </section>
  <section className="stage-roster-picker">
   <div className="stage-roster-section-title"><h2>مكتبة {isMonster?"الوحوش":"النباتات"}</h2><span>{selectable.length} أصل متاح</span></div>
   {loading?<p className="stage-roster-empty">جارٍ تحميل مكتبة الأصول…</p>:<div className="stage-roster-asset-grid">{selectable.map(asset=><button type="button" key={asset.id} className={"stage-roster-asset-card"+(selectedId===asset.id?" is-selected":"")} onClick={()=>setSelectedId(asset.id)} aria-pressed={selectedId===asset.id}><AssetImage asset={asset} kind={kind}/><b>{asset.name||asset.id}</b><small>{asset.id}</small><span>{asset.builtin?"أصل أساسي":asset.status==="published"?"منشور":"قيد الاختبار"}</span></button>)}</div>}
  </section>
  {isMonster&&<section className="stage-roster-strength"><h2>قوة الوحش عند الإضافة</h2><label>الصحة ×<input type="number" min=".1" max="10" step=".1" value={hp} onChange={e=>setHp(Number(e.target.value)||1)}/></label><label>السرعة ×<input type="number" min=".1" max="5" step=".1" value={speed} onChange={e=>setSpeed(Number(e.target.value)||1)}/></label><label>الضرر ×<input type="number" min=".1" max="10" step=".1" value={damage} onChange={e=>setDamage(Number(e.target.value)||1)}/></label><label>فاصل الهجوم ×<input type="number" min=".1" max="10" step=".1" value={attack} onChange={e=>setAttack(Number(e.target.value)||1)}/></label></section>}
  <section className="stage-roster-list"><div className="stage-roster-list-head"><h2>{isMonster?"وحوش المرحلة":"نباتات المرحلة"} {stage}</h2><span>{entries.length} نوع · {entries.reduce((sum,x)=>sum+x.count,0)} إجمالي</span></div>
   {entries.length===0?<p className="stage-roster-empty">لا توجد {isMonster?"وحوش":"نباتات"} مضافة يدوياً لهذه المرحلة بعد. أضف من المكتبة أعلاه.</p>:entries.map((entry,index)=>{const asset=assetById.get(entry.id);return <article className={!entry.enabled?"is-hidden":""} key={entry.key||entry.id+"-"+index}><div className="stage-roster-asset"><AssetImage asset={asset} kind={kind}/><div><b>{asset?.name||entry.id}</b><small>{entry.id} · {entry.visible===false||entry.enabled===false?"مخفي عن اللاعب":entry.unlocked===false?"ظاهر لكنه مقفول":"ظاهر ومفتوح"}</small></div></div><label>العدد<input type="number" min="1" max="500" value={entry.count} onChange={e=>patch(index,{count:Math.max(1,Math.min(500,Number(e.target.value)||1))})}/></label>{isMonster&&<><label>الموجة<input type="number" min="1" max={stage===1?5:10} value={entry.wave} onChange={e=>patch(index,{wave:Math.max(1,Math.min(stage===1?5:10,Number(e.target.value)||1))})}/></label><label>فاصل الظهور ms<input type="number" min="100" max="60000" value={entry.spawnIntervalMs} onChange={e=>patch(index,{spawnIntervalMs:Math.max(100,Number(e.target.value)||100)})}/></label><label>تأخير أول ظهور ms<input type="number" min="0" max="120000" value={entry.firstSpawnDelayMs} onChange={e=>patch(index,{firstSpawnDelayMs:Math.max(0,Number(e.target.value)||0)})}/></label><label>الصحة ×<input type="number" min=".1" max="10" step=".1" value={entry.hpMultiplier} onChange={e=>patch(index,{hpMultiplier:Number(e.target.value)||1})}/></label><label>السرعة ×<input type="number" min=".1" max="5" step=".1" value={entry.speedMultiplier} onChange={e=>patch(index,{speedMultiplier:Number(e.target.value)||1})}/></label><label>الضرر ×<input type="number" min=".1" max="10" step=".1" value={entry.damageMultiplier} onChange={e=>patch(index,{damageMultiplier:Number(e.target.value)||1})}/></label><label>فاصل الهجوم ×<input type="number" min=".1" max="10" step=".1" value={entry.attackIntervalMultiplier} onChange={e=>patch(index,{attackIntervalMultiplier:Number(e.target.value)||1})}/></label></>}
   <div className="stage-roster-actions">{!isMonster&&<><button type="button" onClick={()=>patch(index,{visible:!(entry.visible!==false&&entry.enabled!==false),enabled:!(entry.visible!==false&&entry.enabled!==false)})}>{entry.visible===false||entry.enabled===false?"إظهار للاعب":"إخفاء عن اللاعب"}</button><button type="button" onClick={()=>patch(index,{unlocked:entry.unlocked===false})}>{entry.unlocked===false?"فتح النبتة للاعب":"إبقاء النبتة مقفولة"}</button></>}{isMonster&&<button type="button" onClick={()=>patch(index,{enabled:!entry.enabled})}>{entry.enabled===false?"تفعيل في المرحلة":"تعطيل في المرحلة"}</button>}<button type="button" className="danger" onClick={()=>remove(index)}>إزالة من إعداد المرحلة</button></div></article>})}
  </section>
   <footer className="stage-roster-footer"><span role="status">{storage==="github"?"Production differs · Read only · Git sync happens from development.":"Local changes · Not committed · Not synced"}{message&&" · "+message}</span><div><button type="button" className="secondary" onClick={()=>{setLoading(true);load();}} disabled={busy||loading}>إعادة تحميل</button><button type="button" onClick={save} disabled={busy||loading||storage==="github"}>{busy?"جارٍ الحفظ…":"حفظ مسودة محلية"}</button><Link className="stage-review-link" href={"/studio/stages/review?stage="+stage+"&kind="+kind}>مراجعة ونشر المرحلة</Link></div></footer>
   <p className="stage-roster-note">التحكم هنا خاص بالمرحلة المحددة: للنباتات يمكنك الإظهار والإخفاء والفتح والإغلاق، وللوحوش يمكنك التفعيل والتعطيل أو إزالتها من موجات المرحلة. «إزالة من إعداد المرحلة» لا تحذف الأصل من مكتبة اللعبة؛ الحذف النهائي للأصل يتم من مكتبة الأصول. إعداد المرحلة المنشور هو المرجع الحاسم، ولا تتدخل مكافآت الحملة في فتح نباتاتها.</p>
   <p className="stage-roster-note">«حفظ مسودة محلية» لا يغيّر تجربة الإنتاج؛ «مراجعة ونشر المرحلة» تفتح تقريراً يقارن المسودة بالنسخة المنشورة. لن تصل التغييرات للاعبين إلا بعد مراجعتك وإنشاء طلب إصدار ثم اعتماده ونشره.</p>
 </main>;
}
