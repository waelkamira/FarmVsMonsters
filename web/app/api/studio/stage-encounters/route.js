import {NextResponse} from "next/server";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {verifyStudioSession} from "../../../../game/studio/signedSession.mjs";
import {getStudioStorageDriver,canWriteStudioStorage} from "../../../../game/studio/storageDriver.mjs";
import {validateStageMonsterReferences} from "../../../../game/studio/stageMonsterReferences.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const COOKIE="fvm_studio_session";
const CONFIG_PATH="web/game/data/stageEncounterConfig.json";
const REGISTRY_PATH="web/game/data/studioAssetRegistry.json";
const PUBLISHED_PLANT_CATALOG_PATH="web/public/assets/studio-plant-catalog.json";
const PUBLISHED_MONSTER_CATALOG_PATH="web/public/assets/studio-monster-catalog.json";
const BUILTIN_PLANT_IDS=new Set(["radish","radish-level-1","mushroom","energy-mushroom","pumpkin","pumpkin-level-1","pineapple","pineapple-level-1","hazelnut","hazelnut-level-1","mango","mango-level-1","snow-thrower","snow-thrower-level-1","electric-mushroom","electric-mushroom-level-1"]);
const DEFAULT_CONFIG={"version":1,"stages":{"1":{"monsters":[{"key":"monster-01-w1","id":"monster-01","count":3,"wave":1,"spawnIntervalMs":5080,"firstSpawnDelayMs":0,"hpMultiplier":1,"speedMultiplier":1,"damageMultiplier":1,"attackIntervalMultiplier":1,"enabled":true},{"key":"monster-01-w2","id":"monster-01","count":5,"wave":2,"spawnIntervalMs":4960,"firstSpawnDelayMs":0,"hpMultiplier":1,"speedMultiplier":1,"damageMultiplier":1,"attackIntervalMultiplier":1,"enabled":true},{"key":"monster-01-w3","id":"monster-01","count":6,"wave":3,"spawnIntervalMs":4840,"firstSpawnDelayMs":0,"hpMultiplier":1,"speedMultiplier":1,"damageMultiplier":1,"attackIntervalMultiplier":1,"enabled":true},{"key":"monster-01-w4","id":"monster-01","count":7,"wave":4,"spawnIntervalMs":4720,"firstSpawnDelayMs":0,"hpMultiplier":1,"speedMultiplier":1,"damageMultiplier":1,"attackIntervalMultiplier":1,"enabled":true},{"key":"monster-01-w5","id":"monster-01","count":9,"wave":5,"spawnIntervalMs":4600,"firstSpawnDelayMs":0,"hpMultiplier":1,"speedMultiplier":1,"damageMultiplier":1,"attackIntervalMultiplier":1,"enabled":true}],"plants":[{"id":"radish","count":1,"enabled":true},{"id":"mushroom","count":1,"enabled":true},{"id":"pumpkin","count":1,"enabled":true},{"id":"pineapple","count":1,"enabled":true},{"id":"hazelnut","count":1,"enabled":true},{"id":"mango","count":1,"enabled":true},{"id":"snow-thrower","count":1,"enabled":true},{"id":"electric-mushroom","count":1,"enabled":true}],"monstersConfigured":false,"plantsConfigured":false}}};
const authorized=req=>verifyStudioSession(process.env.STUDIO_SESSION_SECRET || "",req.cookies.get(COOKIE)?.value||"");
const githubHeaders=token=>({Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"});
const githubUrl=()=> "https://api.github.com/repos/"+(process.env.STUDIO_GITHUB_REPOSITORY||"waelkamira/FarmVsMonsters")+"/contents/"+CONFIG_PATH;
const workingBranch=()=>process.env.STUDIO_GITHUB_BRANCH||"studio/assets";
const releaseBranch=()=>process.env.STUDIO_PUBLISH_BRANCH||"main";
// Production must never silently fall back to the build's stale local stage config.
// Local storage is a development-only mode; production always reads and writes the
// durable Studio branch so published rosters cannot be shadowed by campaign defaults.
function getStorageDriver(){
 return getStudioStorageDriver();
}

function normalizeConfig(value){
 const source=value&&typeof value==="object"?value:DEFAULT_CONFIG;
 const stages={};
 for(const [rawStage,raw] of Object.entries(source.stages||{})){
  const stage=String(Math.max(1,Math.min(100,Math.floor(Number(rawStage)||1))));
  const monsters=(Array.isArray(raw?.monsters)?raw.monsters:[]).map((item,index)=>({
   key:String(item.key||item.id+"-"+(item.wave||1)+"-"+index),
   id:String(item.id||"").trim().toLowerCase(),
   count:Math.max(1,Math.min(500,Math.floor(Number(item.count)||1))),
   wave:Math.max(1,Math.min(stage==="1"?5:10,Math.floor(Number(item.wave)||1))),
   spawnIntervalMs:Math.max(100,Math.min(60000,Math.floor(Number(item.spawnIntervalMs)||1800))),
   firstSpawnDelayMs:Math.max(0,Math.min(120000,Math.floor(Number(item.firstSpawnDelayMs)||0))),
   hpMultiplier:Math.max(.1,Math.min(10,Number(item.hpMultiplier)||1)),
   speedMultiplier:Math.max(.1,Math.min(5,Number(item.speedMultiplier)||1)),
   damageMultiplier:Math.max(.1,Math.min(10,Number(item.damageMultiplier)||1)),
   attackIntervalMultiplier:Math.max(.1,Math.min(10,Number(item.attackIntervalMultiplier)||1)),
   enabled:item.enabled!==false
  })).filter(item=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id));
  const plants=(Array.isArray(raw?.plants)?raw.plants:[]).map(item=>{
   const visible=item.visible!==false && item.enabled!==false;
   return {id:String(item.id||"").trim().toLowerCase(),count:Math.max(1,Math.min(500,Math.floor(Number(item.count)||1))),visible,enabled:visible,unlocked:item.unlocked!==false};
  }).filter(item=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id));
  const background=typeof raw?.background==="string" && /^\/assets\/backgrounds\/[a-z0-9._-]+\.(?:png|jpe?g|webp|svg)$/i.test(raw.background)
   ? raw.background : "/assets/backgrounds/farm-battlefield-clean.svg";
  stages[stage]={monsters,plants,background,published:raw?.published===true,monstersConfigured:raw?.monstersConfigured===true,plantsConfigured:raw?.plantsConfigured===true};
 }
 if(!stages["1"])stages["1"]={monsters:[],plants:[]};
 return {version:1,stages};
}
async function readLocal(){
 try{return normalizeConfig(JSON.parse(await readFile(path.join(process.cwd(),"game/data/stageEncounterConfig.json"),"utf8")));}
 catch(error){if(error.code==="ENOENT")return DEFAULT_CONFIG;throw error;}
}
async function writeLocal(value){
 const target=path.join(process.cwd(),"game/data/stageEncounterConfig.json");
 await mkdir(path.dirname(target),{recursive:true});
 await writeFile(target,JSON.stringify(value,null,2)+"\n","utf8");
}
async function readPublishedPlantIds(){
 let catalog={plants:[]};
 try{catalog=JSON.parse(await readFile(path.join(process.cwd(),PUBLISHED_PLANT_CATALOG_PATH.replace(/^web\//,"")),"utf8"));}catch(error){if(error.code!=="ENOENT")throw error;}
 return new Set([...BUILTIN_PLANT_IDS,...(Array.isArray(catalog.plants)?catalog.plants:[]).map(item=>String(item.id||"").trim().toLowerCase()).filter(Boolean)]);
}
async function readAvailablePlantIds(driver){
 const available=await readPublishedPlantIds();
 if(driver==="local"){
  const assets=await readMonsterAssets();
  for(const asset of assets)if(asset.type==="plant"&&asset.status==="testing")available.add(asset.id);
 }
 return available;
}
async function readMonsterAssets(){
 let catalog={monsters:[]};
 let registry={assets:[]};
 try{catalog=JSON.parse(await readFile(path.join(process.cwd(),PUBLISHED_MONSTER_CATALOG_PATH.replace(/^web\//,"")),"utf8"));}catch(error){if(error.code!=="ENOENT")throw error;}
 try{registry=JSON.parse(await readFile(path.join(process.cwd(),"game/data/studioAssetRegistry.json"),"utf8"));}catch(error){if(error.code!=="ENOENT")throw error;}
 // Published catalog entries are valid stage monsters even when an older local
 // registry snapshot does not contain them. Registry state wins on duplicate IDs
 // so an archived asset cannot be revived by its stale published catalog entry.
 const assets=new Map();
 for(const asset of Array.isArray(catalog.monsters)?catalog.monsters:[]){
  if(typeof asset?.id!=="string"||!asset.id.trim())continue;
  assets.set(asset.id.trim().toLowerCase(),{...asset,type:"monster",status:"published"});
 }
 for(const asset of Array.isArray(registry.assets)?registry.assets:[]){
  if(asset?.type!=="monster"||typeof asset.id!=="string"||!asset.id.trim())continue;
  assets.set(asset.id.trim().toLowerCase(),asset);
 }
 return [...assets.values()];
}
async function readGithub(branch=workingBranch()){
 const token=process.env.STUDIO_GITHUB_TOKEN;
 if(!token)throw new Error("STUDIO_GITHUB_TOKEN is required.");
 const response=await fetch(githubUrl()+"?ref="+encodeURIComponent(branch),{headers:githubHeaders(token),cache:"no-store"});
 if(response.status===404)return {config:DEFAULT_CONFIG,sha:null};
 if(!response.ok)throw new Error("GitHub read failed ("+response.status+").");
 const data=await response.json();
 return {config:normalizeConfig(JSON.parse(Buffer.from(data.content||"","base64").toString("utf8"))),sha:data.sha};
}
export async function GET(req){
 try{
  const driver=getStorageDriver();
  const isStudio=authorized(req);
  // Studio edits and previews read the working branch; anonymous players read
  // only the release branch. This prevents a successful draft preview from
  // being mistaken for a published player release.
  const result=driver==="github"
   ?await readGithub(isStudio?workingBranch():releaseBranch())
   :{config:await readLocal(),sha:null};
  if(isStudio){
   return NextResponse.json({...result.config,sha:result.sha,storage:driver,sourceBranch:driver==="github"?workingBranch():"local"},{headers:{"Cache-Control":"no-store"}});
  }
  // Public clients receive only published stages and visible roster entries.
  // Hidden plants and unpublished drafts are not exposed through the public API.
  const publicConfig={...result.config,stages:Object.fromEntries(Object.entries(result.config.stages).filter(([,stage])=>stage.published===true).map(([id,stage])=>[id,{
   ...stage,
   plants:stage.plants.filter(plant=>plant.visible!==false&&plant.enabled!==false),
   monsters:stage.monsters.filter(monster=>monster.enabled!==false)
  }]))};
  return NextResponse.json({...publicConfig,storage:driver},{headers:{"Cache-Control":"no-store"}});
 }catch(error){return NextResponse.json({error:error.message||"Could not load stage settings."},{status:502});}
}
export async function PATCH(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 if(!canWriteStudioStorage())return NextResponse.json({error:"حفظ إعدادات المراحل متاح في بيئة التطوير المحلية فقط؛ لا يكتب خادم الإنتاج إلى فروع Git."},{status:403});
 let body;try{body=await req.json();}catch{return NextResponse.json({error:"Invalid stage settings."},{status:400});}
 let config=normalizeConfig(body.config);
 try{
  const driver=getStorageDriver();
  const invalidReferences=validateStageMonsterReferences(config,await readMonsterAssets());
  if(invalidReferences.length){
   const details=invalidReferences.map(item=>"المرحلة "+item.stageId+"، الموجة "+item.wave+": "+item.id).join("؛ ");
   return NextResponse.json({error:"لا يمكن حفظ إعدادات المراحل لأنها تشير إلى وحوش غير موجودة أو مؤرشفة: "+details,invalidReferences},{status:409});
  }
  const publishAction=body.action==="publish";
  const stageId=String(Math.max(1,Math.min(100,Math.floor(Number(body.stage)||0))));
  if(publishAction){
   if(!config.stages?.[stageId])return NextResponse.json({error:"المرحلة المطلوبة غير موجودة في إعدادات الاستديو."},{status:400});
   config={...config,stages:{...config.stages,[stageId]:{...config.stages[stageId],published:true}}};
   const availablePlants=await readAvailablePlantIds(driver);
   const unavailablePlants=config.stages[stageId].plants.filter(plant=>plant.visible!==false&&plant.enabled!==false&&!availablePlants.has(plant.id)).map(plant=>plant.id);
   if(unavailablePlants.length)return NextResponse.json({error:"لا يمكن نشر المرحلة لأن بعض النباتات ليست في الكتالوج المحلي بعد. انشر هذه الأصول أولاً ثم أعد نشر المرحلة: "+[...new Set(unavailablePlants)].join("، "),unavailablePlants:[...new Set(unavailablePlants)]},{status:409});
  }
  await writeLocal(config);
  return NextResponse.json({success:true,published:publishAction,config,storage:driver,sha:null,sourceBranch:"local",syncStates:["Local changes","Not committed","Not synced"]});
 }catch(error){return NextResponse.json({error:error.message||"Could not save stage settings."},{status:502});}
}
