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
 if(!response.ok)throw new Error(data.message||"GitHub request failed ("+response.status+").");
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
async function localConfig(){
 const file=path.join(process.cwd(),"game/data/stageEncounterConfig.json");
 return normalize(JSON.parse(await readFile(file,"utf8")));
}
async function publishedConfig(token){
 const data=await github(token,"https://api.github.com/repos/"+REPOSITORY+"/contents/"+CONFIG_PATH+"?ref="+encodeURIComponent(RELEASE_BRANCH));
 return {config:normalize(JSON.parse(Buffer.from(data.content||"","base64").toString("utf8"))),sha:data.sha};
}
export async function GET(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 try{
  const token=process.env.STUDIO_GITHUB_TOKEN;
  if(!token)throw new Error("STUDIO_GITHUB_TOKEN is not configured.");
  const stageId=String(Math.max(1,Math.min(100,Math.floor(Number(new URL(req.url).searchParams.get("stage"))||1))));
  const [draft,release]=await Promise.all([localConfig(),publishedConfig(token)]);
  return NextResponse.json({stage:stageId,draft:draft.stages[stageId]||null,published:release.config.stages[stageId]||null,releaseSha:release.sha,releaseBranch:RELEASE_BRANCH},{headers:{"Cache-Control":"no-store"}});
 }catch(error){return NextResponse.json({error:error.message||"Could not load release comparison."},{status:502});}
}
export async function POST(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 if(!canWriteStudioStorage())return NextResponse.json({error:"إعداد طلب الإصدار متاح من بيئة التطوير المحلية فقط."},{status:403});
 try{
  const body=await req.json();
  const stageId=String(Math.max(1,Math.min(100,Math.floor(Number(body.stage)||1))));
  if(body.confirmedTested!==true||body.confirmedReport!==true)return NextResponse.json({error:"يجب تأكيد تجربة المرحلة ومراجعة التقرير قبل إنشاء طلب الإصدار."},{status:400});
  const token=process.env.STUDIO_GITHUB_TOKEN;
  if(!token)throw new Error("STUDIO_GITHUB_TOKEN is not configured.");
  const draft=await localConfig();
  const stage=draft.stages[stageId];
  if(!stage)return NextResponse.json({error:"المرحلة غير موجودة في المسودة المحلية."},{status:404});
  const plants=(stage.plants||[]).filter(p=>p.visible!==false&&p.enabled!==false);
  const monsters=(stage.monsters||[]).filter(m=>m.enabled!==false);
  if(!plants.length)return NextResponse.json({error:"لا يمكن إصدار مرحلة بلا نباتات ظاهرة للاعب."},{status:409});
  if(!monsters.length)return NextResponse.json({error:"لا يمكن إصدار مرحلة بلا وحوش مفعلة."},{status:409});
  const plantCatalog=JSON.parse(await readFile(path.join(process.cwd(),"public/assets/studio-plant-catalog.json"),"utf8").catch(()=>"{\"plants\":[]}"));
  const monsterCatalog=JSON.parse(await readFile(path.join(process.cwd(),"public/assets/studio-monster-catalog.json"),"utf8").catch(()=>"{\"monsters\":[]}"));
  const plantIds=new Set(["radish","radish-level-1","mushroom","energy-mushroom","pumpkin","pumpkin-level-1","pineapple","pineapple-level-1","hazelnut","hazelnut-level-1","mango","mango-level-1","snow-thrower","snow-thrower-level-1","electric-mushroom","electric-mushroom-level-1",...(plantCatalog.plants||[]).map(x=>String(x.id||"").toLowerCase())]);
  const monsterIds=new Set((monsterCatalog.monsters||[]).map(x=>String(x.id||"").toLowerCase()));
  const missingPlants=plants.map(x=>x.id).filter(id=>!plantIds.has(id));
  const missingMonsters=monsters.map(x=>x.id).filter(id=>!monsterIds.has(id));
  if(missingPlants.length||missingMonsters.length)return NextResponse.json({error:"بعض أصول المرحلة لم تُنشر بعد في كتالوج الإنتاج. انشر الأصول أولاً ثم أعد المراجعة.",missingPlants,missingMonsters},{status:409});
  const release=await publishedConfig(token);
  const merged={...release.config,stages:{...release.config.stages,[stageId]:{...stage,published:true}}};
  const branch="release/stage-"+stageId+"-"+Date.now();
  const baseRef=await github(token,"https://api.github.com/repos/"+REPOSITORY+"/git/ref/heads/"+encodeURIComponent(RELEASE_BRANCH));
  await github(token,"https://api.github.com/repos/"+REPOSITORY+"/git/refs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ref:"refs/heads/"+branch,sha:baseRef.object.sha})});
  await github(token,"https://api.github.com/repos/"+REPOSITORY+"/contents/"+CONFIG_PATH,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"Prepare Stage "+stageId+" release",content:Buffer.from(JSON.stringify(merged,null,2)+"\n","utf8").toString("base64"),sha:release.sha,branch})});
  const pr=await github(token,"https://api.github.com/repos/"+REPOSITORY+"/pulls",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"Release Stage "+stageId+" to players",head:branch,base:RELEASE_BRANCH,body:"## Stage release review\\n\\n- Stage: "+stageId+"\\n- Draft was tested in the local Studio playtest before submission.\\n- Plant and monster references were checked against production catalogs.\\n- This PR is the final release gate; players receive the stage only after this PR is reviewed, merged, and the production deployment is ready.\\n\\nPlease inspect the complete stage configuration diff before merging."})});
  return NextResponse.json({success:true,pullRequest:pr.html_url,number:pr.number,branch,stage:stageId,message:"تم إنشاء طلب إصدار المرحلة. لن تظهر للاعبين قبل مراجعة الطلب ودمجه واكتمال نشر الإنتاج."});
 }catch(error){return NextResponse.json({error:error.message||"تعذر إنشاء طلب إصدار المرحلة."},{status:502});}
}
