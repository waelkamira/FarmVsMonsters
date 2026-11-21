export const STUDIO_ASSET_TYPES=Object.freeze({
 plant:{folder:"plants",accepts:["image/png","image/webp"],spriteSheet:true},
 monster:{folder:"monsters",accepts:["image/png","image/webp"],spriteSheet:true},
 plantProjectile:{folder:"projectiles/plants",accepts:["image/png","image/webp","image/gif"],spriteSheet:false},
 monsterProjectile:{folder:"projectiles/monsters",accepts:["image/png","image/webp","image/gif"],spriteSheet:false},
 effect:{folder:"effects",accepts:["image/png","image/webp","image/gif"],spriteSheet:false},
 item:{folder:"items",accepts:["image/png","image/webp"],spriteSheet:false},
 audio:{folder:"audio",accepts:["audio/mpeg","audio/wav","audio/ogg","audio/mp4"],spriteSheet:false}
});
export const STUDIO_MAX_UPLOAD_BYTES=8*1024*1024;
export const STUDIO_ID_PATTERN=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const STUDIO_RESERVED_PLANT_IDS=Object.freeze([
 "radish","mushroom","energy-mushroom","pumpkin","pumpkin-guard",
 "pineapple","hazelnut","mango","snow-thrower","pea-shooter","thorn-wall",
 "sunflower","ice-bloom","double-radish","explosive-berry","fire-pepper"
]);
export function validateStudioAsset({id,type,file,rows=3,columns=3}){
 const errors=[],config=STUDIO_ASSET_TYPES[type];
 if(!config)errors.push("Unsupported asset category.");
 if(!STUDIO_ID_PATTERN.test(String(id||"")))errors.push("ID must use lowercase letters, numbers, and hyphens.");
 if(!file||typeof file.size!=="number")errors.push("Choose a file.");
 if(file&&file.size>STUDIO_MAX_UPLOAD_BYTES)errors.push("File exceeds 8 MB.");
 if(file&&config&&!config.accepts.includes(file.type))errors.push("Unsupported file type.");
 if(config?.spriteSheet&&(!Number.isInteger(Number(rows))||!Number.isInteger(Number(columns))||Number(rows)<1||Number(columns)<1||Number(rows)*Number(columns)>100))errors.push("Invalid sprite grid.");
 return {valid:errors.length===0,errors,config};
}