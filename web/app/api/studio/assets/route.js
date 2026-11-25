import {NextResponse} from "next/server";
import {mkdir,readFile,writeFile,unlink} from "node:fs/promises";
import path from "node:path";
import {verifyStudioSession} from "../../../../game/studio/signedSession.mjs";
import {STUDIO_ASSET_TYPES,STUDIO_ID_PATTERN,STUDIO_MAX_UPLOAD_BYTES,STUDIO_RESERVED_PLANT_IDS,validateStudioAssetBytes} from "../../../../game/studio/assetTypes.mjs";
import {createStudioPlantCombatProfile} from "../../../../game/studio/plantProfiles.mjs";
import {assertExpectedContentSha} from "../../../../game/studio/registryConcurrency.mjs";
import {createImmutableAssetPath} from "../../../../game/studio/immutableAssetPath.mjs";
import {resolveStudioReleaseAsset,transitionStudioAssetStatus} from "../../../../game/studio/releaseLifecycle.mjs";
import {cloneStudioAsset,createStudioAssetRevision,restoreStudioAssetRevision} from "../../../../game/studio/assetVersions.mjs";
import {getAssetDependents} from "../../../../game/studio/assetDependencies.mjs";
import {createStudioAnimationProfile} from "../../../../game/studio/animationProfiles.mjs";
import {createSkeletalRigProfile} from "../../../../game/studio/skeletalAnimation.mjs";
import {createStudioMonsterProfile} from "../../../../game/studio/monsterProfiles.mjs";
import {safeAssetPath} from "../../../../game/studio/assetReadiness.mjs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const COOKIE="fvm_studio_session";
const REGISTRY_PATH="web/game/data/studioAssetRegistry.json";
const PUBLISHED_CATALOG_PATH="web/public/assets/studio-plant-catalog.json";
const PUBLISHED_MONSTER_CATALOG_PATH="web/public/assets/studio-monster-catalog.json";
function authorized(req){return verifyStudioSession(process.env.STUDIO_SESSION_SECRET || "",req.cookies.get(COOKIE)?.value||"");}
function ext(type){return {"image/png":".png","image/webp":".webp","image/gif":".gif","audio/mpeg":".mp3","audio/wav":".wav","audio/ogg":".ogg","audio/mp4":".m4a"}[type]||"";}
function getRigPartAssets(assets,asset){const bones=Array.isArray(asset?.rigProfile?.bones)?asset.rigProfile.bones:[];const ids=[...new Set(bones.map(bone=>bone?.part?.assetId).filter(Boolean))];return ids.map(id=>assets.find(item=>item.id===id));}
function getRigPartFrameCount(part){if(!part?.spriteSheet)return 1;const capacity=Math.max(1,Number(part.rows||1)*Number(part.columns||1));const count=Number(part.frameCount)||capacity;return Math.max(1,Math.min(capacity,Number.isInteger(count)?count:capacity));}
function serializeRigParts(assets,asset){return getRigPartAssets(assets,asset).filter(part=>part&&["item","plant","monster","effect"].includes(part.type)&&part.status!=="archived"&&safeAssetPath(part.path)).map(part=>({id:part.id,name:part.name,type:part.type,path:process.env.STUDIO_STORAGE_DRIVER==="github"?"/api/studio/assets?preview="+encodeURIComponent(part.path):part.path,rows:part.spriteSheet?(part.rows||1):1,columns:part.spriteSheet?(part.columns||1):1,frameCount:getRigPartFrameCount(part),spriteSheet:Boolean(part.spriteSheet)}));}
function githubHeaders(token){return {Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};}
function githubUrl(filePath){return "https://api.github.com/repos/"+(process.env.STUDIO_GITHUB_REPOSITORY||"waelkamira/FarmVsMonsters")+"/contents/"+filePath;}
async function githubGetDocument(filePath,token,branch){const response=await fetch(githubUrl(filePath)+"?ref="+encodeURIComponent(branch),{headers:githubHeaders(token)});if(response.status===404)return null;if(!response.ok)throw Error("GitHub read failed ("+response.status+").");const data=await response.json();return {content:Buffer.from(data.content||"","base64").toString("utf8"),sha:data.sha};}
async function githubGet(filePath,token,branch){const document=await githubGetDocument(filePath,token,branch);return document?.content??null;}
async function githubGetBytes(filePath,token,branch){let response=await fetch(githubUrl(filePath)+"?ref="+encodeURIComponent(branch),{headers:{...githubHeaders(token),Accept:"application/vnd.github.raw"}});if(response.status===404){const targetBranch=process.env.STUDIO_PUBLISH_BRANCH||"main";if(targetBranch!==branch)response=await fetch(githubUrl(filePath)+"?ref="+encodeURIComponent(targetBranch),{headers:{...githubHeaders(token),Accept:"application/vnd.github.raw"}});}if(!response.ok)throw Error("GitHub asset read failed ("+response.status+"): "+filePath);return Buffer.from(await response.arrayBuffer());}
async function githubPutImmutable(filePath,bytes,message,token,branch){const api=githubUrl(filePath),headers=githubHeaders(token);const verify=async()=>{const response=await fetch(api+"?ref="+encodeURIComponent(branch),{headers:{...headers,Accept:"application/vnd.github.raw"}});if(response.status===404)return false;if(!response.ok)throw Error("GitHub immutable asset lookup failed ("+response.status+").");return Buffer.from(await response.arrayBuffer()).equals(bytes);};if(await verify())return;const saved=await fetch(api,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({message,branch,content:Buffer.from(bytes).toString("base64")})});if(saved.ok)return;if(await verify())return;const data=await saved.json().catch(()=>({}));throw Error(data.message||"GitHub immutable asset save failed ("+saved.status+").");}
function githubApiUrl(endpoint){return "https://api.github.com/repos/"+(process.env.STUDIO_GITHUB_REPOSITORY||"waelkamira/FarmVsMonsters")+endpoint;}
async function githubGetPullRequest(number,token){
 const response=await fetch(githubApiUrl("/pulls/"+Number(number)),{headers:githubHeaders(token)});
 if(response.status===404)return null;
 if(!response.ok)throw Error("GitHub pull request lookup failed ("+response.status+").");
 const pr=await response.json();
 return {number:pr.number,url:pr.html_url,state:pr.state,merged:Boolean(pr.merged),mergedAt:pr.merged_at||null};
}
async function githubDeleteIfExists(filePath,message,token,branch){
 const document=await githubGetDocument(filePath,token,branch);
 if(!document)return false;
 const response=await fetch(githubUrl(filePath),{method:"DELETE",headers:{...githubHeaders(token),"Content-Type":"application/json"},body:JSON.stringify({message,branch,sha:document.sha})});
 if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.message||"GitHub delete failed ("+response.status+").");}
 return true;
}
function assetOwnedPaths(asset){
 return [...new Set([asset?.path,asset?.atlas?.jsonPath,asset?.audio?.path,asset?.combat?.projectile?.path].filter((value)=>typeof value==="string"&&safeAssetPath(value)))];
}
function assetPathStillUsed(assets,assetPath){
 return assets.some((item)=>[item.path,item.atlas?.jsonPath,item.audio?.path,item.combat?.projectile?.path].includes(assetPath));
}
function removeManifestAssetReferences(manifest,assetPaths){
 const removed=new Set(assetPaths);
 if(Array.isArray(manifest.assets))manifest.assets=manifest.assets.filter((item)=>!removed.has(item?.url));
 if(manifest.groups&&typeof manifest.groups==="object"){
  for(const [group,items] of Object.entries(manifest.groups)){
   if(Array.isArray(items))manifest.groups[group]=items.filter((item)=>!removed.has(item?.url));
  }
  manifest.assetCount=Object.values(manifest.groups).reduce((total,items)=>total+(Array.isArray(items)?items.length:0),0);
 }else if(Array.isArray(manifest.assets))manifest.assetCount=manifest.assets.length;
 return manifest;
}
async function removeLocalAssetManifestReferences(assetPaths){
 const target=path.join(process.cwd(),"public/assets/asset-manifest.json");
 try{
  const manifest=JSON.parse(await readFile(target,"utf8"));
  const updated=removeManifestAssetReferences(manifest,assetPaths);
  await writeFile(target,JSON.stringify(updated,null,2)+"\n","utf8");
 }catch(error){if(error.code!=="ENOENT")throw error;}
}
async function removeGithubAssetManifestReferences(assetPaths,token,branch){
 const filePath="web/public/assets/asset-manifest.json";
 const document=await githubGetDocument(filePath,token,branch);
 if(!document)return;
 const manifest=removeManifestAssetReferences(JSON.parse(document.content),assetPaths);
 await githubPut(filePath,Buffer.from(JSON.stringify(manifest,null,2)+"\n"),"studio: remove deleted asset references from manifest",token,branch,document.sha);
}
async function githubPut(filePath,bytes,message,token,branch,expectedSha){const api=githubUrl(filePath),headers=githubHeaders(token);const check=await fetch(api+"?ref="+encodeURIComponent(branch),{headers});let sha=null;if(check.ok)sha=(await check.json()).sha;else if(check.status!==404)throw Error("GitHub lookup failed ("+check.status+").");assertExpectedContentSha(expectedSha,sha);const saved=await fetch(api,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({message,branch,content:Buffer.from(bytes).toString("base64"),...(sha?{sha}:{})})});if(!saved.ok){const data=await saved.json().catch(()=>({}));throw Error(data.message||"GitHub save failed ("+saved.status+").");}}
async function localRegistry(){try{return JSON.parse(await readFile(path.join(process.cwd(),"game/data/studioAssetRegistry.json"),"utf8"));}catch(error){if(error.code==="ENOENT")return {version:1,assets:[]};throw error;}}
async function saveLocalRegistry(registry){const target=path.join(process.cwd(),"game/data/studioAssetRegistry.json");await mkdir(path.dirname(target),{recursive:true});await writeFile(target,JSON.stringify(registry,null,2)+"\n","utf8");}
function addPreviewUrls(registry){const github=process.env.STUDIO_STORAGE_DRIVER==="github";return {...registry,storage:process.env.STUDIO_STORAGE_DRIVER||"local",assets:(registry.assets||[]).map(asset=>({...asset,previewUrl:github?"/api/studio/assets?preview="+encodeURIComponent(asset.path):asset.path,rigParts:serializeRigParts(registry.assets||[],asset),...(asset.combat?.projectile?{combat:{...asset.combat,projectile:{...asset.combat.projectile,frameCount:asset.combat.projectile.frameCount??1,rows:asset.combat.projectile.rows??1,columns:asset.combat.projectile.columns??1,previewUrl:github?"/api/studio/assets?preview="+encodeURIComponent(asset.combat.projectile.path):asset.combat.projectile.path}}}:{})}))};}
function plantIdFromPath(assetPath){
 const filename=path.basename(assetPath||"").replace(/\.[^.]+$/,"").toLowerCase();
 return filename.replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}
async function hydratePlantLibrary(registry,token,branch,expectedRegistrySha){
 const catalogBranch=process.env.STUDIO_PUBLISH_BRANCH||"main";
 const [manifestRaw,publishedManifestRaw,catalogRaw]=await Promise.all([
  githubGet("web/public/assets/asset-manifest.json",token,branch),
  catalogBranch===branch?Promise.resolve(null):githubGet("web/public/assets/asset-manifest.json",token,catalogBranch),
  githubGet(PUBLISHED_CATALOG_PATH,token,catalogBranch)
 ]);
 const manifest=manifestRaw?JSON.parse(manifestRaw):{assets:[]};
 const publishedManifest=publishedManifestRaw?JSON.parse(publishedManifestRaw):{assets:[]};
 const flattenManifestAssets=(source)=>[
  ...(Array.isArray(source.assets)?source.assets:[]),
  ...Object.entries(source.groups||{}).flatMap(([group,items])=>(Array.isArray(items)?items:[]).map(asset=>({...asset,group})))
 ];
 const manifestAssets=[...flattenManifestAssets(manifest),...flattenManifestAssets(publishedManifest)];
 const uniqueManifestAssets=[...new Map(manifestAssets.filter(asset=>asset.group==="plants"&&asset.url).map(asset=>[asset.url,asset])).values()];
 const catalog=catalogRaw?JSON.parse(catalogRaw):{plants:[]};
 const known=new Map((registry.assets||[]).map(asset=>[asset.id,asset]));
 const published=new Map((catalog.plants||[]).map(plant=>[plant.id,plant]));
 let changed=false;
 for(const source of uniqueManifestAssets.filter(asset=>!/-bomb(?:-|\.)/i.test(asset.url))){
  const id=plantIdFromPath(source.url);
  if(!id)continue;
  const existing=known.get(id);
  const catalogPlant=published.get(id);
  const frame=source.frameConfig;
  const frameCount=Number(source.frameCount)||(
   frame&&source.width&&source.height
    ?Math.max(1,Math.floor(source.width/frame.frameWidth)*Math.floor(source.height/frame.frameHeight))
    :1
  );
  const record={
   ...(existing||{}),
   id,type:"plant",name:catalogPlant?.name||existing?.name||id,path:source.url,
   filename:path.basename(source.url),
   rows:Number(source.rows)||(frame&&source.height?Math.max(1,Math.floor(source.height/frame.frameHeight)):1),
   columns:Number(source.columns)||(frame&&source.width?Math.max(1,Math.floor(source.width/frame.frameWidth)):frameCount),
   frameCount,
   spriteSheet:Boolean(source.spriteSheet||source.type==="spritesheet"),
   status:existing?.type==="monster"?"draft":(existing?.status||(catalogPlant?"published":"draft")),
   createdAt:existing?.createdAt||catalogPlant?.publishedAt||new Date().toISOString(),
   updatedAt:existing?.updatedAt||new Date().toISOString(),
   ...(catalogPlant?.combat?{combat:catalogPlant.combat}:existing?.combat?{combat:existing.combat}:{}),
   ...(existing?.animationProfile?{animationProfile:existing.animationProfile}:source.animationProfile?{animationProfile:source.animationProfile}:{}),
   ...(source.atlasMetadataPath?{atlasMetadataPath:source.atlasMetadataPath}:existing?.atlasMetadataPath?{atlasMetadataPath:existing.atlasMetadataPath}:{}),
   ...(source.sourceFormat?{sourceFormat:source.sourceFormat}:existing?.sourceFormat?{sourceFormat:existing.sourceFormat}:{}),
   ...(source.atlasClips?{atlasClips:source.atlasClips}:existing?.atlasClips?{atlasClips:existing.atlasClips}:{})
  };
  if(existing?.type==="monster")delete record.monsterProfile;
  const comparable=(value)=>{const copy={...value};delete copy.updatedAt;return copy;};
  if(existing&&JSON.stringify(comparable(existing))===JSON.stringify(comparable(record)))continue;
  record.updatedAt=new Date().toISOString();
  if(existing){
   const index=registry.assets.findIndex(asset=>asset.id===id);
   if(index>=0)registry.assets[index]=record;
  }else registry.assets.push(record);
  known.set(id,record);changed=true;
 }
 for(const plant of catalog.plants||[]){
  if(known.has(plant.id))continue;
  const record={...plant,type:"plant",filename:path.basename(plant.path||""),status:"published",createdAt:plant.publishedAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  registry.assets.push(record);known.set(plant.id,record);changed=true;
 }
 if(changed){
  registry.version=1;
  await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify(registry,null,2)+"\n"),"studio: reconcile imported plant assets",token,branch,expectedRegistrySha);
 }
 return registry;
}
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
  projectileTrajectoryType:form.get("projectileTrajectoryType")??previous?.projectileTrajectoryType??"arc",
  projectilePathPoints: (() => { const raw = form.get("projectilePathPoints"); if (raw == null || raw === "") return previous?.projectilePathPoints ?? null; try { return JSON.parse(String(raw)); } catch { throw new Error("Invalid projectile path points JSON."); } })(),
  projectileCurveX:form.get("projectileCurveX")??previous?.projectileCurveX??0,
  projectileCurveY:form.get("projectileCurveY")??previous?.projectileCurveY??110,
  projectileLaunchOffsetX:form.get("projectileLaunchOffsetX")??previous?.projectileLaunchOffsetX??14,
  projectileLaunchOffsetY:form.get("projectileLaunchOffsetY")??previous?.projectileLaunchOffsetY??-30,
  projectileTargetOffsetX:form.get("projectileTargetOffsetX")??previous?.projectileTargetOffsetX??0,
  projectileTargetOffsetY:form.get("projectileTargetOffsetY")??previous?.projectileTargetOffsetY??0,
  projectileCollisionRadius:form.get("projectileCollisionRadius")??previous?.projectileCollisionRadius??22,
  energyAmount:form.get("energyAmount")??previous?.energyAmount??15,
  energyIntervalMs:form.get("energyIntervalMs")??previous?.energyIntervalMs??12000,
  sizePercent:form.get("sizePercent")??previous?.sizePercent??100,
  flipX:form.get("flipX")==="true"
 });
}
export async function GET(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 const driver=process.env.STUDIO_STORAGE_DRIVER||"local";
 if(driver==="github"){
  const token=process.env.STUDIO_GITHUB_TOKEN,branch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets";
  if(!token)return NextResponse.json({error:"STUDIO_GITHUB_TOKEN is required."},{status:503});
  const catalog=req.nextUrl.searchParams.get("catalog");
  if(catalog==="testing-monsters"){
   try{
    const raw=await githubGet(REGISTRY_PATH,token,branch);
    const registry=raw?JSON.parse(raw):{version:1,assets:[]};
    const candidates=await Promise.all((registry.assets||[]).filter(asset=>asset.type==="monster"&&asset.status==="testing").map(async asset=>{
     if(!asset.releaseRequest?.number)return asset;
     try{return resolveStudioReleaseAsset(asset,await githubGetPullRequest(asset.releaseRequest.number,token));}catch{return asset;}
    }));
    const monsters=candidates.filter(asset=>asset.status==="testing").map(asset=>({...asset,path:"/api/studio/assets?preview="+encodeURIComponent(asset.path),rigParts:serializeRigParts(registry.assets||[],asset)}));
    return NextResponse.json({version:1,monsters},{headers:{"Cache-Control":"private, no-store"}});
   }catch(error){return NextResponse.json({error:error.message||"Could not load testing monster catalog."},{status:502});}
  }
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
     rigParts:serializeRigParts(registry.assets||[],asset),
     ...(asset.combat?.projectile?{combat:{...asset.combat,projectile:{...asset.combat.projectile,frameCount:asset.combat.projectile.frameCount??1,rows:asset.combat.projectile.rows??1,columns:asset.combat.projectile.columns??1,path:"/api/studio/assets?preview="+encodeURIComponent(asset.combat.projectile.path)}}}:{})
    }));
    return NextResponse.json({version:1,plants},{headers:{"Cache-Control":"private, no-store"}});
   }catch(error){return NextResponse.json({error:error.message||"Could not load testing catalog."},{status:502});}
  }
  const preview=req.nextUrl.searchParams.get("preview");
  if(preview!==null){
   const allowedTypes={".png":"image/png",".webp":"image/webp",".gif":"image/gif",".mp3":"audio/mpeg",".wav":"audio/wav",".ogg":"audio/ogg",".m4a":"audio/mp4"};
   const extension=path.extname(preview).toLowerCase();
   if(!preview.startsWith("/assets/")||preview.includes("..")||!allowedTypes[extension])return NextResponse.json({error:"Invalid asset preview path."},{status:400});
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),12_000);
   const fetchPreview=async(ref)=>{
    const response=await fetch(githubUrl("web/public"+preview)+"?ref="+encodeURIComponent(ref),{headers:{...githubHeaders(token),Accept:"application/vnd.github.raw"},signal:controller.signal});
    const bytes=response.ok?Buffer.from(await response.arrayBuffer()):null;
    return {response,bytes};
   };
   try{
    let upstream=await fetchPreview(branch);
    if(upstream.response.status===404){
     const targetBranch=process.env.STUDIO_PUBLISH_BRANCH||"main";
     if(targetBranch!==branch)upstream=await fetchPreview(targetBranch);
    }
    if(!upstream.response.ok)return NextResponse.json({error:"GitHub preview failed ("+upstream.response.status+")."},{status:upstream.response.status===404?404:502});
    return new NextResponse(upstream.bytes,{headers:{"Content-Type":allowedTypes[extension],"Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});
   }catch(error){
    const timedOut=error?.name==="TimeoutError"||error?.name==="AbortError";
    return NextResponse.json({error:timedOut?"GitHub preview timed out after 12 seconds.":(error.message||"Preview fetch failed.")},{status:timedOut?504:502});
   }finally{clearTimeout(timeout);}
  }
  try{
   const document=await githubGetDocument(REGISTRY_PATH,token,branch);
   const registry=document?JSON.parse(document.content):{version:1,assets:[]};
   const hydrated=await hydratePlantLibrary(registry,token,branch,document?.sha??null);
   const assets=await Promise.all((hydrated.assets||[]).map(async asset=>{
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
 const id=String(form.get("id")||"").trim().toLowerCase(),type=String(form.get("type")||""),config=STUDIO_ASSET_TYPES[type],file=form.get("file"),projectileFile=form.get("projectileFile"),rows=Number(form.get("rows")||1),columns=Number(form.get("columns")||1),frameCount=Number(form.get("frameCount")||9),replace=String(form.get("replace")||"false")==="true";
 if(!config||!STUDIO_ID_PATTERN.test(id)||id.length>64)return NextResponse.json({error:"Invalid category or ID. Use a lowercase slug up to 64 characters."},{status:400});

 const hasFile=Boolean(file&&typeof file.arrayBuffer==="function"&&file.size>0);
 const hasProjectile=Boolean(projectileFile&&typeof projectileFile.arrayBuffer==="function"&&projectileFile.size>0);
 const removeProjectile=String(form.get("removeProjectile")||"false")==="true";
 const driver=process.env.STUDIO_STORAGE_DRIVER||"local";let old,registrySha;
 try{if(driver==="github"){const token=process.env.STUDIO_GITHUB_TOKEN,branch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets";if(!token)return NextResponse.json({error:"STUDIO_GITHUB_TOKEN is required."},{status:503});const document=await githubGetDocument(REGISTRY_PATH,token,branch);old=document?JSON.parse(document.content):{version:1,assets:[]};registrySha=document?.sha??null;}else old=await localRegistry();}catch(error){return NextResponse.json({error:error.message},{status:502});}
 const index=old.assets.findIndex(a=>a.id===id);let existing=index>=0?old.assets[index]:null;
 if(existing?.releaseRequest?.number){
  if(driver!=="github")return NextResponse.json({error:"لا يمكن تعديل أصل له طلب مراجعة نشر قبل التحقق من حالة الطلب."},{status:409});
  try{
   const releaseToken=process.env.STUDIO_GITHUB_TOKEN;
   if(!releaseToken)return NextResponse.json({error:"STUDIO_GITHUB_TOKEN is required."},{status:503});
   existing=resolveStudioReleaseAsset(existing,await githubGetPullRequest(existing.releaseRequest.number,releaseToken));
   old.assets[index]=existing;
   if(existing.releaseRequest?.state==="open")return NextResponse.json({error:"هناك طلب مراجعة نشر مفتوح لهذا الأصل. انتظر إغلاقه قبل تعديله."},{status:409});
  }catch(error){return NextResponse.json({error:error.message||"تعذر التحقق من طلب النشر الحالي."},{status:502});}
 }
 if(type==="plant"&&STUDIO_RESERVED_PLANT_IDS.includes(id)&&!existing)return NextResponse.json({error:"هذا المعرّف محجوز لنبتة أساسية في اللعبة. اختر معرّفاً جديداً."},{status:409});
 const projectileAssetId=String(form.get("projectileAssetId")||"").trim();
 const selectedProjectileAsset=projectileAssetId?old.assets.find(asset=>asset.id===projectileAssetId&&asset.type==="plantProjectile"):null;
 if(projectileAssetId&&type!=="plant")return NextResponse.json({error:"يمكن ربط القذائف بالنباتات فقط."},{status:400});
 if(projectileAssetId&&!selectedProjectileAsset)return NextResponse.json({error:"القذيفة المحددة غير موجودة في مكتبة Studio."},{status:404});
 if(selectedProjectileAsset?.status==="archived")return NextResponse.json({error:"لا يمكن استخدام قذيفة مؤرشفة."},{status:409});
 if(projectileAssetId&&hasProjectile)return NextResponse.json({error:"اختر قذيفة من المكتبة أو ارفع ملفاً جديداً، وليس كليهما."},{status:400});

 if(existing&&(hasFile||hasProjectile||removeProjectile)){
  const dependents=getAssetDependents(old.assets,id);
  if(dependents.length)return NextResponse.json({error:"لا يمكن استبدال ملفات هذا الأصل قبل معالجة الأصول التي تعتمد عليه: "+dependents.map(item=>item.assetName).join("، ")},{status:409});
 }
 if(existing&&!replace)return NextResponse.json({error:"Asset ID already exists. اختر الأصل من المكتبة واستخدم زر التعديل."},{status:409});
 if(!existing&&replace)return NextResponse.json({error:"الأصل المطلوب تعديله غير موجود في المكتبة."},{status:404});
 if(existing&&existing.type!==type)return NextResponse.json({error:"لا يمكن تغيير فئة الأصل أثناء التعديل."},{status:409});
 if(!hasFile&&(!replace||!existing))return NextResponse.json({error:"Choose a file for a new asset."},{status:400});
 if(hasFile&&(file.size>STUDIO_MAX_UPLOAD_BYTES||!config.accepts.includes(file.type)))return NextResponse.json({error:"Choose a supported file up to 8 MB."},{status:415});
 if(config.spriteSheet&&(!Number.isInteger(frameCount)||frameCount<1||frameCount>24||!Number.isInteger(rows)||!Number.isInteger(columns)||rows<1||columns<1||rows*columns!==frameCount))return NextResponse.json({error:"عدد الإطارات يجب أن يكون من 1 إلى 24، ويجب أن يطابق حاصل ضرب الصفوف والأعمدة."},{status:400});
 let animationProfile=null;
 if(config.spriteSheet&&(type==="plant"||type==="monster")){
  try{
   const rawProfile=String(form.get("animationProfile")||"");
   const submittedProfile=rawProfile?JSON.parse(rawProfile):(existing?.animationProfile||null);
   animationProfile=createStudioAnimationProfile(submittedProfile,rows*columns);
  }catch(error){return NextResponse.json({error:error.message||"Invalid animation profile."},{status:400});}
 }
 let rigProfile=null;
 if(config.spriteSheet&&(type==="plant"||type==="monster")){
  try{
   const rawRigProfile=String(form.get("rigProfile")||"");
   const submittedRigProfile=rawRigProfile?JSON.parse(rawRigProfile):(existing?.rigProfile||null);
   rigProfile=submittedRigProfile?createSkeletalRigProfile(submittedRigProfile):null;
   if(rigProfile){
    if(!rigProfile.bones.some(bone=>bone.part))throw new Error("يجب ربط صورة واحدة على الأقل بأحد عظام الهيكل قبل الحفظ.");
    for(const bone of rigProfile.bones){
     if(!bone.part)continue;
     const partAsset=old.assets.find(item=>item.id===bone.part.assetId);
     if(!partAsset||partAsset.id===id||!["item","plant","monster","effect"].includes(partAsset.type)||partAsset.status==="archived"||!safeAssetPath(partAsset.path)){
      throw new Error("جزء الهيكل "+bone.id+" يشير إلى أصل صورة غير موجود أو غير صالح: "+bone.part.assetId);
     }
     const partFrameCount=getRigPartFrameCount(partAsset);
     if(!Number.isInteger(partFrameCount)||bone.part.frame>=partFrameCount){
      throw new Error("رقم إطار جزء الهيكل "+bone.id+" خارج عدد إطارات الأصل "+bone.part.assetId+".");
     }
    }
   }
  }catch(error){return NextResponse.json({error:error.message||"Invalid skeletal rig profile."},{status:400});}
 }
 if(hasProjectile&&removeProjectile)return NextResponse.json({error:"Choose a new projectile or remove the existing projectile, not both."},{status:400});
 if(projectileAssetId&&removeProjectile)return NextResponse.json({error:"لا يمكن ربط قذيفة وإزالة القذيفة الحالية في العملية نفسها."},{status:400});
 if(hasProjectile&&(type!=="plant"||!STUDIO_ASSET_TYPES.plantProjectile.accepts.includes(projectileFile.type)||projectileFile.size>STUDIO_MAX_UPLOAD_BYTES))return NextResponse.json({error:"Projectile must be a supported PNG/WebP/GIF file up to 8 MB and can only be attached to a plant."},{status:415});
 const projectileBytes=hasProjectile?Buffer.from(await projectileFile.arrayBuffer()):null;
 if(hasProjectile){const signature=validateStudioAssetBytes(projectileFile.type,projectileBytes);if(!signature.valid)return NextResponse.json({error:signature.reason},{status:415});}
 let combatProfile=null;
 if(type==="plant"){
  const behavior=String(form.get("behavior")||"");
  if(!behavior)return NextResponse.json({error:"اختر نظام النبتة يدوياً قبل حفظها."},{status:400});
  if(hasProjectile&&behavior!=="projectile")return NextResponse.json({error:"اختر نظام إطلاق المقذوفات لاستخدام ملف القذيفة، أو أزل ملف القذيفة."},{status:400});
  if(projectileAssetId&&behavior!=="projectile")return NextResponse.json({error:"اختر نظام إطلاق المقذوفات لاستخدام قذيفة المكتبة."},{status:400});
  if(selectedProjectileAsset&&(!selectedProjectileAsset.path?.startsWith("/assets/")||selectedProjectileAsset.path.includes("..")))return NextResponse.json({error:"مسار القذيفة المحددة غير صالح."},{status:400});
  const projectileFrameCount=Number(form.get("projectileFrameCount")||9);
  const projectileRows=Number(form.get("projectileRows")||1);
  const projectileColumns=Number(form.get("projectileColumns")||1);
  if(hasProjectile&&(!Number.isInteger(projectileFrameCount)||projectileFrameCount<1||projectileFrameCount>24||!Number.isInteger(projectileRows)||!Number.isInteger(projectileColumns)||projectileRows<1||projectileColumns<1||projectileRows*projectileColumns!==projectileFrameCount))return NextResponse.json({error:"عدد إطارات القذيفة يجب أن يكون من 1 إلى 24، ويجب أن يطابق حاصل ضرب صفوفها وأعمدتها."},{status:400});
  const currentProjectile=behavior==="projectile"
    ?(hasProjectile
      ?{id:id+"-projectile",filename:id+"-projectile"+ext(projectileFile.type),path:"/assets/"+createImmutableAssetPath("projectiles/plants",id+"-projectile",ext(projectileFile.type),projectileBytes),managed:false,frameCount:projectileFrameCount,rows:projectileRows,columns:projectileColumns}
      :(selectedProjectileAsset
        ?{id:selectedProjectileAsset.id,filename:selectedProjectileAsset.filename,path:selectedProjectileAsset.path,managed:true,frameCount:selectedProjectileAsset.frameCount??1,rows:selectedProjectileAsset.rows??1,columns:selectedProjectileAsset.columns??1}
        :(removeProjectile?null:(existing?.combat?.mode==="projectile"&&existing.combat.projectile?{...existing.combat.projectile,frameCount:existing.combat.projectile.frameCount??1,rows:existing.combat.projectile.rows??1,columns:existing.combat.projectile.columns??1,managed:old.assets.some(item=>item.id===existing.combat.projectile.id&&item.type==="plantProjectile")}:null))))
    :null;
  try{combatProfile=readCombatForm(form,currentProjectile,existing);}catch(error){return NextResponse.json({error:error.message},{status:400});}
  if(combatProfile.mode==="projectile"&&!currentProjectile)return NextResponse.json({error:"ارفع ملف القذيفة مع النبتة أو اختر سلوكاً بديلاً."},{status:400});
  if(rigProfile&&combatProfile.mode==="projectile"&&!rigProfile.attachments.some(item=>item.id==="muzzle"))return NextResponse.json({error:"النبتة ذات الهيكل تحتاج نقطة تثبيت باسم muzzle لإطلاق القذيفة من فوهة السلاح."},{status:400});
 }
 let monsterProfile=null;
 if(type==="monster"){
  try{
   const rawMonsterProfile=String(form.get("monsterProfile")||"");
   monsterProfile=createStudioMonsterProfile(rawMonsterProfile?JSON.parse(rawMonsterProfile):(existing?.monsterProfile||{}));
  }catch(error){return NextResponse.json({error:error.message||"Invalid monster profile."},{status:400});}
 }
 const extension=hasFile?ext(file.type):(existing?.filename?path.extname(existing.filename):path.extname(existing?.path||""));
 if(!extension)return NextResponse.json({error:"Unknown file extension."},{status:415});
 const bytes=hasFile?Buffer.from(await file.arrayBuffer()):null;
 if(hasFile){const signature=validateStudioAssetBytes(file.type,bytes);if(!signature.valid)return NextResponse.json({error:signature.reason},{status:415});}
 const relative=hasFile?createImmutableAssetPath(config.folder,id,extension,bytes):(existing?.path||"").replace(/^\/assets\//,"");
 const now=new Date().toISOString();
 const record=createStudioAssetRevision(existing,{...(existing||{}),id,type,name:String(form.get("name")||id).trim().slice(0,80),filename:hasFile?id+extension:existing.filename,path:hasFile?"/assets/"+relative:existing.path,rows,columns,frameCount:config.spriteSheet?frameCount:1,spriteSheet:config.spriteSheet,status:"draft",releaseRequest:null,publishedAt:null,testingAt:null,archivedAt:null,restoredFromVersion:null,createdAt:existing?.createdAt||now,updatedAt:now,...(type==="plant"?{combat:combatProfile}:{}),...(type==="monster"?{monsterProfile}:{}),flipX:form.get("flipX")==="true",...(config.spriteSheet&&(type==="plant"||type==="monster")?{animationProfile,rigProfile}:{})});
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
 if(!STUDIO_ID_PATTERN.test(id)||!["prepare-test","publish","archive","restore","restore-version","clone","delete"].includes(operation))return NextResponse.json({error:"Invalid asset or operation."},{status:400});
 const driver=process.env.STUDIO_STORAGE_DRIVER||"local";
 if(driver!=="github"){
  if(operation!=="archive"&&operation!=="restore"&&operation!=="restore-version"&&operation!=="clone"&&operation!=="delete")return NextResponse.json({error:"Testing preparation and publishing require GitHub storage."},{status:503});
  try{
   const registry=await localRegistry(),index=registry.assets.findIndex(asset=>asset.id===id);
   if(index<0)return NextResponse.json({error:"لم يتم العثور على الأصل في مكتبة Studio."},{status:404});
   if(operation==="delete"){
    const asset=registry.assets[index];
    if(!["plant","monster"].includes(asset.type))return NextResponse.json({error:"الحذف النهائي متاح للنباتات والوحوش فقط."},{status:409});
    const dependents=getAssetDependents(registry.assets,id);
    if(dependents.length)return NextResponse.json({error:"لا يمكن حذف الأصل لأن أصولاً أخرى تعتمد عليه: "+dependents.map(item=>item.assetName).join("، ")},{status:409});
    const remaining=registry.assets.filter((_,i)=>i!==index);
    const candidatePaths=assetOwnedPaths(asset).filter((assetPath)=>!assetPathStillUsed(remaining,assetPath));
    for(const assetPath of candidatePaths){
     const target=path.resolve(process.cwd(),"public",assetPath.replace(/^\/+/, ""));
     const root=path.resolve(process.cwd(),"public")+path.sep;
     if(!target.startsWith(root))return NextResponse.json({error:"مسار ملف الأصل خارج مجلد الأصول المسموح."},{status:409});
    }
    await removeLocalAssetManifestReferences(candidatePaths);
    await removeGithubAssetManifestReferences(candidatePaths,token,storageBranch);
   if(targetBranch!==storageBranch)await removeGithubAssetManifestReferences(candidatePaths,token,targetBranch);
   for(const [catalogPath,key] of [[PUBLISHED_CATALOG_PATH,"plants"],[PUBLISHED_MONSTER_CATALOG_PATH,"monsters"]]){
     const target=path.join(process.cwd(),"public",catalogPath.replace(/^web\//,""));
     try{const catalog=JSON.parse(await readFile(target,"utf8"));if(Array.isArray(catalog[key])){catalog[key]=catalog[key].filter((item)=>item.id!==id);await writeFile(target,JSON.stringify(catalog,null,2)+"\n","utf8");}}catch(error){if(error.code!=="ENOENT")throw error;}
    }
    for(const assetPath of candidatePaths){
     const target=path.resolve(process.cwd(),"public",assetPath.replace(/^\/+/, ""));
     try{await unlink(target);}catch(error){if(error.code!=="ENOENT")throw error;}
    }
    registry.assets=remaining;
    await saveLocalRegistry(registry);
    return NextResponse.json({success:true,operation,deletedId:id,message:"تم حذف الأصل وملفاته غير المشتركة من المكتبة المحلية."});
   }
   if(operation==="restore-version"&&registry.assets[index].releaseRequest?.number)return NextResponse.json({error:"لا يمكن استعادة إصدار مرتبط بطلب نشر قبل التحقق من حالته."},{status:409});
   if(operation==="archive"||operation==="restore-version"){
    const dependents=getAssetDependents(registry.assets,id);
    if(dependents.length)return NextResponse.json({error:"لا يمكن تنفيذ العملية قبل معالجة الأصول التي تعتمد على هذا الأصل: "+dependents.map(item=>item.assetName).join("، ")},{status:409});
   }
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
  const index=registry.assets.findIndex(asset=>asset.id===id);
  if(index<0)return NextResponse.json({error:"لم يتم العثور على الأصل في مكتبة Studio."},{status:404});
  let asset=registry.assets[index];
  if(operation==="delete"){
   if(!["plant","monster"].includes(asset.type))return NextResponse.json({error:"الحذف النهائي متاح للنباتات والوحوش فقط."},{status:409});
   const dependents=getAssetDependents(registry.assets,id);
   if(dependents.length)return NextResponse.json({error:"لا يمكن حذف الأصل لأن أصولاً أخرى تعتمد عليه: "+dependents.map(item=>item.assetName).join("، ")},{status:409});
   if(asset.releaseRequest?.number){
    const release=await githubGetPullRequest(asset.releaseRequest.number,token);
    if(release?.state==="open")return NextResponse.json({error:"يوجد طلب نشر مفتوح لهذا الأصل. أغلق طلب المراجعة أولاً ثم أعد الحذف."},{status:409});
   }
   const remaining=registry.assets.filter((_,i)=>i!==index);
   const candidatePaths=assetOwnedPaths(asset).filter((assetPath)=>!assetPathStillUsed(remaining,assetPath));
   for(const [catalogPath,key] of [[PUBLISHED_CATALOG_PATH,"plants"],[PUBLISHED_MONSTER_CATALOG_PATH,"monsters"]]){
    const document=await githubGetDocument(catalogPath,token,targetBranch);
    if(!document)continue;
    const catalog=JSON.parse(document.content);
    if(Array.isArray(catalog[key])&&catalog[key].some((item)=>item.id===id)){
     catalog[key]=catalog[key].filter((item)=>item.id!==id);
     await githubPut(catalogPath,Buffer.from(JSON.stringify(catalog,null,2)+"\n"),"studio: remove "+asset.type+" "+id,token,targetBranch,document.sha);
    }
   }
   for(const assetPath of candidatePaths){
    const filePath="web/public"+assetPath;
    await githubDeleteIfExists(filePath,"studio: delete unused asset file for "+id,token,storageBranch);
    if(targetBranch!==storageBranch)await githubDeleteIfExists(filePath,"studio: delete published asset file for "+id,token,targetBranch);
   }
   await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify({...registry,assets:remaining},null,2)+"\n"),"studio: permanently delete "+asset.type+" "+id,token,storageBranch,registrySha);
   return NextResponse.json({success:true,operation,deletedId:id,message:"تم حذف الأصل من سجل Studio وكتالوج اللعبة وملفات GitHub غير المشتركة."});
  }

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
   const dependents=getAssetDependents(registry.assets,id);
   if(dependents.length)return NextResponse.json({error:"لا يمكن استعادة إصدار هذا الأصل قبل معالجة الأصول التي تعتمد عليه: "+dependents.map(item=>item.assetName).join("، ")},{status:409});
   if(asset.releaseRequest?.number){
    if(driver!=="github")return NextResponse.json({error:"لا يمكن استعادة إصدار قبل التحقق من طلب النشر المرتبط."},{status:409});
    try{
     const releaseToken=process.env.STUDIO_GITHUB_TOKEN;
     if(!releaseToken)return NextResponse.json({error:"STUDIO_GITHUB_TOKEN is required."},{status:503});
     asset=resolveStudioReleaseAsset(asset,await githubGetPullRequest(asset.releaseRequest.number,releaseToken));
     registry.assets[index]=asset;
     if(asset.releaseRequest?.state==="open")return NextResponse.json({error:"هناك طلب مراجعة نشر مفتوح لهذا الأصل. انتظر إغلاقه قبل استعادة إصدار."},{status:409});
    }catch(error){return NextResponse.json({error:error.message||"تعذر التحقق من طلب النشر الحالي."},{status:502});}
   }
   let updated;
   try{updated=restoreStudioAssetRevision(asset,body.versionNumber);}
   catch(error){return NextResponse.json({error:error.message},{status:409});}
   registry.assets[index]=updated;
   await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify(registry,null,2)+"\n"),"studio: restore "+id+" version "+body.versionNumber,token,storageBranch,registrySha);
   return NextResponse.json({success:true,operation,asset:updated,message:"تمت استعادة الإصدار كمسودة جديدة؛ يجب اختبارها قبل طلب النشر."});
  }
  if(operation==="archive"){
   const dependents=getAssetDependents(registry.assets,id);
   if(dependents.length)return NextResponse.json({error:"لا يمكن أرشفة هذا الأصل قبل معالجة الأصول التي تعتمد عليه: "+dependents.map(item=>item.assetName).join("، ")},{status:409});
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
   await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify(registry,null,2)+"\n"),"studio: "+operation+" asset "+id,token,storageBranch,registrySha);
   return NextResponse.json({success:true,operation,asset:updated,message:operation==="archive"?"تمت أرشفة الأصل مع الاحتفاظ بملفاته.":"تمت استعادة الأصل كمسودة."});
  }
  if(asset.type!=="plant"&&asset.type!=="monster")return NextResponse.json({error:"هذه العملية متاحة للنباتات والوحوش فقط."},{status:409});
  if(asset.type==="plant"&&!asset.combat?.mode)return NextResponse.json({error:"يجب تعيين سلوك قتالي للنبتة أولاً."},{status:409});
  if(asset.type==="monster"&&!asset.monsterProfile)return NextResponse.json({error:"يجب ضبط خصائص الوحش أولاً."},{status:409});
  if(operation==="prepare-test"){
   const updated={...asset,status:"testing",testingAt:new Date().toISOString(),releaseRequest:null};
   registry.assets[index]=updated;
   await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify(registry,null,2)+"\n"),"studio: prepare "+asset.type+" test "+id,token,storageBranch,registrySha);
   return NextResponse.json({success:true,operation,asset:updated,message:asset.type==="monster"?"الوحش جاهز للاختبار داخل اللعبة.":"النبتة جاهزة للاختبار داخل اللعبة."});
  }
  if(operation!=="publish")return NextResponse.json({error:"عملية Studio غير معروفة."},{status:400});
  if(asset.status!=="testing")return NextResponse.json({error:"يجب تجهيز الأصل للاختبار والتحقق منه داخل اللعبة أولاً."},{status:409});
  if(!safeAssetPath(asset.path))return NextResponse.json({error:"Invalid asset path."},{status:400});

  // Publish directly to the configured game branch. The catalog is written last,
  // so assets are never made visible to the game before their files are present.
  const artworkPath="web/public"+asset.path;
  const artworkBytes=await githubGetBytes(artworkPath,token,storageBranch);
  await githubPutImmutable(artworkPath,artworkBytes,"studio: publish "+asset.type+" artwork "+id,token,targetBranch);
  const rigPartIds=[...new Set((asset.rigProfile?.bones||[]).map(bone=>bone?.part?.assetId).filter(Boolean))];
  const rigPartAssets=getRigPartAssets(registry.assets,asset);
  if(rigPartAssets.length!==rigPartIds.length||rigPartAssets.some(part=>!part||!["item","plant","monster","effect"].includes(part.type)||part.status==="archived"||!safeAssetPath(part.path)))return NextResponse.json({error:"يوجد جزء هيكلي مفقود أو غير صالح؛ أصلح تبعيات الهيكل قبل النشر."},{status:409});
  const rigPartById=new Map(rigPartAssets.filter(Boolean).map(part=>[part.id,part]));
  const invalidRigFrame=(asset.rigProfile?.bones||[]).some(bone=>{if(!bone?.part)return false;const part=rigPartById.get(bone.part.assetId);const count=getRigPartFrameCount(part);return !part||!Number.isInteger(count)||bone.part.frame>=count;});
  if(invalidRigFrame)return NextResponse.json({error:"يوجد إطار غير صالح في أحد أجزاء الهيكل؛ صحح رقم الإطار قبل النشر."},{status:409});
  for(const part of rigPartAssets){if(part.path===asset.path||part.path===asset.combat?.projectile?.path)continue;const partBytes=await githubGetBytes("web/public"+part.path,token,storageBranch);await githubPutImmutable("web/public"+part.path,partBytes,"studio: publish skeletal part "+part.id+" for "+asset.type+" "+id,token,targetBranch);}


  if(asset.type==="plant"&&asset.combat.mode==="projectile"){
   if(!safeAssetPath(asset.combat.projectile?.path))return NextResponse.json({error:"The linked projectile asset is missing."},{status:409});
   const projectilePath="web/public"+asset.combat.projectile.path;
   const projectileBytes=await githubGetBytes(projectilePath,token,storageBranch);
   await githubPutImmutable(projectilePath,projectileBytes,"studio: publish plant projectile "+id,token,targetBranch);
  }

  const isMonster=asset.type==="monster";
  const catalogPath=isMonster?PUBLISHED_MONSTER_CATALOG_PATH:PUBLISHED_CATALOG_PATH;
  const catalogDocument=await githubGetDocument(catalogPath,token,targetBranch);
  const catalog=catalogDocument?JSON.parse(catalogDocument.content):(isMonster?{version:1,monsters:[]}:{version:1,plants:[]});
  const publishedAt=new Date().toISOString();
  const publishedRecord=isMonster
   ?{id:asset.id,name:asset.name,path:asset.path,rows:asset.rows,columns:asset.columns,spriteSheet:asset.spriteSheet,animationProfile:asset.animationProfile||null,rigProfile:asset.rigProfile||null,rigParts:rigPartAssets.map(part=>({id:part.id,name:part.name,path:part.path,rows:part.spriteSheet?(part.rows||1):1,columns:part.spriteSheet?(part.columns||1):1,frameCount:getRigPartFrameCount(part),spriteSheet:Boolean(part.spriteSheet)})),monsterProfile:asset.monsterProfile,flipX:Boolean(asset.flipX),publishedAt}
   :{id:asset.id,name:asset.name,path:asset.path,rows:asset.rows,columns:asset.columns,spriteSheet:asset.spriteSheet,animationProfile:asset.animationProfile||null,rigProfile:asset.rigProfile||null,rigParts:rigPartAssets.map(part=>({id:part.id,name:part.name,path:part.path,rows:part.spriteSheet?(part.rows||1):1,columns:part.spriteSheet?(part.columns||1):1,frameCount:getRigPartFrameCount(part),spriteSheet:Boolean(part.spriteSheet)})),combat:asset.combat,flipX:Boolean(asset.flipX),publishedAt};
  const collectionKey=isMonster?"monsters":"plants";
  const collection=Array.isArray(catalog[collectionKey])?catalog[collectionKey]:[];
  const existingIndex=collection.findIndex(item=>item.id===id);
  catalog[collectionKey]=existingIndex>=0?collection.map((item,i)=>i===existingIndex?publishedRecord:item):[...collection,publishedRecord];
  catalog.version=1;
  await githubPut(catalogPath,Buffer.from(JSON.stringify(catalog,null,2)+"\n"),"studio: publish "+asset.type+" "+id,token,targetBranch,catalogDocument?.sha??null);

  const publishedAsset={...asset,status:"published",publishedAt,releaseRequest:null};
  registry.assets[index]=publishedAsset;
  let registrySyncWarning=null;
  try{
   await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify(registry,null,2)+"\n"),"studio: mark "+asset.type+" published "+id,token,storageBranch,registrySha);
  }catch(error){registrySyncWarning=error.message;}
  return NextResponse.json({success:true,operation:"published",asset:publishedAsset,publishedAt,targetBranch,registrySyncWarning,message:asset.type==="monster"?"تم نشر الوحش مباشرة في اللعبة دون طلب مراجعة.":"تم نشر النبتة مباشرة في اللعبة دون طلب مراجعة."});
 }catch(error){return NextResponse.json({error:error.message||"Studio action failed."},{status:error.code==="STUDIO_WRITE_CONFLICT"?409:502});}
}
