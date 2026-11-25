import {NextResponse} from "next/server";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {verifyStudioSession} from "../../../../game/studio/signedSession.mjs";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const COOKIE="fvm_studio_session";
const CONFIG_PATH="web/game/data/stageEncounterConfig.json";
const DEFAULT_CONFIG={"version":1,"stages":{"1":{"monsters":[{"key":"cave-w1","id":"monster-01","count":2,"wave":1,"spawnIntervalMs":5080,"firstSpawnDelayMs":0,"hpMultiplier":1,"speedMultiplier":1,"damageMultiplier":1,"attackIntervalMultiplier":1,"enabled":true},{"key":"cave-w2","id":"monster-01","count":3,"wave":2,"spawnIntervalMs":4960,"firstSpawnDelayMs":0,"hpMultiplier":1,"speedMultiplier":1,"damageMultiplier":1,"attackIntervalMultiplier":1,"enabled":true},{"key":"cave-w3","id":"monster-01","count":4,"wave":3,"spawnIntervalMs":4840,"firstSpawnDelayMs":0,"hpMultiplier":1,"speedMultiplier":1,"damageMultiplier":1,"attackIntervalMultiplier":1,"enabled":true},{"key":"cave-w4","id":"monster-01","count":4,"wave":4,"spawnIntervalMs":4720,"firstSpawnDelayMs":0,"hpMultiplier":1,"speedMultiplier":1,"damageMultiplier":1,"attackIntervalMultiplier":1,"enabled":true},{"key":"monster-01-w4","id":"monster-01","count":1,"wave":4,"spawnIntervalMs":4720,"firstSpawnDelayMs":0,"hpMultiplier":1,"speedMultiplier":1,"damageMultiplier":1,"attackIntervalMultiplier":1,"enabled":true},{"key":"cave-w5","id":"monster-01","count":5,"wave":5,"spawnIntervalMs":4600,"firstSpawnDelayMs":0,"hpMultiplier":1,"speedMultiplier":1,"damageMultiplier":1,"attackIntervalMultiplier":1,"enabled":true},{"key":"monster-01-w5","id":"monster-01","count":1,"wave":5,"spawnIntervalMs":4600,"firstSpawnDelayMs":0,"hpMultiplier":1,"speedMultiplier":1,"damageMultiplier":1,"attackIntervalMultiplier":1,"enabled":true}],"plants":[{"id":"radish","count":1,"enabled":true},{"id":"mushroom","count":1,"enabled":true},{"id":"pumpkin","count":1,"enabled":true},{"id":"pineapple","count":1,"enabled":true},{"id":"hazelnut","count":1,"enabled":true},{"id":"mango","count":1,"enabled":true},{"id":"snow-thrower","count":1,"enabled":true},{"id":"electric-mushroom","count":1,"enabled":true}],"monstersConfigured":false,"plantsConfigured":false}}};
const authorized=req=>verifyStudioSession(process.env.STUDIO_SESSION_SECRET || "",req.cookies.get(COOKIE)?.value||"");
const githubHeaders=token=>({Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"});
const githubUrl=()=> "https://api.github.com/repos/"+(process.env.STUDIO_GITHUB_REPOSITORY||"waelkamira/FarmVsMonsters")+"/contents/"+CONFIG_PATH;

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
  const plants=(Array.isArray(raw?.plants)?raw.plants:[]).map(item=>({
   id:String(item.id||"").trim().toLowerCase(),
   count:Math.max(1,Math.min(500,Math.floor(Number(item.count)||1))),
   enabled:item.enabled!==false
  })).filter(item=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id));
  stages[stage]={monsters,plants,monstersConfigured:raw?.monstersConfigured===true,plantsConfigured:raw?.plantsConfigured===true};
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
async function readGithub(){
 const token=process.env.STUDIO_GITHUB_TOKEN;
 if(!token)throw new Error("STUDIO_GITHUB_TOKEN is required.");
 const storageBranch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets";
 const response=await fetch(githubUrl()+"?ref="+encodeURIComponent(storageBranch),{headers:githubHeaders(token),cache:"no-store"});
 if(response.status===404)return {config:DEFAULT_CONFIG,sha:null};
 if(!response.ok)throw new Error("GitHub read failed ("+response.status+").");
 const data=await response.json();
 return {config:normalizeConfig(JSON.parse(Buffer.from(data.content||"","base64").toString("utf8"))),sha:data.sha};
}
async function writeGithub(config,expectedSha){
 const token=process.env.STUDIO_GITHUB_TOKEN;
 if(!token)throw new Error("STUDIO_GITHUB_TOKEN is required.");
 const storageBranch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets";
 const current=await fetch(githubUrl()+"?ref="+encodeURIComponent(storageBranch),{headers:githubHeaders(token),cache:"no-store"});
 let sha=null;
 if(current.ok)sha=(await current.json()).sha;
 else if(current.status!==404)throw new Error("GitHub lookup failed ("+current.status+").");
 if(expectedSha!==undefined&&expectedSha!==sha)return {conflict:true};
 const saved=await fetch(githubUrl(),{method:"PUT",headers:{...githubHeaders(token),"Content-Type":"application/json"},body:JSON.stringify({message:"Configure stage monster and plant rosters",branch:storageBranch,content:Buffer.from(JSON.stringify(config,null,2)+"\n").toString("base64"),...(sha?{sha}:{})})});
 if(!saved.ok){const data=await saved.json().catch(()=>({}));throw new Error(data.message||"GitHub save failed ("+saved.status+").");}
 const savedData=await saved.json().catch(()=>({}));
 return {conflict:false,sha:savedData.content?.sha||null};
}
export async function GET(){
 try{
  const driver=process.env.STUDIO_STORAGE_DRIVER||"local";
  const result=driver==="github"?await readGithub():{config:await readLocal(),sha:null};
  return NextResponse.json({...result.config,sha:result.sha,storage:driver},{headers:{"Cache-Control":"no-store"}});
 }catch(error){return NextResponse.json({error:error.message||"Could not load stage settings."},{status:502});}
}
export async function PATCH(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 let body;try{body=await req.json();}catch{return NextResponse.json({error:"Invalid stage settings."},{status:400});}
 const config=normalizeConfig(body.config);
 try{
  const driver=process.env.STUDIO_STORAGE_DRIVER||"local";
  let savedSha=null;
  if(driver==="github"){
   const result=await writeGithub(config,body.sha);
   if(result.conflict)return NextResponse.json({error:"تغير إعداد المرحلة منذ تحميل الصفحة. أعد تحميل الإعدادات قبل الحفظ."},{status:409});
   savedSha=result.sha;
  }else await writeLocal(config);
  return NextResponse.json({success:true,config,storage:driver,sha:savedSha});
 }catch(error){return NextResponse.json({error:error.message||"Could not save stage settings."},{status:502});}
}
