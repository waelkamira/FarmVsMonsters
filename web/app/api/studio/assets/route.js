import {NextResponse} from "next/server";
import {access,mkdir,readFile,writeFile,unlink,rename} from "node:fs/promises";
import path from "node:path";
import {verifyStudioSession} from "../../../../game/studio/signedSession.mjs";
import {STUDIO_ASSET_TYPES,STUDIO_ID_PATTERN,STUDIO_MAX_UPLOAD_BYTES,STUDIO_RESERVED_PLANT_IDS,validateStudioAssetBytes} from "../../../../game/studio/assetTypes.mjs";
import {createStudioPlantCombatProfile} from "../../../../game/studio/plantProfiles.mjs";
import {assertExpectedContentSha} from "../../../../game/studio/registryConcurrency.mjs";
import {createImmutableAssetPath} from "../../../../game/studio/immutableAssetPath.mjs";
import {resolveStudioReleaseAsset,applyProductionDeletionTombstones,findAssetDeletionTombstone,transitionStudioAssetStatus} from "../../../../game/studio/releaseLifecycle.mjs";
import {cloneStudioAsset,createStudioAssetRevision,restoreStudioAssetRevision} from "../../../../game/studio/assetVersions.mjs";
import {getAssetDependents} from "../../../../game/studio/assetDependencies.mjs";
import {getStageAssetReferences} from "../../../../game/studio/stageMonsterReferences.mjs";
import {createStudioAnimationProfile} from "../../../../game/studio/animationProfiles.mjs";
import {createSkeletalRigProfile} from "../../../../game/studio/skeletalAnimation.mjs";
import {createStudioMonsterProfile} from "../../../../game/studio/monsterProfiles.mjs";
import {safeAssetPath} from "../../../../game/studio/assetReadiness.mjs";
import {assetOwnedPaths,assetPathStillUsed,getAssetReleasePaths,createProductionAssetDeletionPlan,getAssetDependencyConflict,requestProductionAssetDeletion,removeAssetManifestReferencesFromBranch,removeManifestAssetReferences,synchronizeAssetAudit,productionDeletionMessages} from "../../../../game/studio/assetDeletion.mjs";
import {validateEffectSelection} from "../../../../game/vfx/effects/effectAssignments.mjs";
import {validateCharacterStateAnimation} from "../../../../game/studio/characterStateAnimations.mjs";
import {getStudioStorageDriver,canWriteStudioStorage} from "../../../../game/studio/storageDriver.mjs";
import {getLocalGitStatus} from "../../../../game/studio/localGitStatus.mjs";
import {importManifestPlants} from "../../../../game/studio/assetLibraryImport.mjs";
import {createStudioReleaseBranchName} from "../../../../game/studio/releaseLifecycle.mjs";
import {createHash} from "node:crypto";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const COOKIE="fvm_studio_session";
const REGISTRY_PATH="web/game/data/studioAssetRegistry.json";
const PUBLISHED_CATALOG_PATH="web/public/assets/studio-plant-catalog.json";
const PUBLISHED_MONSTER_CATALOG_PATH="web/public/assets/studio-monster-catalog.json";
const ASSET_AUDIT_PATH="web/public/assets/asset-audit.json";
const previewCache=new Map();
let localRegistryMutationTail=Promise.resolve();
function withLocalRegistryLock(operation){const result=localRegistryMutationTail.then(operation,operation);localRegistryMutationTail=result.catch(()=>{});return result;}
function authorized(req){return verifyStudioSession(process.env.STUDIO_SESSION_SECRET || "",req.cookies.get(COOKIE)?.value||"");}
function ext(type){return {"image/png":".png","image/webp":".webp","image/gif":".gif","audio/mpeg":".mp3","audio/wav":".wav","audio/ogg":".ogg","audio/mp4":".m4a"}[type]||"";}
function getRigPartAssets(assets,asset){const bones=Array.isArray(asset?.rigProfile?.bones)?asset.rigProfile.bones:[];const ids=[...new Set(bones.map(bone=>bone?.part?.assetId).filter(Boolean))];return ids.map(id=>assets.find(item=>item.id===id));}
function getRigPartFrameCount(part){if(!part?.spriteSheet)return 1;const capacity=Math.max(1,Number(part.rows||1)*Number(part.columns||1));const count=Number(part.frameCount)||capacity;return Math.max(1,Math.min(capacity,Number.isInteger(count)?count:capacity));}
function serializeRigParts(assets,asset){const github=getStudioStorageDriver()==="github";return getRigPartAssets(assets,asset).filter(part=>part&&["item","plant","monster","effect"].includes(part.type)&&part.status!=="archived"&&safeAssetPath(part.path)).map(part=>({id:part.id,name:part.name,type:part.type,path:github?"/api/studio/assets?preview="+encodeURIComponent(part.path):part.path,rows:part.spriteSheet?(part.rows||1):1,columns:part.spriteSheet?(part.columns||1):1,frameCount:getRigPartFrameCount(part),spriteSheet:Boolean(part.spriteSheet)}));}
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
 return {number:pr.number,url:pr.html_url,state:pr.state,merged:Boolean(pr.merged||pr.merged_at),mergedAt:pr.merged_at||null,nodeId:pr.node_id,branch:pr.head?.ref,draft:Boolean(pr.draft)};
}
async function githubDeleteIfExists(filePath,message,token,branch){
 const document=await githubGetDocument(filePath,token,branch);
 if(!document)return false;
 const response=await fetch(githubUrl(filePath),{method:"DELETE",headers:{...githubHeaders(token),"Content-Type":"application/json"},body:JSON.stringify({message,branch,sha:document.sha})});
 if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.message||"GitHub delete failed ("+response.status+").");}
 return true;
}
async function githubGetRef(token,branch){
 const response=await fetch(githubApiUrl("/git/ref/heads/"+encodeURIComponent(branch)),{headers:githubHeaders(token),cache:"no-store"});
 if(response.status===404)return null;
 if(!response.ok)throw Error("GitHub branch lookup failed ("+response.status+").");
 return (await response.json()).object?.sha||null;
}
async function githubCreateReleaseBranch(token,baseBranch,branch){
 if(await githubGetRef(token,branch))return;
 const baseSha=await githubGetRef(token,baseBranch);
 if(!baseSha)throw Error("Production branch was not found.");
 const response=await fetch(githubApiUrl("/git/refs"),{method:"POST",headers:{...githubHeaders(token),"Content-Type":"application/json"},body:JSON.stringify({ref:"refs/heads/"+branch,sha:baseSha})});
 if(response.ok)return;
 if(response.status===422&&await githubGetRef(token,branch))return;
 const data=await response.json().catch(()=>({}));
 throw Error(data.message||"GitHub release branch creation failed ("+response.status+").");
}
async function githubListReleasePullRequests(token,baseBranch){
 const requests=[];
 for(let page=1;page<=100;page++){
  const response=await fetch(githubApiUrl("/pulls?state=all&base="+encodeURIComponent(baseBranch)+"&per_page=100&page="+page),{headers:githubHeaders(token),cache:"no-store"});
  if(!response.ok)throw Error("GitHub release request lookup failed ("+response.status+").");
  const batch=await response.json();
  if(!Array.isArray(batch))throw Error("GitHub release request lookup returned an invalid response.");
  requests.push(...batch);
  if(batch.length<100)return requests;
 }
 throw Error("GitHub release request lookup exceeded its safe pagination limit.");
}
async function githubFindReleasePullRequest(token,baseBranch,marker){
 const requests=await githubListReleasePullRequests(token,baseBranch);
 return requests.find((item)=>String(item.body||"").includes(marker)&&item.state==="open")||null;
}
async function githubFindLatestReleasePullRequest(token,baseBranch,marker){
 const requests=await githubListReleasePullRequests(token,baseBranch);
 const item=requests.filter((candidate)=>String(candidate.body||"").includes(marker)).sort((a,b)=>String(b.updated_at||"").localeCompare(String(a.updated_at||"")))[0];
 return item?{number:item.number,url:item.html_url,branch:item.head?.ref,state:item.state,merged:Boolean(item.merged||item.merged_at),mergedAt:item.merged_at||null,createdAt:item.created_at||null,nodeId:item.node_id,draft:Boolean(item.draft)}:null;
}
function releaseAssetFingerprint(asset){
 const identity={
  id:asset?.id,type:asset?.type,revision:asset?.revision||1,path:asset?.path,
  filename:asset?.filename,rows:asset?.rows,columns:asset?.columns,frameCount:asset?.frameCount,
  spriteSheet:asset?.spriteSheet,animationProfile:asset?.animationProfile,rigProfile:asset?.rigProfile,
  combat:asset?.combat,monsterProfile:asset?.monsterProfile,flipX:asset?.flipX,
  effects:asset?.effects,stateAnimations:asset?.stateAnimations
 };
 return createHash("sha256").update(JSON.stringify(identity)).digest("hex").slice(0,16);
}
async function githubConvertPullRequestToDraft(token,nodeId){
 const response=await fetch("https://api.github.com/graphql",{method:"POST",headers:{...githubHeaders(token),"Content-Type":"application/json"},body:JSON.stringify({query:"mutation($id:ID!){convertPullRequestToDraft(input:{pullRequestId:$id}){pullRequest{id isDraft}}}",variables:{id:nodeId}})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.errors?.length||!data.data?.convertPullRequestToDraft?.pullRequest?.isDraft)throw Error(data.errors?.[0]?.message||"Could not move the release PR to draft before updating its registry.");
}
async function githubMarkPullRequestReady(token,nodeId){
 const response=await fetch("https://api.github.com/graphql",{method:"POST",headers:{...githubHeaders(token),"Content-Type":"application/json"},body:JSON.stringify({query:"mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{id isDraft}}}",variables:{id:nodeId}})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.errors?.length||data.data?.markPullRequestReadyForReview?.pullRequest?.isDraft!==false)throw Error(data.errors?.[0]?.message||"Could not mark the staged release PR ready for review.");
}
async function githubCreateReleasePullRequest(token,{branch,base,title,body,marker}){
 const existing=await githubFindReleasePullRequest(token,base,marker);
 if(existing)return {number:existing.number,url:existing.html_url,state:existing.state,merged:Boolean(existing.merged||existing.merged_at),createdAt:existing.created_at||null,branch:existing.head?.ref,nodeId:existing.node_id,draft:Boolean(existing.draft)};
 const response=await fetch(githubApiUrl("/pulls"),{method:"POST",headers:{...githubHeaders(token),"Content-Type":"application/json"},body:JSON.stringify({head:branch,base,title,body,draft:true})});
 if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.message||"GitHub release pull request creation failed ("+response.status+").");}
 const pr=await response.json();
 return {number:pr.number,url:pr.html_url,state:pr.state,merged:Boolean(pr.merged||pr.merged_at),createdAt:pr.created_at||null,branch:pr.head?.ref,nodeId:pr.node_id,draft:Boolean(pr.draft)};
}
async function beginProductionRelease(token,id,operation,baseBranch,asset){
 const fingerprint=releaseAssetFingerprint(asset);
 const marker="<!-- studio-release:"+operation+":"+id+":"+fingerprint+" -->";
 const requests=await githubListReleasePullRequests(token,baseBranch);
 const matches=requests.filter((item)=>String(item.body||"").includes(marker)).sort((a,b)=>String(b.updated_at||"").localeCompare(String(a.updated_at||"")));
 const completed=matches.find((item)=>item.merged||item.merged_at);
 if(completed)return {branch:completed.head.ref,marker,fingerprint,completed:{number:completed.number,url:completed.html_url,state:completed.state,merged:true,mergedAt:completed.merged_at||null,createdAt:completed.created_at||null,branch:completed.head?.ref}};
 const existing=matches.find((item)=>item.state==="open");
 if(existing)return {branch:existing.head.ref,marker,fingerprint,pr:{number:existing.number,url:existing.html_url,state:existing.state,merged:false,createdAt:existing.created_at||null,branch:existing.head?.ref,nodeId:existing.node_id,draft:Boolean(existing.draft)}};
 const releaseBranch=createStudioReleaseBranchName(id,fingerprint.slice(0,8));
 await githubCreateReleaseBranch(token,baseBranch,releaseBranch);
 return {branch:releaseBranch,marker,fingerprint,pr:null};
}
async function finishProductionRelease(token,release,{baseBranch,title,body,asset,operation}){
 const pr=release.pr||await githubCreateReleasePullRequest(token,{branch:release.branch,base:baseBranch,title,body:body+String.fromCharCode(10)+String.fromCharCode(10)+release.marker,marker:release.marker});
 if(!pr.branch||pr.branch!==release.branch)throw Object.assign(new Error("Release PR head does not match the prepared release branch; no registry state was recorded."),{code:"STUDIO_RELEASE_BRANCH_MISMATCH"});
 if(pr.merged){
  const productionDocument=await githubGetDocument(REGISTRY_PATH,token,baseBranch);
  const productionRegistry=productionDocument?JSON.parse(productionDocument.content):{assets:[],deletedAssetIds:[]};
  const verified=operation==="delete"
   ?findAssetDeletionTombstone(productionRegistry,asset.id)?.releaseRequest?.number===pr.number
   :Boolean(productionRegistry.assets?.some((item)=>item.id===asset.id&&releaseAssetFingerprint(item)===release.fingerprint));
  if(!verified)throw Error("A previous release PR was merged without its matching registry state. Automatic finalization was blocked; manual repair is required.");
  return {number:pr.number,url:pr.url,branch:pr.branch,state:"merged",operation,fingerprint:release.fingerprint,requestedAt:pr.createdAt||null};
 }
 if(pr.state!=="open")throw Error("The release PR is not open; registry state was not finalized.");
 let nodeId=pr.nodeId,draft=pr.draft;
 if(!nodeId){const detail=await githubGetPullRequest(pr.number,token);nodeId=detail?.nodeId;draft=detail?.draft;}
 if(!nodeId)throw Error("GitHub did not return the release PR node ID.");
 if(!draft){await githubConvertPullRequestToDraft(token,nodeId);draft=true;}
 const releaseRequest={number:pr.number,url:pr.url,branch:pr.branch,state:"open",operation,fingerprint:release.fingerprint,requestedAt:pr.createdAt||null};
 await writeProductionRegistryRelease(token,pr.branch,asset,releaseRequest,operation);
 const stagedDocument=await githubGetDocument(REGISTRY_PATH,token,pr.branch);
 const stagedRegistry=stagedDocument?JSON.parse(stagedDocument.content):{assets:[],deletedAssetIds:[]};
 const staged=operation==="delete"
  ?findAssetDeletionTombstone(stagedRegistry,asset.id)?.releaseRequest?.number===pr.number
  :stagedRegistry.assets?.some((item)=>item.id===asset.id&&item.releaseRequest?.number===pr.number&&releaseAssetFingerprint(item)===release.fingerprint);
 if(!staged)throw Error("The release registry change could not be verified on the PR head; the PR remains draft and cannot be merged.");
 if(draft)await githubMarkPullRequestReady(token,nodeId);
 return releaseRequest;
}
async function writeProductionRegistryRelease(token,branch,asset,releaseRequest,operation){
 const document=await githubGetDocument(REGISTRY_PATH,token,branch);
 const registry=document?JSON.parse(document.content):{version:1,assets:[],deletedAssetIds:[]};
 registry.assets=Array.isArray(registry.assets)?registry.assets:[];
 registry.deletedAssetIds=Array.isArray(registry.deletedAssetIds)?registry.deletedAssetIds:[];
 const index=registry.assets.findIndex((item)=>item.id===asset.id);
 if(operation==="delete"){
  registry.assets=registry.assets.filter((item)=>item.id!==asset.id);
  const tombstone={id:asset.id,type:asset.type,path:asset.path,filename:asset.filename,deletedAt:asset.deletedAt||releaseRequest.requestedAt||new Date().toISOString(),releaseRequest:{...releaseRequest,operation:"delete"}};
  const oldIndex=registry.deletedAssetIds.findIndex((entry)=>typeof entry==="string"?entry===asset.id:entry?.id===asset.id);
  if(oldIndex>=0)registry.deletedAssetIds[oldIndex]=tombstone;else registry.deletedAssetIds.push(tombstone);
 }else{
  const pending={...asset,status:"approved",releaseRequest:{...releaseRequest,operation:"publish",state:"open"}};
  if(index>=0)registry.assets[index]={...registry.assets[index],...pending};else registry.assets.push(pending);
 }
 const content=JSON.stringify(registry,null,2)+"\n";
 if(document?.content===content)return;
 await githubPut(REGISTRY_PATH,Buffer.from(content),"studio: record "+operation+" request for "+asset.id,token,branch,document?.sha??null);
}
async function removeLocalAssetManifestReferences(assetPaths){
  const target=path.join(process.cwd(),"public/assets/asset-manifest.json");
  try{
   const manifest=removeManifestAssetReferences(JSON.parse(await readFile(target,"utf8")),assetPaths);
   await writeFile(target,JSON.stringify(manifest,null,2)+"\n","utf8");
   const auditPath=path.join(process.cwd(),"public/assets/asset-audit.json");
   try{
    const audit=synchronizeAssetAudit(JSON.parse(await readFile(auditPath,"utf8")),manifest);
    await writeFile(auditPath,JSON.stringify(audit,null,2)+"\n","utf8");
   }catch(error){if(error.code!=="ENOENT")throw error;}
  }catch(error){if(error.code!=="ENOENT")throw error;}
 }
 async function removeGithubAssetManifestReferences(assetPaths,token,branch){
  return removeAssetManifestReferencesFromBranch({
   assetPaths,
   branch,
   getDocument:(filePath,ref)=>githubGetDocument(filePath,token,ref),
   putFile:(filePath,bytes,message,ref,expectedSha)=>githubPut(filePath,bytes,message,token,ref,expectedSha)
  });
 }
 async function githubPut(filePath,bytes,message,token,branch,expectedSha){const api=githubUrl(filePath),headers=githubHeaders(token);const check=await fetch(api+"?ref="+encodeURIComponent(branch),{headers});let sha=null;if(check.ok)sha=(await check.json()).sha;else if(check.status!==404)throw Error("GitHub lookup failed ("+check.status+").");assertExpectedContentSha(expectedSha,sha);const saved=await fetch(api,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({message,branch,content:Buffer.from(bytes).toString("base64"),...(sha?{sha}:{})})});if(!saved.ok){const data=await saved.json().catch(()=>({}));throw Error(data.message||"GitHub save failed ("+saved.status+").");}}
async function localStageEncounterConfig(){
 try{return JSON.parse(await readFile(path.join(process.cwd(),"game/data/stageEncounterConfig.json"),"utf8"));}
 catch(error){if(error.code==="ENOENT")return {stages:{}};throw error;}
}
function stageReferenceConflict(id,config){
 const references=getStageAssetReferences(config,id);
 if(!references.length)return null;
 const locations=references.map(item=>item.kind==="monster"?`\u0627\u0644\u0645\u0631\u062d\u0644\u0629 ${item.stageId}\u060c \u0627\u0644\u0645\u0648\u062c\u0629 ${item.wave}`:`\u0627\u0644\u0645\u0631\u062d\u0644\u0629 ${item.stageId}`).join("\u061b ");
 return `\u0644\u0627 \u064a\u0645\u0643\u0646 \u062d\u0630\u0641 \u0627\u0644\u0623\u0635\u0644 \u0644\u0623\u0646\u0647 \u0645\u0633\u062a\u062e\u062f\u0645 \u0641\u064a \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u0631\u0627\u062d\u0644: ${locations}. \u0623\u0632\u0644 \u0645\u0631\u0627\u062c\u0639 \u0627\u0644\u0645\u0631\u062d\u0644\u0629 \u0623\u0648\u0644\u0627\u064b.`;
}
async function localRegistry(){try{return JSON.parse(await readFile(path.join(process.cwd(),"game/data/studioAssetRegistry.json"),"utf8"));}catch(error){if(error.code==="ENOENT")return {version:1,assets:[]};throw error;}}
async function saveLocalRegistry(registry){const target=path.join(process.cwd(),"game/data/studioAssetRegistry.json");await mkdir(path.dirname(target),{recursive:true});const temporary=target+".tmp-"+process.pid+"-"+Date.now();try{await writeFile(temporary,JSON.stringify(registry,null,2)+String.fromCharCode(10),{encoding:"utf8",flag:"wx"});await rename(temporary,target);}catch(error){try{await unlink(temporary);}catch{}throw error;}}
function isRetiredEnemyAsset(asset){return /hyena|dragon/i.test(JSON.stringify(asset||{}));}
function addPreviewUrls(registry){const driver=getStudioStorageDriver(),github=driver==="github";const assets=(registry.assets||[]).filter(asset=>!isRetiredEnemyAsset(asset));return {...registry,storage:driver,assets:assets.map(asset=>({...asset,previewUrl:github?"/api/studio/assets?preview="+encodeURIComponent(asset.path):asset.path,...(asset.stateAnimations?{stateAnimations:Object.fromEntries(Object.entries(asset.stateAnimations).map(([stateId,state])=>[stateId,{...state,previewUrl:github?"/api/studio/assets?preview="+encodeURIComponent(state.path):state.path}]))}:{}),rigParts:serializeRigParts(assets,asset),...(asset.combat?.projectile?{combat:{...asset.combat,projectile:{...asset.combat.projectile,frameCount:asset.combat.projectile.frameCount??1,rows:asset.combat.projectile.rows??1,columns:asset.combat.projectile.columns??1,previewUrl:github?"/api/studio/assets?preview="+encodeURIComponent(asset.combat.projectile.path):asset.combat.projectile.path}}}:{})}))};}
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
 const driver=getStudioStorageDriver();
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
    const monsters=candidates.filter(asset=>asset.status==="testing").map(asset=>({...addStatePreviewUrls(asset),path:"/api/studio/assets?preview="+encodeURIComponent(asset.path),rigParts:serializeRigParts(registry.assets||[],asset)}));
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
     ...addStatePreviewUrls(asset),
     path:"/api/studio/assets?preview="+encodeURIComponent(asset.path),
     rigParts:serializeRigParts(registry.assets||[],asset),
     ...(asset.combat?.projectile?{combat:{...asset.combat,projectile:{...asset.combat.projectile,frameCount:asset.combat.projectile.frameCount??1,rows:asset.combat.projectile.rows??1,columns:asset.combat.projectile.columns??1,path:"/api/studio/assets?preview="+encodeURIComponent(asset.combat.projectile.path)}}}:{})
    }));
    return NextResponse.json({version:1,plants},{headers:{"Cache-Control":"private, no-store"}});
   }catch(error){return NextResponse.json({error:error.message||"Could not load testing catalog."},{status:502});}
  }
  const preview=req.nextUrl.searchParams.get("preview");
  if(preview!==null){
   if(/hyena|dragon/i.test(preview))return NextResponse.json({error:"This enemy asset has been permanently retired."},{status:410,headers:{"Cache-Control":"private, no-store"}});
   const allowedTypes={".png":"image/png",".webp":"image/webp",".gif":"image/gif",".mp3":"audio/mpeg",".wav":"audio/wav",".ogg":"audio/ogg",".m4a":"audio/mp4"};
   const extension=path.extname(preview).toLowerCase();
   if(!preview.startsWith("/assets/")||preview.includes("..")||!allowedTypes[extension])return NextResponse.json({error:"Invalid asset preview path."},{status:400});
   const cacheKey=branch+":"+preview;
   const cached=previewCache.get(cacheKey);
   if(cached&&cached.expiresAt>Date.now())return new NextResponse(cached.bytes,{headers:{"Content-Type":allowedTypes[extension],"Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});
   if(cached)previewCache.delete(cacheKey);
   const fetchPreview=async(ref)=>{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),30_000);
    try{
     const response=await fetch(githubUrl("web/public"+preview)+"?ref="+encodeURIComponent(ref),{headers:{...githubHeaders(token),Accept:"application/vnd.github.raw"},signal:controller.signal});
     const bytes=response.ok?Buffer.from(await response.arrayBuffer()):null;
     return {response,bytes};
    }finally{clearTimeout(timeout);}
   };
   try{
    let upstream=await fetchPreview(branch);
    if(upstream.response.status===404){
     const targetBranch=process.env.STUDIO_PUBLISH_BRANCH||"main";
     if(targetBranch!==branch)upstream=await fetchPreview(targetBranch);
    }
    if(!upstream.response.ok)return NextResponse.json({error:"GitHub preview failed ("+upstream.response.status+")."},{status:upstream.response.status===404?404:502});
    previewCache.set(cacheKey,{bytes:upstream.bytes,expiresAt:Date.now()+300_000});
    while(previewCache.size>100)previewCache.delete(previewCache.keys().next().value);
    return new NextResponse(upstream.bytes,{headers:{"Content-Type":allowedTypes[extension],"Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});
   }catch(error){
    const timedOut=error?.name==="TimeoutError"||error?.name==="AbortError";
    return NextResponse.json({error:timedOut?"GitHub preview timed out after 30 seconds.":(error.message||"Preview fetch failed.")},{status:timedOut?504:502});
   }
  }
  try{
    const document=await githubGetDocument(REGISTRY_PATH,token,branch);
    const registry=document?JSON.parse(document.content):{version:1,assets:[]};
    const productionDocument=branch===(process.env.STUDIO_PUBLISH_BRANCH||"main")?document:await githubGetDocument(REGISTRY_PATH,token,process.env.STUDIO_PUBLISH_BRANCH||"main");
    if(!productionDocument)throw new Error("Production Studio registry is unavailable; deletion state cannot be verified.");
    const productionRegistry=JSON.parse(productionDocument.content);
    let releasePullRequests=[];
    try{releasePullRequests=await githubListReleasePullRequests(token,process.env.STUDIO_PUBLISH_BRANCH||"main");}catch{}
    const assets=await Promise.all((registry.assets||[]).map(async asset=>{
    let request=asset.releaseRequest||null,pr=null;
    if(request?.number){
     try{pr=await githubGetPullRequest(request.number,token);}catch{}
    }else{
     const matched=releasePullRequests.filter((candidate)=>String(candidate.body||"").includes("<!-- studio-release:publish:"+asset.id+":")||String(candidate.body||"").includes("<!-- studio-release:delete:"+asset.id+":"))
      .sort((a,b)=>String(b.updated_at||"").localeCompare(String(a.updated_at||"")))[0];
     if(matched){
      const operation=String(matched.body||"").includes("<!-- studio-release:delete:"+asset.id+":")?"delete":"publish";
      request={number:matched.number,url:matched.html_url,branch:matched.head?.ref,state:matched.state,operation};
      pr={number:matched.number,url:matched.html_url,state:matched.state,merged:Boolean(matched.merged||matched.merged_at),mergedAt:matched.merged_at||null};
     }
    }
    if(!request?.number)return asset;
    try{
     if(!pr)pr=await githubGetPullRequest(request.number,token);
     return resolveStudioReleaseAsset({...asset,releaseRequest:request},pr);
    }catch{return {...asset,status:"approved",releaseRequest:{...request,state:"unknown"}};}
   }));
    const releaseBranch=process.env.STUDIO_PUBLISH_BRANCH||"main";
    let syncStates=["Production differs"];
    try{const [sourceTip,productionTip]=await Promise.all([githubGetRef(token,branch),githubGetRef(token,releaseBranch)]);if(sourceTip&&sourceTip===productionTip)syncStates=["Synced"];}catch{}
    const finalizedAssets=applyProductionDeletionTombstones(assets,productionRegistry.deletedAssetIds);
    return NextResponse.json({...addPreviewUrls({...registry,assets:finalizedAssets}),syncStates,sourceBranch:branch},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){return NextResponse.json({error:error.message},{status:502});}
 }
 const gitStatus=await getLocalGitStatus();
 return NextResponse.json({...addPreviewUrls(await localRegistry()),syncStates:gitStatus.syncStates,gitStatus,sourceBranch:"local"},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 if(!canWriteStudioStorage())return NextResponse.json({error:"لا يمكن إنشاء أو تعديل مسودة من واجهة الإنتاج. استخدم بيئة التطوير المحلية ثم راجع طلب النشر."},{status:403});
 return withLocalRegistryLock(async()=>{
 let form;try{form=await req.formData();}catch{return NextResponse.json({error:"Invalid multipart upload."},{status:400});}
 const id=String(form.get("id")||"").trim().toLowerCase(),type=String(form.get("type")||""),config=STUDIO_ASSET_TYPES[type],file=form.get("file"),projectileFile=form.get("projectileFile"),stateAnimationFile=form.get("stateAnimationFile"),stateId=String(form.get("stateId")||""),stateRows=Number(form.get("stateRows")||1),stateColumns=Number(form.get("stateColumns")||1),stateFrameCount=Number(form.get("stateFrameCount")||1),stateFps=Number(form.get("stateFps")||10),rows=Number(form.get("rows")||1),columns=Number(form.get("columns")||1),frameCount=Number(form.get("frameCount")||9),replace=String(form.get("replace")||"false")==="true";
 if(!config||!STUDIO_ID_PATTERN.test(id)||id.length>64)return NextResponse.json({error:"Invalid category or ID. Use a lowercase slug up to 64 characters."},{status:400});

 const hasFile=Boolean(file&&typeof file.arrayBuffer==="function"&&file.size>0);
 const hasProjectile=Boolean(projectileFile&&typeof projectileFile.arrayBuffer==="function"&&projectileFile.size>0);
 const hasStateAnimation=Boolean(stateAnimationFile&&typeof stateAnimationFile.arrayBuffer==="function"&&stateAnimationFile.size>0);
 const removeProjectile=String(form.get("removeProjectile")||"false")==="true";
 const driver="local";let old;
 try{old=await localRegistry();}catch(error){return NextResponse.json({error:error.message},{status:502});}
  if(findAssetDeletionTombstone(old,id))return NextResponse.json({error:"هذا المعرّف مسجل كأصل محذوف ولا يمكن إعادة استخدامه."},{status:409});
 const index=old.assets.findIndex(a=>a.id===id);let existing=index>=0?old.assets[index]:null;
 if(existing?.releaseRequest?.number)return NextResponse.json({error:"Assets with an outstanding production release request cannot be edited locally."},{status:409});
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
 if(hasStateAnimation){
  const preliminary=validateCharacterStateAnimation({stateId,path:"/assets/validation.png",rows:stateRows,columns:stateColumns,frameCount:stateFrameCount,fps:stateFps});
  if(!preliminary.valid)return NextResponse.json({error:preliminary.errors.join(" ")},{status:400});
  if(!replace||!existing||!(type==="plant"||type==="monster"))return NextResponse.json({error:"إطارات الحالات متاحة لتعديل نبتة أو وحش موجود فقط."},{status:400});
  if(stateAnimationFile.size>STUDIO_MAX_UPLOAD_BYTES||!["image/png","image/webp"].includes(stateAnimationFile.type))return NextResponse.json({error:"ارفع صورة PNG أو WebP حتى 8 MB."},{status:415});
  if(!Number.isInteger(stateFrameCount)||stateFrameCount<1||stateFrameCount>24||!Number.isInteger(stateRows)||!Number.isInteger(stateColumns)||stateRows<1||stateColumns<1||stateRows*stateColumns!==stateFrameCount)return NextResponse.json({error:"شبكة إطارات الحالة غير صحيحة."},{status:400});
  if(!Number.isFinite(stateFps)||stateFps<1||stateFps>30)return NextResponse.json({error:"سرعة الحالة يجب أن تكون بين 1 و30 FPS."},{status:400});
 }
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
 const stateAnimationBytes=hasStateAnimation?Buffer.from(await stateAnimationFile.arrayBuffer()):null;
 if(hasStateAnimation){const signature=validateStudioAssetBytes(stateAnimationFile.type,stateAnimationBytes);if(!signature.valid)return NextResponse.json({error:signature.reason},{status:415});}
 const relative=hasFile?createImmutableAssetPath(config.folder,id,extension,bytes):(existing?.path||"").replace(/^\/assets\//,"");
 const stateExtension=hasStateAnimation?ext(stateAnimationFile.type):null;
 const stateRelative=hasStateAnimation?createImmutableAssetPath(config.folder+"/states",id+"-"+stateId,stateExtension,stateAnimationBytes):null;
 const statePath=stateRelative?"/assets/"+stateRelative:null;
 const stateLoop=String(form.get("stateLoop")||"true")==="true";
 const stateAnimations=hasStateAnimation?{...(existing?.stateAnimations||{}),[stateId]:{stateId,path:statePath,rows:stateRows,columns:stateColumns,frameCount:stateFrameCount,fps:stateFps,loop:stateLoop,spriteSheet:true,updatedAt:new Date().toISOString()}}:(existing?.stateAnimations||{});
 if(hasStateAnimation){const validation=validateCharacterStateAnimation({stateId,path:statePath,rows:stateRows,columns:stateColumns,frameCount:stateFrameCount,fps:stateFps,loop:stateLoop});if(!validation.valid)return NextResponse.json({error:validation.errors.join(" ")},{status:400});}
 const now=new Date().toISOString();
 const record=createStudioAssetRevision(existing,{...(existing||{}),id,type,name:String(form.get("name")||id).trim().slice(0,80),filename:hasFile?id+extension:existing.filename,path:hasFile?"/assets/"+relative:existing.path,rows,columns,frameCount:config.spriteSheet?frameCount:1,spriteSheet:config.spriteSheet,status:"draft",releaseRequest:null,publishedAt:null,testingAt:null,archivedAt:null,restoredFromVersion:null,createdAt:existing?.createdAt||now,updatedAt:now,...(type==="plant"?{combat:combatProfile}:{}),...(type==="monster"?{monsterProfile}:{}),flipX:form.get("flipX")==="true",...(existing?.effects?.length?{effects:existing.effects}:{}),...(Object.keys(stateAnimations).length?{stateAnimations}:{}),...(config.spriteSheet&&(type==="plant"||type==="monster")?{animationProfile,rigProfile}:{})});
 if(hasFile)delete record.assetAvailability;
 const next={...old,version:1,assets:existing?old.assets.map((a,i)=>i===index?record:a):[...old.assets,record]};
 try{
  if(hasFile){const target=path.join(process.cwd(),"public/assets",relative);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,bytes);}
  if(hasStateAnimation){const stateTarget=path.join(process.cwd(),"public/assets",stateRelative);await mkdir(path.dirname(stateTarget),{recursive:true});await writeFile(stateTarget,stateAnimationBytes);}
  if(hasProjectile){const pTarget=path.join(process.cwd(),"public",record.combat.projectile.path.replace(/^\//,""));await mkdir(path.dirname(pTarget),{recursive:true});await writeFile(pTarget,projectileBytes);}
  await saveLocalRegistry(next);
 return NextResponse.json({success:true,asset:record,storage:driver,operation:existing?"replaced":"created"});
 }catch(error){return NextResponse.json({error:error.message||"Asset save failed."},{status:error.code==="STUDIO_WRITE_CONFLICT"?409:500});}
 });
}
export async function PATCH(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 let body;try{body=await req.json();}catch{return NextResponse.json({error:"Invalid Studio action."},{status:400});}
 const id=String(body.id||"").trim(),operation=String(body.operation||"");
 if(operation==="import-manifest"){
  if(!canWriteStudioStorage())return NextResponse.json({error:"استيراد الأصول متاح من بيئة التطوير المحلية فقط."},{status:403});
  return withLocalRegistryLock(async()=>{
  try{
   const registry=await localRegistry();
   const manifest=JSON.parse(await readFile(path.join(process.cwd(),"public/assets/asset-manifest.json"),"utf8"));
   let catalog={plants:[]};
   try{catalog=JSON.parse(await readFile(path.join(process.cwd(),PUBLISHED_CATALOG_PATH.replace(/^web\//,"")),"utf8"));}catch(error){if(error.code!=="ENOENT")throw error;}
   const result=importManifestPlants(registry,manifest,catalog);
   if(result.imported)await saveLocalRegistry(result.registry);
   return NextResponse.json({success:true,operation,imported:result.imported,skippedDeleted:result.skippedDeleted,storage:"local"});
  }catch(error){return NextResponse.json({error:error.message||"تعذر استيراد الأصول."},{status:500});}
  });
 }
 if(operation==="set-effects")return withLocalRegistryLock(()=>setAssetEffects(id,body.effects));
 if(!STUDIO_ID_PATTERN.test(id)||!["prepare-test","publish","archive","restore","restore-version","clone","delete"].includes(operation))return NextResponse.json({error:"Invalid asset or operation."},{status:400});
 const driver=getStudioStorageDriver();
 if(driver!=="github"){
  if(operation==="publish")return NextResponse.json({error:"Publishing requires a production release request."},{status:503});
  return withLocalRegistryLock(async()=>{
  try{
   const registry=await localRegistry(),index=registry.assets.findIndex(asset=>asset.id===id);
   if(index<0){const deleted=(registry.deletedAssetIds||[]).some(entry=>typeof entry==="string"?entry===id:entry?.id===id);if(operation==="delete"&&deleted)return NextResponse.json({success:true,operation,deletedId:id,alreadyDeleted:true,storage:"local"});return NextResponse.json({error:"Asset not found."},{status:404});}
   const asset=registry.assets[index];
   if(operation==="prepare-test"){
    if(asset.status==="testing")return NextResponse.json({success:true,operation,asset,alreadyPrepared:true,storage:"local"});
    if(asset.status!=="draft")return NextResponse.json({error:"Only draft assets can be prepared for local testing."},{status:409});
    const rigPartIds=[...new Set((asset.rigProfile?.bones||[]).map(bone=>bone?.part?.assetId).filter(Boolean))];
    const rigPartAssets=getRigPartAssets(registry.assets,asset);
    const related=[...rigPartAssets,...(asset.combat?.projectile?.managed?registry.assets.filter(item=>item.id===asset.combat.projectile.id):[])];
    if(rigPartAssets.length!==rigPartIds.length||related.some(item=>!item||item.status==="archived"||!safeAssetPath(item.path)))return NextResponse.json({error:"A required rig or projectile dependency is missing or invalid."},{status:409});
    const required=[asset.path,...(asset.combat?.projectile?.path?[asset.combat.projectile.path]:[]),...Object.values(asset.stateAnimations||{}).map(state=>state?.path),...related.map(item=>item.path)];
    if(required.some(assetPath=>!safeAssetPath(assetPath)))return NextResponse.json({error:"A required artwork, state, or projectile reference has an invalid path."},{status:409});
    for(const assetPath of required){try{await access(path.join(process.cwd(),"public",decodeURIComponent(assetPath.slice(1))));}catch{return NextResponse.json({error:"Required local test asset is missing: "+assetPath},{status:409});}}
    const updated={...asset,status:"testing",testingAt:new Date().toISOString(),releaseRequest:null};registry.assets[index]=updated;await saveLocalRegistry(registry);return NextResponse.json({success:true,operation,asset:updated,storage:"local"});
   }
   if(operation==="delete"){
    const conflict=stageReferenceConflict(id,await localStageEncounterConfig());if(conflict)return NextResponse.json({error:conflict},{status:409});
    const dependencyConflict=getAssetDependencyConflict(registry.assets,id);if(dependencyConflict)return NextResponse.json({error:dependencyConflict.message},{status:dependencyConflict.status});
    const remaining=registry.assets.filter((_,i)=>i!==index),candidatePaths=assetOwnedPaths(asset).filter(assetPath=>!assetPathStillUsed(remaining,assetPath));
    for(const assetPath of candidatePaths){const target=path.resolve(process.cwd(),"public",assetPath.replace(/^\/+/,"")),root=path.resolve(process.cwd(),"public")+path.sep;if(!target.startsWith(root))return NextResponse.json({error:"Asset path is outside public assets."},{status:409});}
    await removeLocalAssetManifestReferences(candidatePaths);
    for(const [catalogPath,key] of [[PUBLISHED_CATALOG_PATH,"plants"],[PUBLISHED_MONSTER_CATALOG_PATH,"monsters"]]){const target=path.join(process.cwd(),catalogPath.replace(/^web\//,""));try{const catalog=JSON.parse(await readFile(target,"utf8"));if(Array.isArray(catalog[key])){catalog[key]=catalog[key].filter(item=>item.id!==id);await writeFile(target,JSON.stringify(catalog,null,2)+"\n","utf8");}}catch(error){if(error.code!=="ENOENT")throw error;}}
    for(const assetPath of candidatePaths){try{await unlink(path.resolve(process.cwd(),"public",assetPath.replace(/^\/+/,"")));}catch(error){if(error.code!=="ENOENT")throw error;}}
    registry.assets=remaining;registry.deletedAssetIds=Array.isArray(registry.deletedAssetIds)?registry.deletedAssetIds:[];if(!registry.deletedAssetIds.some(entry=>typeof entry==="string"?entry===id:entry?.id===id))registry.deletedAssetIds.push({id,type:asset.type,path:asset.path,filename:asset.filename,deletedAt:new Date().toISOString()});await saveLocalRegistry(registry);return NextResponse.json({success:true,operation,deletedId:id,storage:"local"});
   }
   if(operation==="clone"){const newId=String(body.newId||"").trim().toLowerCase();if(!STUDIO_ID_PATTERN.test(newId)||newId.length>64)return NextResponse.json({error:"Invalid clone ID."},{status:400});if(registry.assets.some(item=>item.id===newId)||(registry.deletedAssetIds||[]).some(entry=>typeof entry==="string"?entry===newId:entry?.id===newId))return NextResponse.json({error:"Asset ID already exists or is tombstoned."},{status:409});const clone=cloneStudioAsset(asset,newId,body.newName);registry.assets.push(clone);await saveLocalRegistry(registry);return NextResponse.json({success:true,operation,asset:clone,storage:"local"});}
   if(operation==="archive"&&asset.type==="monster"){const conflict=stageReferenceConflict(id,await localStageEncounterConfig());if(conflict)return NextResponse.json({error:conflict},{status:409});}
   if(operation==="archive"||operation==="restore-version"){const dependencyConflict=getAssetDependencyConflict(registry.assets,id);if(dependencyConflict)return NextResponse.json({error:dependencyConflict.message},{status:dependencyConflict.status});}
   let updated;try{updated=operation==="restore-version"?restoreStudioAssetRevision(asset,body.versionNumber):transitionStudioAssetStatus(asset,operation);}catch(error){return NextResponse.json({error:error.message},{status:409});}registry.assets[index]=updated;await saveLocalRegistry(registry);return NextResponse.json({success:true,operation,asset:updated,storage:"local"});
  }catch(error){return NextResponse.json({error:error.message||"Studio local action failed."},{status:500});}  });
 }
 const token=process.env.STUDIO_GITHUB_TOKEN,targetBranch=process.env.STUDIO_PUBLISH_BRANCH||"main",storageBranch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets";
 if(!token)return NextResponse.json({error:"STUDIO_GITHUB_TOKEN is required."},{status:503});
 try{
   const registryDocument=await githubGetDocument(REGISTRY_PATH,token,storageBranch),registry=registryDocument?JSON.parse(registryDocument.content):{version:1,assets:[]};
   const productionRegistryDocument=targetBranch===storageBranch?registryDocument:await githubGetDocument(REGISTRY_PATH,token,targetBranch);
   if(!productionRegistryDocument)return NextResponse.json({error:"Production Studio registry is unavailable; deletion cannot be verified."},{status:502});
   const productionRegistry=JSON.parse(productionRegistryDocument.content);
   const deletionTombstone=findAssetDeletionTombstone(productionRegistry,id);
   if(operation==="delete"&&deletionTombstone)return NextResponse.json({success:true,operation:"deleted",deletedId:id,finalized:true,alreadyDeleted:true,status:"archived",releaseRequest:deletionTombstone.releaseRequest||null,message:productionDeletionMessages.finalized});
   const index=registry.assets.findIndex(asset=>asset.id===id);if(index<0)return NextResponse.json({error:operation==="publish"?"الأصل غير موجود في فرع studio/assets. استخدم مزامنة الأصول المختبرة من Studio ثم أعد المحاولة.":"Studio asset not found."},{status:404});
  let asset=registry.assets[index];
  if(operation==="delete"){
  if(asset.releaseRequest?.operation==="publish"&&asset.releaseRequest?.number&&asset.releaseRequest?.fingerprint===releaseAssetFingerprint(asset)){
   let publishPullRequest;
   try{publishPullRequest=await githubGetPullRequest(asset.releaseRequest.number,token);}catch(error){return NextResponse.json({error:error.message||"تعذر التحقق من دمج طلب النشر."},{status:502});}
   if(!publishPullRequest?.merged)return NextResponse.json({error:"لا يمكن طلب الإزالة قبل دمج طلب النشر."},{status:409});
   asset=resolveStudioReleaseAsset(asset,publishPullRequest);
   registry.assets[index]=asset;
  }else if(asset.status!=="published"){
    let publishRequest=asset.releaseRequest?.operation==="publish"&&asset.releaseRequest?.fingerprint===releaseAssetFingerprint(asset)?asset.releaseRequest:null;
    let publishPullRequest=null;
    if(publishRequest?.number)publishPullRequest=await githubGetPullRequest(publishRequest.number,token);
    else publishPullRequest=await githubFindLatestReleasePullRequest(token,targetBranch,"<!-- studio-release:publish:"+id+":"+releaseAssetFingerprint(asset)+" -->");
    if(!publishPullRequest?.merged)return NextResponse.json({error:"لا يمكن طلب إزالة أصل لم يدمج طلب نشره بعد."},{status:409});
    publishRequest={number:publishPullRequest.number,url:publishPullRequest.url,branch:publishPullRequest.branch,state:"merged",operation:"publish"};
    asset=resolveStudioReleaseAsset({...asset,releaseRequest:publishRequest},publishPullRequest);
    registry.assets[index]=asset;
   }
   const stageConfigText=await githubGet("web/game/data/stageEncounterConfig.json",token,targetBranch);
   let plan;
   const deletionRegistry={...productionRegistry,assets:(productionRegistry.assets||[]).map(item=>item.id===id?asset:item)};
   if(!deletionRegistry.assets.some(item=>item.id===id))deletionRegistry.assets.push(asset);
   try{plan=createProductionAssetDeletionPlan({registry:deletionRegistry,assetId:id,stageConfig:stageConfigText?JSON.parse(stageConfigText):{stages:{}}});}
   catch(error){return NextResponse.json({error:error.message||productionDeletionMessages.requestAccepted},{status:error.status||409});}
   const result=await requestProductionAssetDeletion({
    plan,
    baseBranch:targetBranch,
    beginRelease:async(assetId,baseBranch,releaseAsset)=>{const release=await beginProductionRelease(token,assetId,"delete",baseBranch,releaseAsset);if(release.completed&&!findAssetDeletionTombstone(productionRegistry,assetId))throw Error("A previous deletion PR was merged without its production tombstone. Automatic finalization was blocked; manual repair is required.");return release;},
    removeReleaseFiles:async(releaseBranch,deletionPlan)=>{
     await removeGithubAssetManifestReferences(deletionPlan.removablePaths,token,releaseBranch);
     for(const [catalogPath,key] of [[PUBLISHED_CATALOG_PATH,"plants"],[PUBLISHED_MONSTER_CATALOG_PATH,"monsters"]]){
      const document=await githubGetDocument(catalogPath,token,releaseBranch);
      if(!document)continue;
      const catalog=JSON.parse(document.content),items=Array.isArray(catalog[key])?catalog[key]:[];
      if(!items.some((item)=>item.id===id))continue;
      catalog[key]=items.filter((item)=>item.id!==id);
      await githubPut(catalogPath,Buffer.from(JSON.stringify(catalog,null,2)+"\n"),"studio: remove "+asset.type+" "+id,token,releaseBranch,document.sha);
     }
     for(const assetPath of deletionPlan.removablePaths){
      await githubDeleteIfExists("web/public"+assetPath,"studio: remove unused production asset file for "+id,token,releaseBranch);
     }
    },
    finishRelease:(release,deletionPlan,baseBranch)=>finishProductionRelease(token,release,{
     baseBranch,
     title:"Remove Studio asset "+id,
     body:"Remove the published Studio asset and its unshared dependencies after stage and asset reference checks.",
     asset:deletionPlan.asset,
     operation:"delete"
    })
   });
   return NextResponse.json({success:true,operation:result.operation,deletedId:id,finalized:result.finalized,alreadyDeleted:result.alreadyDeleted,status:result.finalized?"archived":"published",releaseRequest:result.releaseRequest,message:result.finalized?productionDeletionMessages.finalized:productionDeletionMessages.requestAccepted},{status:result.finalized?200:202});
  }
  if(operation!=="publish")return NextResponse.json({error:"عملية Studio غير معروفة."},{status:400});
  if(asset.type!=="plant"&&asset.type!=="monster")return NextResponse.json({error:"هذه العملية متاحة للنباتات والوحوش فقط."},{status:409});
  if(asset.status!=="testing")return NextResponse.json({error:"يجب تجهيز الأصل للاختبار والتحقق منه داخل اللعبة أولاً."},{status:409});
  if(!safeAssetPath(asset.path))return NextResponse.json({error:"Invalid asset path."},{status:400});
  if(asset.releaseRequest?.number&&asset.releaseRequest?.fingerprint===releaseAssetFingerprint(asset)){
   let previous;
   try{previous=await githubGetPullRequest(asset.releaseRequest.number,token);}catch(error){return NextResponse.json({error:error.message||"تعذر التحقق من طلب النشر الحالي."},{status:502});}
   const resolved=resolveStudioReleaseAsset(asset,previous);
   if(previous?.state==="open")return NextResponse.json({success:true,operation:"publish-requested",asset:resolved,releaseRequest:resolved.releaseRequest,published:false,idempotent:true});
   if(previous?.merged)return NextResponse.json({success:true,operation:"published",asset:resolved,releaseRequest:resolved.releaseRequest,published:true,idempotent:true});
  }
  const rigPartIds=[...new Set((asset.rigProfile?.bones||[]).map(bone=>bone?.part?.assetId).filter(Boolean))];
  const rigPartAssets=getRigPartAssets(registry.assets,asset);
  if(rigPartAssets.length!==rigPartIds.length||rigPartAssets.some(part=>!part||!["item","plant","monster","effect"].includes(part.type)||part.status==="archived"||!safeAssetPath(part.path)))return NextResponse.json({error:"يوجد جزء هيكلي مفقود أو غير صالح؛ أصلح تبعيات الهيكل قبل النشر."},{status:409});
  const rigPartById=new Map(rigPartAssets.filter(Boolean).map(part=>[part.id,part]));
  const invalidRigFrame=(asset.rigProfile?.bones||[]).some(bone=>{if(!bone?.part)return false;const part=rigPartById.get(bone.part.assetId);const count=getRigPartFrameCount(part);return !part||!Number.isInteger(count)||bone.part.frame>=count;});
  if(invalidRigFrame)return NextResponse.json({error:"يوجد إطار غير صالح في أحد أجزاء الهيكل؛ صحح رقم الإطار قبل النشر."},{status:409});
  const releasePaths=getAssetReleasePaths(registry.assets,asset);
  if(releasePaths.some((assetPath)=>!safeAssetPath(assetPath)))return NextResponse.json({error:"توجد تبعية أصل بمسار غير صالح؛ أصلح الروابط قبل النشر."},{status:409});
  if(asset.combat?.projectile?.path&&!safeAssetPath(asset.combat.projectile.path))return NextResponse.json({error:"The linked projectile asset is missing."},{status:409});
  for(const [stateId,state] of Object.entries(asset.stateAnimations||{}))if(!safeAssetPath(state?.path))return NextResponse.json({error:"إطارات الحالة "+stateId+" لها مسار غير صالح."},{status:409});
   if(findAssetDeletionTombstone(productionRegistry,id))return NextResponse.json({error:"هذا المعرّف مسجل كأصل محذوف في الإنتاج ولا يمكن إحياؤه تلقائياً."},{status:409});
  if(await githubFindReleasePullRequest(token,targetBranch,"<!-- studio-release:delete:"+id+":"))return NextResponse.json({error:"يوجد طلب إزالة مفتوح لهذا الأصل؛ أغلقه قبل طلب نشر جديد."},{status:409});

  // Branch from production only after all references have passed validation.
  const release=await beginProductionRelease(token,id,"publish",targetBranch,asset);
  if(release.completed){const published=productionRegistry.assets?.find(item=>item.id===id);if(!published||releaseAssetFingerprint(published)!==release.fingerprint)return NextResponse.json({error:"تم دمج طلب قديم لكن سجل الإنتاج لا يطابق النسخة المختبرة؛ أوقفنا اعتبارها منشورة تلقائياً."},{status:409});return NextResponse.json({success:true,operation:"published",asset:resolveStudioReleaseAsset(asset,release.completed),releaseRequest:release.completed,published:true,idempotent:true});}
  if(release.pr){
   const request=await finishProductionRelease(token,release,{baseBranch:targetBranch,title:"Publish Studio asset "+id,body:"Publish the tested Studio asset with all referenced files and catalog data.",asset,operation:"publish"});
   const pending=resolveStudioReleaseAsset(asset,{state:"open",merged:false});
   return NextResponse.json({success:true,operation:"publish-requested",asset:{...pending,releaseRequest:request},releaseRequest:request,targetBranch,status:"approved",idempotent:true,message:"طلب النشر مفتوح بالفعل؛ لم يُكتب إلى فرع الإنتاج."});
  }
  const releaseBranch=release.branch;
  for(const assetPath of releasePaths){
   const filePath="web/public"+assetPath;
   const bytes=await githubGetBytes(filePath,token,storageBranch);
   await githubPutImmutable(filePath,bytes,"studio: include "+assetPath+" for "+asset.type+" "+id,token,releaseBranch);
  }

  const isMonster=asset.type==="monster";
  const catalogPath=isMonster?PUBLISHED_MONSTER_CATALOG_PATH:PUBLISHED_CATALOG_PATH;
   const catalogDocument=await githubGetDocument(catalogPath,token,releaseBranch);
  const catalog=catalogDocument?JSON.parse(catalogDocument.content):(isMonster?{version:1,monsters:[]}:{version:1,plants:[]});
  const publishedAt=new Date().toISOString();
  const publishedRecord=isMonster
   ?{id:asset.id,name:asset.name,path:asset.path,rows:asset.rows,columns:asset.columns,spriteSheet:asset.spriteSheet,animationProfile:asset.animationProfile||null,rigProfile:asset.rigProfile||null,rigParts:rigPartAssets.map(part=>({id:part.id,name:part.name,path:part.path,rows:part.spriteSheet?(part.rows||1):1,columns:part.spriteSheet?(part.columns||1):1,frameCount:getRigPartFrameCount(part),spriteSheet:Boolean(part.spriteSheet)})),monsterProfile:asset.monsterProfile,flipX:Boolean(asset.flipX),effects:Array.isArray(asset.effects)?asset.effects:[],stateAnimations:asset.stateAnimations||{},publishedAt}
   :{id:asset.id,name:asset.name,path:asset.path,rows:asset.rows,columns:asset.columns,spriteSheet:asset.spriteSheet,animationProfile:asset.animationProfile||null,rigProfile:asset.rigProfile||null,rigParts:rigPartAssets.map(part=>({id:part.id,name:part.name,path:part.path,rows:part.spriteSheet?(part.rows||1):1,columns:part.spriteSheet?(part.columns||1):1,frameCount:getRigPartFrameCount(part),spriteSheet:Boolean(part.spriteSheet)})),combat:asset.combat,flipX:Boolean(asset.flipX),effects:Array.isArray(asset.effects)?asset.effects:[],stateAnimations:asset.stateAnimations||{},publishedAt};
  const collectionKey=isMonster?"monsters":"plants";
  const collection=Array.isArray(catalog[collectionKey])?catalog[collectionKey]:[];
  const existingIndex=collection.findIndex(item=>item.id===id);
  catalog[collectionKey]=existingIndex>=0?collection.map((item,i)=>i===existingIndex?publishedRecord:item):[...collection,publishedRecord];
  catalog.version=1;
   await githubPut(catalogPath,Buffer.from(JSON.stringify(catalog,null,2)+"\n"),"studio: request publication of "+asset.type+" "+id,token,releaseBranch,catalogDocument?.sha??null);
   const request=await finishProductionRelease(token,release,{baseBranch:targetBranch,title:"Publish Studio asset "+id,body:"Publish the tested Studio asset and include its artwork, skeletal parts, projectiles, state frames, and catalog entry.",asset:{...asset,publishedAt},operation:"publish"});
   const pending={...asset,status:"approved",releaseRequest:request};
   return NextResponse.json({success:true,operation:"publish-requested",asset:pending,releaseRequest:request,targetBranch,status:"approved",published:false,message:"أُنشئ طلب مراجعة إلى فرع الإنتاج؛ لن تصبح الحالة منشورة قبل دمج الطلب."});
 }catch(error){return NextResponse.json({error:error.message||"Studio action failed."},{status:error.code==="STUDIO_WRITE_CONFLICT"?409:502});}
}

// تعيين تأثيرات بصرية وصوتية لنبتة أو وحش (تجميلية فقط، لا تغيّر القتال).
async function setAssetEffects(id,requested){
 if(!canWriteStudioStorage())return NextResponse.json({error:"حفظ التأثيرات من خادم الإنتاج معطّل؛ احفظها في بيئة التطوير المحلية ثم اطلب نشر الأصل."},{status:403});
 const apply=(registry)=>{
  const index=registry.assets.findIndex(asset=>asset.id===id);
  if(index<0)return {error:"لم يتم العثور على الأصل في مكتبة Studio.",status:404};
  const asset=registry.assets[index];
  if(asset.status==="archived")return {error:"لا يمكن تعديل تأثيرات أصل مؤرشف. استعده أولاً.",status:409};
  const check=validateEffectSelection(asset.type,requested);
  if(!check.ok)return {error:check.error,status:400};
  const updated={...asset,effects:check.effects,updatedAt:new Date().toISOString()};
  registry.assets[index]=updated;
  const message=asset.status==="draft"?"تم حفظ التأثيرات، وستظهر عند اختبار الأصل داخل اللعبة."
   :asset.status==="testing"?"تم حفظ التأثيرات، وتظهر الآن في مختبر الاختبار."
   :"تم حفظ التأثيرات. لتصل للاعبين أعد تجهيز الأصل للاختبار ثم انشره.";
  return {asset:updated,message};
 };
 try{
  const registry=await localRegistry();
  const result=apply(registry);
  if(result.error)return NextResponse.json({error:result.error},{status:result.status});
  await saveLocalRegistry(registry);
  return NextResponse.json({success:true,operation:"set-effects",asset:result.asset,message:result.message});
 }catch(error){return NextResponse.json({error:error.message||"تعذر حفظ التأثيرات."},{status:500});}
}
