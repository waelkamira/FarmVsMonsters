import {access,mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {safeAssetPath} from "../game/studio/assetReadiness.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const registryPath=path.join(root,"game/data/studioAssetRegistry.json");
const registry=JSON.parse(await readFile(registryPath,"utf8"));
const plants=(registry.assets||[]).filter(asset=>asset.type==="plant"&&asset.status==="testing");
const output=[];
let checkedFiles=0;
for(const plant of plants){
  const paths=[plant.path];
  let projectile=null;
  if(plant.combat?.mode==="projectile"){
    projectile=plant.combat.projectile;
    if(!projectile?.path)throw new Error("Plant "+plant.id+" declares projectile mode but has no projectile file.");
    paths.push(projectile.path);
  }
  for(const assetPath of paths){
    if(!safeAssetPath(assetPath))throw new Error("Unsafe Studio asset path for "+plant.id+".");
    await access(path.join(root,"public",decodeURIComponent(assetPath.slice(1))));
    checkedFiles+=1;
  }
  output.push({...plant,projectile});
}
const manifestPath=path.join(root,"public/assets/studio-test/plant-catalog.json");
await mkdir(path.dirname(manifestPath),{recursive:true});
await writeFile(manifestPath,JSON.stringify({version:1,generatedAt:new Date().toISOString(),plants:output},null,2)+"\n","utf8");
console.log(JSON.stringify({storage:"local",plants:output.map(plant=>plant.id),checkedFiles,manifest:"public/assets/studio-test/plant-catalog.json"},null,2));
