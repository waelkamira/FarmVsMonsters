export const STUDIO_ASSET_TYPES=Object.freeze({
 plant:{folder:"plants",accepts:["image/png","image/webp"],spriteSheet:true},
 monster:{folder:"monsters",accepts:["image/png","image/webp"],spriteSheet:true},
 plantProjectile:{folder:"projectiles/plants",accepts:["image/png","image/webp","image/gif"],spriteSheet:true},
 monsterProjectile:{folder:"projectiles/monsters",accepts:["image/png","image/webp","image/gif"],spriteSheet:true},
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
export function validateStudioAssetBytes(type, bytes) {
 if (!(bytes instanceof Uint8Array) || bytes.length < 4) return { valid: false, reason: "الملف فارغ أو أقصر من ترويسة صيغة معروفة." };
 const starts = (...values) => values.every((value, index) => bytes[index] === value);
 const ascii = (offset, value) => String.fromCharCode(...bytes.subarray(offset, offset + value.length)) === value;
 const signatures = {
  "image/png": () => bytes.length >= 8 && starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
  "image/webp": () => bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WEBP"),
  "image/gif": () => bytes.length >= 6 && (ascii(0, "GIF87a") || ascii(0, "GIF89a")),
  "audio/mpeg": () => ascii(0, "ID3") || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0),
  "audio/wav": () => bytes.length >= 12 && ascii(0, "RIFF") && ascii(8, "WAVE"),
  "audio/ogg": () => ascii(0, "OggS"),
  "audio/mp4": () => bytes.length >= 12 && ascii(4, "ftyp")
 };
 const check = signatures[type];
 if (!check) return { valid: false, reason: "نوع الملف غير مدعوم للتحقق من ترويسة المحتوى." };
 return check() ? { valid: true, reason: null } : { valid: false, reason: "محتوى الملف لا يطابق نوعه المعلن (" + type + ")." };
}
