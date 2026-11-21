import {NextResponse} from "next/server";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {verifyStudioSession} from "../../../../game/studio/signedSession.mjs";
import {STUDIO_ASSET_TYPES,STUDIO_ID_PATTERN,STUDIO_MAX_UPLOAD_BYTES,STUDIO_RESERVED_PLANT_IDS} from "../../../../game/studio/assetTypes.mjs";
import {createStudioPlantCombatProfile} from "../../../../game/studio/plantProfiles.mjs";
import {assertExpectedContentSha} from "../../../../game/studio/registryConcurrency.mjs";
import {createImmutableAssetPath} from "../../../../game/studio/immutableAssetPath.mjs";
import {createStudioReleaseBranchName,resolveStudioReleaseAsset,transitionStudioAssetStatus} from "../../../../game/studio/releaseLifecycle.mjs";
import {cloneStudioAsset,createStudioAssetRevision,restoreStudioAssetRevision} from "../../../../game/studio/assetVersions.mjs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const COOKIE="fvm_studio_session";
const REGISTRY_PATH="web/game/data/studioAssetRegistry.json";
const PUBLISHED_CATALOG_PATH="web/public/assets/studio-plant-catalog.json";
function authorized(req){return verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN||"",req.cookies.get(COOKIE)?.value||"");}
function ext(type){return {"image/png":".png","image/webp":".webp","image/gif":".gif","audio/mpeg":".mp3","audio/wav":".wav","audio/ogg":".ogg","audio/mp4":".m4a"}[type]||"";}
function githubHeaders(token){return {Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};}
function githubUrl(filePath){return "https://api.github.com/repos/"+(process.env.STUDIO_GITHUB_REPOSITORY||"waelkamira/FarmVsMonsters")+"/contents/"+filePath;}
async function githubGetDocument(filePath,token,branch){const response=await fetch(githubUrl(filePath)+"?ref="+encodeURIComponent(branch),{headers:githubHeaders(token)});if(response.status===404)return null;if(!response.ok)throw Error("GitHub read failed ("+response.status+").");const data=await response.json();return {content:Buffer.from(data.content||"","base64").toString("utf8"),sha:data.sha};}
async function githubGet(filePath,token,branch){const document=await githubGetDocument(filePath,token,branch);return document?.content??null;}
async function githubGetBytes(filePath,token,branch){const response=await fetch(githubUrl(filePath)+"?ref="+encodeURIComponent(branch),{headers:{...githubHeaders(token),Accept:"application/vnd.github.raw"}});if(response.status===404)throw Error("Asset not found in staging branch: "+filePath);if(!response.ok)throw Error("GitHub asset read failed ("+response.status+").");return Buffer.from(await response.arrayBuffer());}
async function githubPutImmutable(filePath,bytes,message,token,branch){const api=githubUrl(filePath),headers=githubHeaders(token);const verify=async()=>{const response=await fetch(api+"?ref="+encodeURIComponent(branch),{headers:{...headers,Accept:"application/vnd.github.raw"}});if(response.status===404)return false;if(!response.ok)throw Error("GitHub immutable asset lookup failed ("+response.status+").");return Buffer.from(await response.arrayBuffer()).equals(bytes);};if(await verify())return;const saved=await fetch(api,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({message,branch,content:Buffer.from(bytes).toString("base64")})});if(saved.ok)return;if(await verify())return;const data=await saved.json().catch(()=>({}));throw Error(data.message||"GitHub immutable asset save failed ("+saved.status+").");}
function githubApiUrl(endpoint){return "https://api.github.com/repos/"+(process.env.STUDIO_GITHUB_REPOSITORY||"waelkamira/FarmVsMonsters")+endpoint;}
async function githubCreateBranch(branchName,baseBranch,token){
 const ref=await fetch(githubApiUrl("/git/ref/heads/"+encodeURIComponent(baseBranch)),{headers:githubHeaders(token)});
 if(!ref.ok)throw Error("تعذر قراءة فرع النشر الأساسي ("+ref.status+").");
 const data=await ref.json(),sha=data.object?.sha;
 if(!sha)throw Error("لم يتم العثور على commit صالح لفرع النشر الأساسي.");
 const created=await fetch(githubApiUrl("/git/refs"),{method:"POST",headers:{...githubHeaders(token),"Content-Type":"application/json"},body:JSON.stringify({ref:"refs/heads/"+branchName,sha})});
 if(!created.ok){const error=await created.json().catch(()=>({}));throw Error(error.message||"تعذر إنشاء فرع إصدار المراجعة ("+created.status+").");}
 return sha;
}
async function githubCreatePullRequest(head,base,title,body,token){
 const response=await fetch(githubApiUrl("/pulls"),{method:"POST",headers:{...githubHeaders(token),"Content-Type":"application/json"},body:JSON.stringify({head,base,title,body,draft:false})});
 if(!response.ok){const error=await response.json().catch(()=>({}));if(response.status===403||response.status===404)throw Error("تعذر إنشاء طلب المراجعة. امنح رمز GitHub صلاحية Pull requests: Read and write إلى المستودع.");throw Error(error.message||"GitHub pull request creation failed ("+response.status+").");}
 const pr=await response.json();
 return {number:pr.number,url:pr.html_url,state:pr.state,merged:Boolean(pr.merged),mergedAt:pr.merged_at||null};
}
async function githubGetPullRequest(number,token){
 const response=await fetch(githubApiUrl("/pulls/"+Number(number)),{headers:githubHeaders(token)});
 if(response.status===404)return null;
 if(!response.ok)throw Error("GitHub pull request lookup failed ("+response.status+").");
 const pr=await response.json();
 return {number:pr.number,url:pr.html_url,state:pr.state,merged:Boolean(pr.merged),mergedAt:pr.merged_at||null};
}
async function githubPut(filePath,bytes,message,token,branch,expectedSha){const api=githubUrl(filePath),headers=githubHeaders(token);const check=await fetch(api+"?ref="+encodeURIComponent(branch),{headers});let sha=null;if(check.ok)sha=(await check.json()).sha;else if(check.status!==404)throw Error("GitHub lookup failed ("+check.status+").");assertExpectedContentSha(expectedSha,sha);const saved=await fetch(api,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({message,branch,content:Buffer.from(bytes).toString("base64"),...(sha?{sha}:{})})});if(!saved.ok){const data=await saved.json().catch(()=>({}));throw Error(data.message||"GitHub save failed ("+saved.status+").");}}
async function localRegistry(){try{return JSON.parse(await readFile(path.join(process.cwd(),"game/data/studioAssetRegistry.json"),"utf8"));}catch(error){if(error.code==="ENOENT")return {version:1,assets:[]};throw error;}}
async function saveLocalRegistry(registry){const target=path.join(process.cwd(),"game/data/studioAssetRegistry.json");await mkdir(path.dirname(target),{recursive:true});await writeFile(target,JSON.stringify(registry,null,2)+"\n","utf8");}
function addPreviewUrls(registry){const github=process.env.STUDIO_STORAGE_DRIVER==="github";return {...registry,storage:process.env.STUDIO_STORAGE_DRIVER||"local",assets:(registry.assets||[]).map(asset=>({...asset,previewUrl:github?"/api/studio/assets?preview="+encodeURIComponent(asset.path):asset.path,...(asset.combat?.projectile?{combat:{...asset.combat,projectile:{...asset.combat.projectile,previewUrl:github?"/api/studio/assets?preview="+encodeURIComponent(asset.combat.projectile.path):asset.combat.projectile.path}}}:{})}))};}
function readCombatForm(form,projectile,existing){
 const previous=existing?.combat;
 return createStudioPlantCombatProfile({
  projectile:projectile||null,
  behavior:String(form.get("behavior")||""),
  energyCost:form.get("energyCost")??previous?.energyCost??60,
  hp:form.get("hp")??previous?.hp??150,
  cooldownMs:form.get("cooldownMs")??previous?.cooldownMs??1800,
  damage:form.get("damage")??previous?.damage??30,
  range:form.get("range")??previous?.range??180,
  projectileSpeed:form.get("projectileSpeed")??previous?.projectileSpeed??280,
  projectileHeight:form.get("projectileHeight")??previous?.projectileHeight??0,
  projectileEffectColor:form.get("projectileEffectColor")??previous?.projectileEffectColor??"#ffc247",
  projectileRotation:form.get("projectileRotation")??previous?.projectileRotation??0,
  projectileCollisionRadius:form.get("projectileCollisionRadius")??previous?.projectileCollisionRadius??22,
  energyAmount:form.get("energyAmount")??previous?.energyAmount??15,
  energyIntervalMs:form.get("energyIntervalMs")??previous?.energyIntervalMs??12000,
  sizePercent:form.get("sizePercent")??previous?.sizePercent??100
 });
}
export async function GET(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 const driver=process.env.STUDIO_STORAGE_DRIVER||"local";
 if(driver==="github"){
  const token=process.env.STUDIO_GITHUB_TOKEN,branch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets";
  if(!token)return NextResponse.json({error:"STUDIO_GITHUB_TOKEN is required."},{status:503});
  const catalog=req.nextUrl.searchParams.get("catalog");
  if(catalog==="testing"){
   try{
    const raw=await githubGet(REGISTRY_PATH,token,branch);
    const registry=raw?JSON.parse(raw):{version:1,assets:[]};
    const candidates=await Promise.all((registry.assets||[]).filter(asset=>asset.type==="plant"&&asset.status==="testing").map(async asset=>{
     if(!asset.releaseRequest?.number)return asset;
     try{return resolveStudioReleaseAsset(asset,await githubGetPullRequest(asset.releaseRequest.number,token));}catch{return asset;}
    }));
    const plants=candidates.filter(asset=>asset.status==="testing").map(asset=>({
     ...asset,
     path:"/api/studio/assets?preview="+encodeURIComponent(asset.path),
     ...(asset.combat?.projectile?{combat:{...asset.combat,projectile:{...asset.combat.projectile,path:"/api/studio/assets?preview="+encodeURIComponent(asset.combat.projectile.path)}}}:{})
    }));
    return NextResponse.json({version:1,plants},{headers:{"Cache-Control":"private, no-store"}});
   }catch(error){return NextResponse.json({error:error.message||"Could not load testing catalog."},{status:502});}
  }
  const preview=req.nextUrl.searchParams.get("preview");
  if(preview!==null){
   const allowedTypes={".png":"image/png",".webp":"image/webp",".gif":"image/gif",".mp3":"audio/mpeg",".wav":"audio/wav",".ogg":"audio/ogg",".m4a":"audio/mp4"};
   const extension=path.extname(preview).toLowerCase();
   if(!preview.startsWith("/assets/")||preview.includes("..")||!allowedTypes[extension])return NextResponse.json({error:"Invalid asset preview path."},{status:400});
   try{const upstream=await fetch(githubUrl("web/public"+preview)+"?ref="+encodeURIComponent(branch),{headers:{...githubHeaders(token),Accept:"application/vnd.github.raw"}});if(!upstream.ok)return NextResponse.json({error:"GitHub preview failed ("+upstream.status+")."},{status:upstream.status===404?404:502});return new NextResponse(await upstream.arrayBuffer(),{headers:{"Content-Type":allowedTypes[extension],"Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});}catch(error){return NextResponse.json({error:error.message||"Preview fetch failed."},{status:502});}
  }
  try{
   const raw=await githubGet(REGISTRY_PATH,token,branch);
   const registry=raw?JSON.parse(raw):{version:1,assets:[]};
   const assets=await Promise.all((registry.assets||[]).map(async asset=>{
    if(!asset.releaseRequest?.number)return asset;
    try{
     const pr=await githubGetPullRequest(asset.releaseRequest.number,token);
     return resolveStudioReleaseAsset(asset,pr);
    }catch{return {...asset,status:"approved",releaseRequest:{...asset.releaseRequest,state:"unknown"}};}
   }));
   return NextResponse.json(addPreviewUrls({...registry,assets}));
  }catch(error){return NextResponse.json({error:error.message},{status:502});}
 }
 return NextResponse.json(addPreviewUrls(await localRegistry()));
}
export async function POST(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 let form;try{form=await req.formData();}catch{return NextResponse.json({error:"Invalid multipart upload."},{status:400});}
 const id=String(form.get("id")||"").trim().toLowerCase(),type=String(form.get("type")||""),config=STUDIO_ASSET_TYPES[type],file=form.get("file"),projectileFile=form.get("projectileFile"),rows=Number(form.get("rows")||1),columns=Number(form.get("columns")||1),replace=String(form.get("replace")||"false")==="true";
 if(!config||!STUDIO_ID_PATTERN.test(id)||id.length>64)return NextResponse.json({error:"Invalid category or ID. Use a lowercase slug up to 64 characters."},{status:400});
 if(type==="plant"&&STUDIO_RESERVED_PLANT_IDS.includes(id))return NextResponse.json({error:"هذا المعرّف محجوز لنبتة أساسية في اللعبة. اختر معرّفاً جديداً."},{status:409});
 const hasFile=Boolean(file&&typeof file.arrayBuffer==="function"&&file.size>0);
 const hasProjectile=Boolean(projectileFile&&typeof projectileFile.arrayBuffer==="function"&&projectileFile.size>0);
 const removeProjectile=String(form.get("removeProjectile")||"false")==="true";
 const driver=process.env.STUDIO_STORAGE_DRIVER||"local";let old,registrySha;
 try{if(driver==="github"){const token=process.env.STUDIO_GITHUB_TOKEN,branch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets";if(!token)return NextResponse.json({error:"STUDIO_GITHUB_TOKEN is required."},{status:503});const document=await githubGetDocument(REGISTRY_PATH,token,branch);old=document?JSON.parse(document.content):{version:1,assets:[]};registrySha=document?.sha??null;}else old=await localRegistry();}catch(error){return NextResponse.json({error:error.message},{status:502});}
 const index=old.assets.findIndex(a=>a.id===id),existing=index>=0?old.assets[index]:null;
 if(existing&&!replace)return NextResponse.json({error:"Asset ID already exists. اختر الأصل من المكتبة واستخدم زر التعديل."},{status:409});
 if(!existing&&replace)return NextResponse.json({error:"الأصل المطلوب تعديله غير موجود في المكتبة."},{status:404});
 if(existing&&existing.type!==type)return NextResponse.json({error:"لا يمكن تغيير فئة الأصل أثناء التعديل."},{status:409});
 if(!hasFile&&(!replace||!existing))return NextResponse.json({error:"Choose a file for a new asset."},{status:400});
 if(hasFile&&(file.size>STUDIO_MAX_UPLOAD_BYTES||!config.accepts.includes(file.type)))return NextResponse.json({error:"Choose a supported file up to 8 MB."},{status:415});
 if(config.spriteSheet&&(!Number.isInteger(rows)||!Number.isInteger(columns)||rows<1||columns<1||rows*columns>100))return NextResponse.json({error:"Invalid sprite grid."},{status:400});
 if(hasProjectile&&removeProjectile)return NextResponse.json({error:"Choose a new projectile or remove the existing projectile, not both."},{status:400});
 if(hasProjectile&&(type!=="plant"||!STUDIO_ASSET_TYPES.plantProjectile.accepts.includes(projectileFile.type)||projectileFile.size>STUDIO_MAX_UPLOAD_BYTES))return NextResponse.json({error:"Projectile must be a supported PNG/WebP/GIF file up to 8 MB and can only be attached to a plant."},{status:415});
 const projectileBytes=hasProjectile?Buffer.from(await projectileFile.arrayBuffer()):null;
 let combatProfile=null;
 if(type==="plant"){
  const behavior=String(form.get("behavior")||"");
  if(!behavior)return NextResponse.json({error:"اختر نظام النبتة يدوياً قبل حفظها."},{status:400});
  if(hasProjectile&&behavior!=="projectile")return NextResponse.json({error:"اختر نظام إطلاق المقذوفات لاستخدام ملف القذيفة، أو أزل ملف القذيفة."},{status:400});
  const currentProjectile=behavior==="projectile"
    ?(hasProjectile
      ?{id:id+"-projectile",filename:id+"-projectile"+ext(projectileFile.type),path:"/assets/"+createImmutableAssetPath("projectiles/plants",id+"-projectile",ext(projectileFile.type),projectileBytes)}
      :(removeProjectile?null:(existing?.combat?.mode==="projectile"?existing.combat.projectile:null)))
    :null;
  try{combatProfile=readCombatForm(form,currentProjectile,existing);}catch(error){return NextResponse.json({error:error.message},{status:400});}
  if(combatProfile.mode==="projectile"&&!currentProjectile)return NextResponse.json({error:"ارفع ملف القذيفة مع النبتة أو اختر سلوكاً بديلاً."},{status:400});
 }
 const extension=hasFile?ext(file.type):(existing?.filename?path.extname(existing.filename):path.extname(existing?.path||""));
 if(!extension)return NextResponse.json({error:"Unknown file extension."},{status:415});
 const bytes=hasFile?Buffer.from(await file.arrayBuffer()):null;
 const relative=hasFile?createImmutableAssetPath(config.folder,id,extension,bytes):(existing?.path||"").replace(/^\/assets\//,"");
 const now=new Date().toISOString();
 const record=createStudioAssetRevision(existing,{...(existing||{}),id,type,name:String(form.get("name")||id).trim().slice(0,80),filename:hasFile?id+extension:existing.filename,path:hasFile?"/assets/"+relative:existing.path,rows,columns,spriteSheet:config.spriteSheet,status:"draft",releaseRequest:null,createdAt:existing?.createdAt||now,updatedAt:now,...(type==="plant"?{combat:combatProfile}:{})});
 const next={...old,version:1,assets:existing?old.assets.map((a,i)=>i===index?record:a):[...old.assets,record]};
 try{
  if(driver==="github"){
   const token=process.env.STUDIO_GITHUB_TOKEN,branch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets";
   if(hasFile)await githubPutImmutable("web/public/assets/"+relative,bytes,"studio: "+(existing?"replace ":"add ")+type+" "+id,token,branch);
   if(hasProjectile){await githubPutImmutable("web/public/"+record.combat.projectile.path.replace(/^\//,""),projectileBytes,"studio: attach projectile to "+id,token,branch);}
   await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify(next,null,2)+"\n"),"studio: "+(existing?"update ":"register ")+id,token,branch,registrySha);
  }else if(driver==="local"&&process.env.NODE_ENV!=="production"){
   if(hasFile){const target=path.join(process.cwd(),"public/assets",relative);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);}
   if(hasProjectile){const pTarget=path.join(process.cwd(),"public",record.combat.projectile.path.replace(/^\//,""));await mkdir(path.dirname(pTarget),{recursive:true});await writeFile(pTarget,projectileBytes);}
   await saveLocalRegistry(next);
  }else return NextResponse.json({error:"Production uploads require STUDIO_STORAGE_DRIVER=github and a configured GitHub token."},{status:503});
 return NextResponse.json({success:true,asset:record,storage:driver,operation:existing?"replaced":"created"});
 }catch(error){return NextResponse.json({error:error.message||"Asset save failed."},{status:error.code==="STUDIO_WRITE_CONFLICT"?409:500});}
}
export async function PATCH(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 let body;try{body=await req.json();}catch{return NextResponse.json({error:"Invalid Studio action."},{status:400});}
 const id=String(body.id||"").trim(),operation=String(body.operation||"");
 if(!STUDIO_ID_PATTERN.test(id)||!["prepare-test","publish","archive","restore","restore-version","clone"].includes(operation))return NextResponse.json({error:"Invalid asset or operation."},{status:400});
 const driver=process.env.STUDIO_STORAGE_DRIVER||"local";
 if(driver!=="github"){
  if(operation!=="archive"&&operation!=="restore"&&operation!=="restore-version"&&operation!=="clone")return NextResponse.json({error:"Testing preparation and publishing require GitHub storage."},{status:503});
  try{
   const registry=await localRegistry(),index=registry.assets.findIndex(asset=>asset.id===id);
   if(index<0)return NextResponse.json({error:"لم يتم العثور على الأصل في مكتبة Studio."},{status:404});
   if(operation==="clone"){
    const newId=String(body.newId||"").trim().toLowerCase();
    if(!STUDIO_ID_PATTERN.test(newId)||newId.length>64)return NextResponse.json({error:"معرّف النسخة غير صالح."},{status:400});
    if(registry.assets.some(asset=>asset.id===newId))return NextResponse.json({error:"يوجد أصل بهذا المعرّف بالفعل."},{status:409});
    if(registry.assets[index].type==="plant"&&STUDIO_RESERVED_PLANT_IDS.includes(newId))return NextResponse.json({error:"هذا المعرّف محجوز لنبتة أساسية."},{status:409});
    const clone=cloneStudioAsset(registry.assets[index],newId,body.newName);
    registry.assets.push(clone);await saveLocalRegistry(registry);
    return NextResponse.json({success:true,operation,asset:clone,message:"تم إنشاء نسخة جديدة كمسودة مستقلة."});
   }
   let updated;
   try{updated=operation==="restore-version"?restoreStudioAssetRevision(registry.assets[index],body.versionNumber):transitionStudioAssetStatus(registry.assets[index],operation);}
   catch(error){return NextResponse.json({error:error.message},{status:409});}
   registry.assets[index]=updated;await saveLocalRegistry(registry);
   return NextResponse.json({success:true,operation,asset:updated,message:operation==="archive"?"تمت أرشفة الأصل مع الاحتفاظ بملفاته.":operation==="restore"?"تمت استعادة الأصل كمسودة.":"تمت استعادة الإصدار السابق كمسودة جديدة."});
  }catch(error){return NextResponse.json({error:error.message||"Studio lifecycle action failed."},{status:500});}
 }
 const token=process.env.STUDIO_GITHUB_TOKEN,storageBranch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets",targetBranch=process.env.STUDIO_PUBLISH_BRANCH||"main";
 if(!token)return NextResponse.json({error:"STUDIO_GITHUB_TOKEN is required."},{status:503});
 try{
  const registryDocument=await githubGetDocument(REGISTRY_PATH,token,storageBranch),registry=registryDocument?JSON.parse(registryDocument.content):{version:1,assets:[]},registrySha=registryDocument?.sha??null;
  const index=registry.assets.findIndex(asset=>asset.id===id)
  if(index<0)return NextResponse.json({error:"لم يتم العثور على الأصل في مكتبة Studio."},{status:404});
  const asset=registry.assets[index];
  if(operation==="clone"){
   const newId=String(body.newId||"").trim().toLowerCase();
   if(!STUDIO_ID_PATTERN.test(newId)||newId.length>64)return NextResponse.json({error:"معرّف النسخة غير صالح."},{status:400});
   if(registry.assets.some(item=>item.id===newId))return NextResponse.json({error:"يوجد أصل بهذا المعرّف بالفعل."},{status:409});
   if(asset.type==="plant"&&STUDIO_RESERVED_PLANT_IDS.includes(newId))return NextResponse.json({error:"هذا المعرّف محجوز لنبتة أساسية."},{status:409});
   const clone=cloneStudioAsset(asset,newId,body.newName);
   registry.assets.push(clone);
   await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify(registry,null,2)+"\n"),"studio: clone "+id+" as "+newId,token,storageBranch,registrySha);
   return NextResponse.json({success:true,operation,asset:clone,message:"تم إنشاء نسخة جديدة كمسودة مستقلة."});
  }
  if(operation==="restore-version"){
   let candidate=asset;
   if(asset.releaseRequest?.number){
    const previousRequest=await githubGetPullRequest(asset.releaseRequest.number,token);
    if(previousRequest?.state==="open")return NextResponse.json({error:"أغلق طلب مراجعة النشر المفتوح أولاً قبل استعادة إصدار آخر."},{status:409});
    candidate={...asset,releaseRequest:null};
   }
   let updated;
   try{updated=restoreStudioAssetRevision(candidate,body.versionNumber);}
   catch(error){return NextResponse.json({error:error.message},{status:409});}
   registry.assets[index]=updated;
   await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify(registry,null,2)+"\n"),"studio: restore "+id+" version "+body.versionNumber,token,storageBranch,registrySha);
   return NextResponse.json({success:true,operation,asset:updated,message:"تمت استعادة الإصدار كمسودة جديدة؛ يجب اختبارها قبل طلب النشر."});
  }
  if(operation==="archive"||operation==="restore"){
   let candidate=asset;
   if(operation==="archive"&&asset.releaseRequest?.number){
    const previousRequest=await githubGetPullRequest(asset.releaseRequest.number,token);
    if(previousRequest?.state==="open"||previousRequest?.merged)return NextResponse.json({error:"أغلق طلب مراجعة النشر المفتوح أولاً. لا يمكن أرشفة محتوى منشور؛ أزل نشره بطلب إصدار منفصل."},{status:409});
    candidate={...asset,releaseRequest:null};
   }
   let updated;
   try{updated=transitionStudioAssetStatus(candidate,operation);}
   catch(error){return NextResponse.json({error:error.message},{status:409});}
   registry.assets[index]=updated;
   await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify(registry,null,2)+"\n"),"studio: "+operation+" plant "+id,token,storageBranch,registrySha);
   return NextResponse.json({success:true,operation,asset:updated,message:operation==="archive"?"تمت أرشفة الأصل مع الاحتفاظ بملفاته.":"تمت استعادة الأصل كمسودة."});
  }
  if(!asset.combat?.mode)return NextResponse.json({error:"يجب تعيين سلوك قتالي للنبتة أولاً."},{status:409});
  if(operation==="prepare-test"){
   const updated={...asset,status:"testing",testingAt:new Date().toISOString(),releaseRequest:null};
   registry.assets[index]=updated;
   await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify(registry,null,2)+"\n"),"studio: prepare plant test "+id,token,storageBranch,registrySha);
   return NextResponse.json({success:true,operation,asset:updated,message:"النبتة جاهزة للمزامنة والاختبار المحلي."});
  }
  if(asset.status!=="testing")return NextResponse.json({error:"يجب تجهيز النبتة للاختبار أولاً قبل طلب النشر."},{status:409});
  if(asset.releaseRequest?.number){
   const previousRequest=await githubGetPullRequest(asset.releaseRequest.number,token);
   if(previousRequest?.state==="open")return NextResponse.json({success:true,operation:"publish-requested",asset,reviewUrl:previousRequest.url,reviewNumber:previousRequest.number,releaseBranch:asset.releaseRequest.branch,alreadyRequested:true,message:"يوجد طلب مراجعة مفتوح لهذا النبات بالفعل."});
   if(previousRequest?.merged)return NextResponse.json({success:true,operation:"published",asset:{...asset,status:"published"},reviewUrl:previousRequest.url,reviewNumber:previousRequest.number,alreadyPublished:true,message:"تم دمج طلب النشر مسبقاً."});
  }
  const safeAssetPath=(value)=>typeof value==="string"&&value.startsWith("/assets/")&&!value.includes("..");
  if(!safeAssetPath(asset.path))return NextResponse.json({error:"Invalid plant asset path."},{status:400});
  if(asset.combat.mode==="projectile"&&!safeAssetPath(asset.combat.projectile?.path))return NextResponse.json({error:"The linked projectile asset is missing."},{status:409});
  const releaseBranch=createStudioReleaseBranchName(id,randomUUID().slice(0,8));
  await githubCreateBranch(releaseBranch,targetBranch,token);
  const plantBytes=await githubGetBytes("web/public"+asset.path,token,storageBranch);
  await githubPutImmutable("web/public"+asset.path,plantBytes,"stage plant artwork for release "+id,token,releaseBranch);
  if(asset.combat.mode==="projectile"){
   const projectileBytes=await githubGetBytes("web/public"+asset.combat.projectile.path,token,storageBranch);
   await githubPutImmutable("web/public"+asset.combat.projectile.path,projectileBytes,"stage plant projectile for release "+id,token,releaseBranch);
  }
  const catalogDocument=await githubGetDocument(PUBLISHED_CATALOG_PATH,token,targetBranch);
  const catalog=catalogDocument?JSON.parse(catalogDocument.content):{version:1,plants:[]};
  const catalogSha=catalogDocument?.sha??null;
  const publishedPlant={id:asset.id,name:asset.name,path:asset.path,rows:asset.rows,columns:asset.columns,spriteSheet:asset.spriteSheet,combat:asset.combat,publishedAt:new Date().toISOString()};
  const existingIndex=(catalog.plants||[]).findIndex(plant=>plant.id===id);
  catalog.plants=existingIndex>=0?catalog.plants.map((plant,i)=>i===existingIndex?publishedPlant:plant):[...(catalog.plants||[]),publishedPlant];
  catalog.version=1;
  await githubPut(PUBLISHED_CATALOG_PATH,Buffer.from(JSON.stringify(catalog,null,2)+"\n"),"stage plant catalog release "+id,token,releaseBranch,catalogSha);
  const pr=await githubCreatePullRequest(releaseBranch,targetBranch,"Publish plant: "+asset.name+" ("+id+")","## Studio plant release\n\n- Plant: "+id+"\n- Behavior: "+asset.combat.mode+"\n- Includes the plant asset, linked projectile when applicable, and the published plant catalog update.\n- Prepared in FarmVsMonsters Studio; complete manual gameplay verification before merging this release.\n\nMerge this pull request to activate the plant in the target game branch.",token);
  const requested={...asset,releaseRequest:{number:pr.number,url:pr.url,branch:releaseBranch,createdAt:new Date().toISOString()}};
  registry.assets[index]=requested;
  try{await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify(registry,null,2)+"\n"),"studio: request plant release "+id,token,storageBranch,registrySha);}
  catch(error){return NextResponse.json({success:true,operation:"publish-requested",asset:requested,reviewUrl:pr.url,reviewNumber:pr.number,releaseBranch,registrySyncWarning:error.message,message:"تم إنشاء طلب مراجعة النشر، لكن تعذر تحديث حالة الطلب في مكتبة Studio. احتفظ برابط المراجعة."});}
  return NextResponse.json({success:true,operation:"publish-requested",asset:requested,reviewUrl:pr.url,reviewNumber:pr.number,releaseBranch,message:"تم إنشاء طلب مراجعة النشر. لن يتغير فرع اللعبة الأساسي حتى تتم مراجعة الطلب ودمجه."});
 }catch(error){return NextResponse.json({error:error.message||"Studio action failed."},{status:error.code==="STUDIO_WRITE_CONFLICT"?409:502});}
}
