import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const envPath=path.join(root,".env.local");
try{
  const raw=await readFile(envPath,"utf8");
  for(const line of raw.split(/\r?\n/)){
    const trimmed=line.trim();
    if(!trimmed||trimmed.startsWith("#"))continue;
    const separator=trimmed.indexOf("=");
    if(separator<1)continue;
    const key=trimmed.slice(0,separator).trim();
    let value=trimmed.slice(separator+1).trim();
    if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
    if(!process.env[key])process.env[key]=value;
  }
}catch(error){if(error.code!=="ENOENT")throw error;}

const token=process.env.STUDIO_GITHUB_TOKEN;
const repository=process.env.STUDIO_GITHUB_REPOSITORY||"waelkamira/FarmVsMonsters";
const branch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets";
if(!token)throw new Error("STUDIO_GITHUB_TOKEN is missing. Add it to web/.env.local first.");

const headers={Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
const api=(filePath)=>"https://api.github.com/repos/"+repository+"/contents/"+filePath;
async function getRegistry(){
  const response=await fetch(api("web/game/data/studioAssetRegistry.json")+"?ref="+encodeURIComponent(branch),{headers});
  if(!response.ok)throw new Error("Could not read Studio registry ("+response.status+").");
  const data=await response.json();
  return JSON.parse(Buffer.from(data.content||"","base64").toString("utf8"));
}
async function downloadAsset(assetPath){
  if(typeof assetPath!=="string"||!assetPath.startsWith("/assets/")||assetPath.includes(".."))throw new Error("Unsafe Studio asset path.");
  const response=await fetch(api("web/public"+assetPath)+"?ref="+encodeURIComponent(branch),{headers:{...headers,Accept:"application/vnd.github.raw"}});
  if(!response.ok)throw new Error("Could not download "+assetPath+" ("+response.status+").");
  const bytes=Buffer.from(await response.arrayBuffer());
  const target=path.join(root,"public",assetPath.replace(/^\//,""));
  await mkdir(path.dirname(target),{recursive:true});
  await writeFile(target,bytes);
  return bytes.length;
}

const registry=await getRegistry();
const plants=(registry.assets||[]).filter(asset=>asset.type==="plant"&&asset.status==="testing");
const output=[];
let downloadedFiles=0,totalBytes=0;
for(const plant of plants){
  const plantBytes=await downloadAsset(plant.path);
  downloadedFiles+=1;totalBytes+=plantBytes;
  let projectile=null;
  if(plant.combat?.mode==="projectile"){
    projectile=plant.combat.projectile;
    if(!projectile?.path)throw new Error("Plant "+plant.id+" declares projectile mode but has no projectile file.");
    const projectileBytes=await downloadAsset(projectile.path);
    downloadedFiles+=1;totalBytes+=projectileBytes;
  }
  output.push({...plant,projectile});
}
const manifestPath=path.join(root,"public/assets/.studio-test/plant-catalog.json");
await mkdir(path.dirname(manifestPath),{recursive:true});
await writeFile(manifestPath,JSON.stringify({version:1,generatedAt:new Date().toISOString(),plants:output},null,2)+"\n","utf8");
console.log(JSON.stringify({branch,plants:output.map(plant=>plant.id),downloadedFiles,totalMiB:Number((totalBytes/1024/1024).toFixed(2)),manifest:"public/assets/.studio-test/plant-catalog.json"},null,2));
