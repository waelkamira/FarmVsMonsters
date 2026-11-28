export async function createFirstFrameThumbnail(file, rows = 1, columns = 1, maxEdge = 512) {
  if (!file || typeof file.type !== "string" || !file.type.startsWith("image/")) {
    throw new TypeError("اختر صورة صالحة لإنشاء الصورة المصغّرة.");
  }
  const safeRows = Math.max(1, Math.floor(Number(rows) || 1));
  const safeColumns = Math.max(1, Math.floor(Number(columns) || 1));
  const bitmap = await createImageBitmap(file);
  try {
    const frameWidth = Math.floor(bitmap.width / safeColumns);
    const frameHeight = Math.floor(bitmap.height / safeRows);
    if (!frameWidth || !frameHeight) throw new Error("تعذر تحديد أبعاد الإطار الأول من Sprite Sheet.");
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
