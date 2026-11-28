import {NextResponse} from "next/server";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {verifyStudioSession} from "../../../../game/studio/signedSession.mjs";
import {canWriteStudioStorage} from "../../../../game/studio/storageDriver.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const COOKIE="fvm_studio_session";
const REPOSITORY=process.env.STUDIO_GITHUB_REPOSITORY||"waelkamira/FarmVsMonsters";
const RELEASE_BRANCH=process.env.STUDIO_PUBLISH_BRANCH||"main";
const CONFIG_PATH="web/game/data/stageEncounterConfig.json";
const authorized=req=>verifyStudioSession(process.env.STUDIO_SESSION_SECRET||"",req.cookies.get(COOKIE)?.value||"");
const headers=token=>({Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"});
async function github(token,url,options={}){
 const response=await fetch(url,{...options,headers:{...headers(token),...(options.headers||{})},cache:"no-store"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){
  const error=new Error(data.message||"GitHub request failed ("+response.status+").");
  error.status=response.status;
  throw error;
 }
 return data;
}
function normalize(value){
 const source=value&&typeof value==="object"?value:{version:1,stages:{}};
 const stages={};
 for(const [id,stage] of Object.entries(source.stages||{})){
  stages[id]={...stage,published:stage?.published===true,
   plants:(Array.isArray(stage?.plants)?stage.plants:[]).map(p=>({...p,visible:p.visible!==false&&p.enabled!==false,enabled:p.visible!==false&&p.enabled!==false,unlocked:p.unlocked!==false})),
   monsters:(Array.isArray(stage?.monsters)?stage.monsters:[]).map(m=>({...m,enabled:m.enabled!==false}))
  };
 }
 return {version:1,stages};
}
const canonicalAssetId=id=>String(id||"").toLowerCase().replace(/-level-\d+$/,"");
async function readJson(relativePath,fallback){
 try{return JSON.parse(await readFile(path.join(process.cwd(),relativePath),"utf8"));}
 catch(error){if(fallback!==undefined)return fallback;throw error;}
}
async function localConfig(){return normalize(await readJson("game/data/stageEncounterConfig.json"));}
async function publishedConfig(token,branch=RELEASE_BRANCH){
 const data=await github(token,"https://api.github.com/repos/"+REPOSITORY+"/contents/"+CONFIG_PATH+"?ref="+encodeURIComponent(branch));
 return {config:normalize(JSON.parse(Buffer.from(data.content||"","base64").toString("utf8"))),sha:data.sha};
}
export async function GET(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 try{
  const token=process.env.STUDIO_GITHUB_TOKEN;
  if(!token)throw new Error("STUDIO_GITHUB_TOKEN is not configured.");
  const stageId=String(Math.max(1,Math.min(100,Math.floor(Number(new URL(req.url).searchParams.get("stage"))||1))));
  const [draft,release,plantCatalog,monsterCatalog]=await Promise.all([
   localConfig(),publishedConfig(token),
   readJson("public/assets/studio-plant-catalog.json",{version:1,plants:[]}),
   readJson("public/assets/studio-monster-catalog.json",{version:1,monsters:[]})
  ]);
  const stage=draft.stages[stageId]||null;
  const publishedStage=release.config.stages[stageId]||null;
  const stagePlantIds=new Set((stage?.plants||[]).map(x=>canonicalAssetId(x.id)));
  const stageMonsterIds=new Set((stage?.monsters||[]).map(x=>canonicalAssetId(x.id)));
  const plantRecords=(plantCatalog.plants||[]).filter(x=>stagePlantIds.has(canonicalAssetId(x.id)));
  const monsterRecords=(monsterCatalog.monsters||[]).filter(x=>stageMonsterIds.has(canonicalAssetId(x.id)));
  const plantIds=new Set((plantCatalog.plants||[]).map(x=>canonicalAssetId(x.id)));
  const monsterIds=new Set((monsterCatalog.monsters||[]).map(x=>canonicalAssetId(x.id)));
  return NextResponse.json({
   stage:stageId,draft:stage,published:publishedStage,releaseSha:release.sha,releaseBranch:RELEASE_BRANCH,
   plantCatalog:{version:plantCatalog.version||1,plants:plantRecords},
   monsterCatalog:{version:monsterCatalog.version||1,monsters:monsterRecords},
   catalogCoverage:{plants:stage?.plants?.map(x=>({id:x.id,found:plantIds.has(canonicalAssetId(x.id))}))||[],monsters:stage?.monsters?.map(x=>({id:x.id,found:monsterIds.has(canonicalAssetId(x.id))}))||[]},
   reportGeneratedAt:new Date().toISOString()
  },{headers:{"Cache-Control":"no-store"}});
 }catch(error){return NextResponse.json({error:error.message||"Could not load release comparison."},{status:502});}
}
export async function POST(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 if(!canWriteStudioStorage())return NextResponse.json({error:"النشر المباشر متاح من بيئة التطوير المحلية فقط."},{status:403});
 try{
  const body=await req.json();
  const stageId=String(Math.max(1,Math.min(100,Math.floor(Number(body.stage)||1))));
  if(body.confirmedTested!==true||body.confirmedReport!==true)return NextResponse.json({error:"يجب تأكيد تجربة المرحلة ومراجعة التقرير قبل النشر المباشر."},{status:400});
  const token=process.env.STUDIO_GITHUB_TOKEN;
  if(!token)throw new Error("STUDIO_GITHUB_TOKEN is not configured.");
  const draft=await localConfig();
  const stage=draft.stages[stageId];
  if(!stage)return NextResponse.json({error:"المرحلة غير موجودة في المسودة المحلية."},{status:404});
  const plants=(stage.plants||[]).filter(p=>p.visible!==false&&p.enabled!==false);
  const monsters=(stage.monsters||[]).filter(m=>m.enabled!==false);
  if(!plants.length)return NextResponse.json({error:"لا يمكن نشر مرحلة بلا نباتات ظاهرة للاعب."},{status:409});
  if(!monsters.length)return NextResponse.json({error:"لا يمكن نشر مرحلة بلا وحوش مفعلة."},{status:409});
  const plantCatalog=await readJson("public/assets/studio-plant-catalog.json",{plants:[]});
  const monsterCatalog=await readJson("public/assets/studio-monster-catalog.json",{monsters:[]});
  const plantIds=new Set(["radish","radish-level-1","mushroom","energy-mushroom","pumpkin","pumpkin-level-1","pineapple","pineapple-level-1","hazelnut","hazelnut-level-1","mango","mango-level-1","snow-thrower","snow-thrower-level-1","electric-mushroom","electric-mushroom-level-1",...(plantCatalog.plants||[]).map(x=>String(x.id||"").toLowerCase())]);
  const monsterIds=new Set((monsterCatalog.monsters||[]).map(x=>String(x.id||"").toLowerCase()));
  const missingPlants=plants.map(x=>x.id).filter(id=>!plantIds.has(id));
  const missingMonsters=monsters.map(x=>x.id).filter(id=>!monsterIds.has(id));
  if(missingPlants.length||missingMonsters.length)return NextResponse.json({error:"بعض أصول المرحلة غير موجودة في كتالوج الإنتاج. انشر الأصول أولاً ثم أعد المحاولة.",missingPlants,missingMonsters},{status:409});

  // Refuse to publish if the production snapshot changed after the user reviewed it.
  if(typeof body.expectedReleaseSha!=="string"||!body.expectedReleaseSha){
   return NextResponse.json({error:"انتهت صلاحية تقرير المراجعة. أعد تحميل التقرير قبل النشر."},{status:409});
  }
  const release=await publishedConfig(token);
  if(release.sha!==body.expectedReleaseSha){
   return NextResponse.json({error:"تغيرت نسخة المرحلة المنشورة منذ إنشاء التقرير. أعد تحميل التقرير وراجع الفروقات قبل النشر."},{status:409});
  }
  // Merge this stage into the reviewed production config, preserving every other stage.
  const merged={...release.config,stages:{...release.config.stages,[stageId]:{...stage,published:true}}};
  const committed=await github(token,"https://api.github.com/repos/"+REPOSITORY+"/contents/"+CONFIG_PATH,{
   method:"PUT",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({
    message:"Publish Stage "+stageId+" from Studio",
    content:Buffer.from(JSON.stringify(merged,null,2)+"\n","utf8").toString("base64"),
    sha:release.sha,
    branch:RELEASE_BRANCH
   })
  });
  return NextResponse.json({
   success:true,
   stage:stageId,
   branch:RELEASE_BRANCH,
   commit:committed.commit?.sha||null,
   message:"تم نشر المرحلة مباشرة إلى "+RELEASE_BRANCH+". سيبدأ تحديث نسخة اللاعبين تلقائياً بعد اكتمال نشر الإنتاج."
  });
 }catch(error){
  const status=error.status===409||error.status===422?409:502;
  const message=status===409?"تغيرت نسخة الإنتاج أثناء النشر أو لا توجد تغييرات جديدة. حدّث التقرير ثم أعد المحاولة.":(error.message||"تعذر نشر المرحلة مباشرة.");
  return NextResponse.json({error:message},{status});
 }
}
