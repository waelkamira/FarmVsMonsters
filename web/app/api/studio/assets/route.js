import {NextResponse} from "next/server";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {STUDIO_ASSET_TYPES,STUDIO_ID_PATTERN,STUDIO_MAX_UPLOAD_BYTES} from "../../../../game/studio/assetTypes.mjs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function authorized(req){const expected=process.env.STUDIO_ADMIN_TOKEN;const supplied=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");return Boolean(expected&&supplied&&supplied===expected);}
function ext(type){return {"image/png":".png","image/webp":".webp","image/gif":".gif","audio/mpeg":".mp3","audio/wav":".wav","audio/ogg":".ogg","audio/mp4":".m4a"}[type]||"";}
function githubHeaders(token){return {Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};}
function githubUrl(filePath){return "https://api.github.com/repos/"+(process.env.STUDIO_GITHUB_REPOSITORY||"waelkamira/FarmVsMonsters")+"/contents/"+filePath;}
async function githubGet(filePath,token,branch){
 const response=await fetch(githubUrl(filePath)+"?ref="+encodeURIComponent(branch),{headers:githubHeaders(token)});
 if(response.status===404)return null;
 if(!response.ok)throw Error("GitHub read failed ("+response.status+").");
 const data=await response.json();return Buffer.from(data.content||"","base64").toString("utf8");
}
async function githubPut(filePath,bytes,message,token,branch){
 const api=githubUrl(filePath),headers=githubHeaders(token);
 const check=await fetch(api+"?ref="+encodeURIComponent(branch),{headers});let sha;
 if(check.ok)sha=(await check.json()).sha;else if(check.status!==404)throw Error("GitHub lookup failed ("+check.status+").");
 const saved=await fetch(api,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({message,branch,content:Buffer.from(bytes).toString("base64"),...(sha?{sha}:{})})});
 if(!saved.ok){const data=await saved.json().catch(()=>({}));throw Error(data.message||"GitHub save failed ("+saved.status+").");}
}
async function localRegistry(){try{return JSON.parse(await readFile(path.join(process.cwd(),"game/data/studioAssetRegistry.json"),"utf8"));}catch{return {version:1,assets:[]};}}\nfunction addPreviewUrls(registry,branch){const repository=process.env.STUDIO_GITHUB_REPOSITORY||"waelkamira/FarmVsMonsters";return {...registry,assets:(registry.assets||[]).map(asset=>({...asset,previewUrl:"https://raw.githubusercontent.com/"+repository+"/"+encodeURIComponent(branch)+"/web/public"+asset.path.replace(/^\\/assets/,"/assets")}))};}
export async function GET(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized. Configure STUDIO_ADMIN_TOKEN."},{status:401});
 if(process.env.STUDIO_STORAGE_DRIVER==="github"){
  const token=process.env.STUDIO_GITHUB_TOKEN,branch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets";
  if(!token)return NextResponse.json({error:"STUDIO_GITHUB_TOKEN is required."},{status:503});
  try{const raw=await githubGet("web/game/data/studioAssetRegistry.json",token,branch);return NextResponse.json(addPreviewUrls(raw?JSON.parse(raw):{version:1,assets:[]},branch));}
  catch(error){return NextResponse.json({error:error.message},{status:502});}
 }
 return NextResponse.json(await localRegistry());
}
export async function POST(req){
 if(!authorized(req))return NextResponse.json({error:"Unauthorized."},{status:401});
 let form;try{form=await req.formData();}catch{return NextResponse.json({error:"Invalid multipart upload."},{status:400});}
 const id=String(form.get("id")||"").trim().toLowerCase(),type=String(form.get("type")||""),config=STUDIO_ASSET_TYPES[type],file=form.get("file"),rows=Number(form.get("rows")||1),columns=Number(form.get("columns")||1);
 if(!config||!STUDIO_ID_PATTERN.test(id))return NextResponse.json({error:"Invalid category or ID."},{status:400});
 if(!file||typeof file.arrayBuffer!=="function"||file.size<1||file.size>STUDIO_MAX_UPLOAD_BYTES)return NextResponse.json({error:"Choose a file up to 8 MB."},{status:413});
 if(!config.accepts.includes(file.type))return NextResponse.json({error:"Unsupported media type."},{status:415});
 if(config.spriteSheet&&(!Number.isInteger(rows)||!Number.isInteger(columns)||rows<1||columns<1||rows*columns>100))return NextResponse.json({error:"Invalid sprite grid."},{status:400});
 const driver=process.env.STUDIO_STORAGE_DRIVER||"local";
 let old;
 try{
  if(driver==="github"){
   const token=process.env.STUDIO_GITHUB_TOKEN,branch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets";
   if(!token)return NextResponse.json({error:"STUDIO_GITHUB_TOKEN is required."},{status:503});
   const raw=await githubGet("web/game/data/studioAssetRegistry.json",token,branch);old=raw?JSON.parse(raw):{version:1,assets:[]};
  }else old=await localRegistry();
 }catch(error){return NextResponse.json({error:error.message},{status:502});}
 if(old.assets.some(a=>a.id===id))return NextResponse.json({error:"Asset ID already exists."},{status:409});
 const extension=ext(file.type);if(!extension)return NextResponse.json({error:"Unknown file extension."},{status:415});
 const relative=config.folder+"/"+id+extension,record={id,type,name:String(form.get("name")||id).trim().slice(0,80),filename:id+extension,path:"/assets/"+relative,rows,columns,spriteSheet:config.spriteSheet,status:"draft",createdAt:new Date().toISOString()};
 const next={version:1,assets:[...old.assets,record]},bytes=Buffer.from(await file.arrayBuffer());
 try{
  if(driver==="github"){
   const token=process.env.STUDIO_GITHUB_TOKEN,branch=process.env.STUDIO_GITHUB_BRANCH||"studio/assets";
   await githubPut("web/public/assets/"+relative,bytes,"studio: add "+type+" "+id,token,branch);
   await githubPut("web/game/data/studioAssetRegistry.json",Buffer.from(JSON.stringify(next,null,2)+"\n"),"studio: register "+id,token,branch);
  }else if(driver==="local"&&process.env.NODE_ENV!=="production"){
   const target=path.join(process.cwd(),"public/assets",relative);await mkdir(path.dirname(target),{recursive:true});
   await writeFile(target,bytes,{flag:"wx"});await writeFile(path.join(process.cwd(),"game/data/studioAssetRegistry.json"),JSON.stringify(next,null,2)+"\n","utf8");
  }else return NextResponse.json({error:"Production uploads require STUDIO_STORAGE_DRIVER=github and a configured GitHub token. Local disk is disabled in production."},{status:503});
 }catch(error){return NextResponse.json({error:error.message||"Save failed."},{status:500});}
 return NextResponse.json({success:true,asset:record,storage:driver});
}