const MAX_ATLAS_FRAMES = 512;
const SAFE_FRAME_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,95}$/;

export function validatePhaserAtlasDocument(input) {
  let atlas;
  try { atlas = typeof input === "string" ? JSON.parse(input) : input; }
  catch { return { valid: false, errors: ["ملف JSON غير صالح."] }; }
  const errors = [];
  if (!atlas || typeof atlas !== "object" || Array.isArray(atlas)) errors.push("يجب أن يكون JSON كائن Phaser Atlas.");
  const frames = atlas?.frames;
  const entries = Array.isArray(frames)
    ? frames.map((frame, index) => [String(frame?.filename ?? frame?.name ?? index), frame])
    : frames && typeof frames === "object" ? Object.entries(frames) : [];
  if (!entries.length) errors.push("لم يتم العثور على أي إطارات في frames.");
  if (entries.length > MAX_ATLAS_FRAMES) errors.push("عدد الإطارات يتجاوز الحد المسموح (512).");
  const names = new Set();
  for (const [name, frame] of entries) {
    if (!SAFE_FRAME_NAME.test(name) || names.has(name)) errors.push("اسم إطار غير صالح أو مكرر: " + name);
    names.add(name);
    const rect = frame?.frame ?? frame;
    const x = Number(rect?.x), y = Number(rect?.y), w = Number(rect?.w ?? rect?.width), h = Number(rect?.h ?? rect?.height);
    if (![x, y, w, h].every(Number.isFinite) || x < 0 || y < 0 || w <= 0 || h <= 0) {
      errors.push("مستطيل الإطار غير صالح: " + name);
    }
    const source = frame?.sourceSize;
    if (source && (![Number(source.w), Number(source.h)].every(Number.isFinite) || Number(source.w) <= 0 || Number(source.h) <= 0)) {
      errors.push("أبعاد sourceSize غير صالحة للإطار: " + name);
    }
  }
  const meta = atlas?.meta;
  if (!meta || typeof meta !== "object") errors.push("بيانات meta مفقودة من Phaser Atlas.");
  const image = typeof meta?.image === "string" ? meta.image.trim() : "";
  if (image && (image.includes("..") || image.includes("/") || image.includes("\\\\"))) errors.push("اسم الصورة داخل meta يجب أن يكون اسماً فقط دون مسارات.");
  const clips = {};
  for (const name of names) {
    const match = name.match(/^(.+?)[_-](\\d+)$/);
    if (!match) continue;
    const clip = match[1].toLowerCase();
    (clips[clip] ||= []).push(name);
  }
  for (const clip of Object.keys(clips)) clips[clip].sort((a,b) => {
    const na = Number(a.match(/(\\d+)$/)?.[1] || 0), nb = Number(b.match(/(\\d+)$/)?.[1] || 0);
    return na - nb;
  });
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    frameCount: entries.length,
    frameNames: entries.map(([name]) => name),
    clips,
    image: image || null,
    format: Array.isArray(frames) ? "array" : "hash"
  };
}
