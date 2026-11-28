export function getFirstFrameBounds(width, height, rows = 1, columns = 1) {
  const safeWidth = Math.floor(Number(width));
  const safeHeight = Math.floor(Number(height));
  const safeRows = Math.max(1, Math.floor(Number(rows) || 1));
  const safeColumns = Math.max(1, Math.floor(Number(columns) || 1));
  if (!safeWidth || !safeHeight || safeRows > safeHeight || safeColumns > safeWidth) {
    throw new RangeError("Invalid sprite sheet dimensions for first-frame extraction.");
  }
  return { x: 0, y: 0, width: Math.floor(safeWidth / safeColumns), height: Math.floor(safeHeight / safeRows) };
}

export async function createFirstFrameThumbnail(file, rows = 1, columns = 1, maxEdge = 512) {
  if (!file || typeof file.type !== "string" || !file.type.startsWith("image/")) {
    throw new TypeError("اختر صورة صالحة لإنشاء الصورة المصغّرة.");
  }
  const safeRows = Math.max(1, Math.floor(Number(rows) || 1));
  const safeColumns = Math.max(1, Math.floor(Number(columns) || 1));
  const bitmap = await createImageBitmap(file);
  try {
    const { width: frameWidth, height: frameHeight } = getFirstFrameBounds(bitmap.width, bitmap.height, safeRows, safeColumns);
    const scale = Math.min(1, maxEdge / Math.max(frameWidth, frameHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(frameWidth * scale));
    canvas.height = Math.max(1, Math.round(frameHeight * scale));
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("المتصفح لا يدعم إنشاء الصورة المصغّرة.");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, frameWidth, frameHeight, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error("تعذر حفظ الصورة المصغّرة بصيغة PNG.")),
      "image/png"
    ));
    return new File([blob], "first-frame-thumbnail.png", { type: "image/png", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
