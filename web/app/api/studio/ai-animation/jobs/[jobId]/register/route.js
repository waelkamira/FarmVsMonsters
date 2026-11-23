import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyStudioSession } from "../../../../../../../../game/studio/signedSession.mjs";
import { safeAiJobId } from "../../../../../../../../game/studio/aiAnimationPipeline.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "fvm_studio_session";
const ROOT = path.join(process.cwd(), ".autorig-workspace", "ai-animation", "jobs");
function slug(value, fallback) {
  const result = String(value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44);
  return result || fallback;
}
function grid(motion) {
  const columns = Math.min(Number(motion.columns) || 6, motion.frames);
  return { columns, rows: Math.ceil(motion.frames / columns), frameCount: motion.frames };
}
export async function POST(req, context) {
  if (!verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN || "", req.cookies.get(COOKIE)?.value || "")) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { jobId } = await context.params;
  if (!safeAiJobId(jobId)) return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  const dir = path.join(ROOT, jobId);
  let job;
  try { job = JSON.parse(await readFile(path.join(dir, "job.json"), "utf8")); }
  catch { return NextResponse.json({ error: "المهمة غير موجودة." }, { status: 404 }); }
  if (job.registry?.assetId) return NextResponse.json({ error: "تم تسجيل هذه الشخصية مسبقاً في مكتبة Studio.", assetId: job.registry.assetId }, { status: 409 });
  const motions = job.selectedMotionIds.map((id) => ({ id, ...job.motions[id] }));
  if (!motions.length || !motions.some((motion) => motion.id === "idle") ||
      motions.some((motion) => motion.status !== "approved" || motion.spriteStatus !== "approved" || !motion.outputPath)) {
    return NextResponse.json({ error: "لإضافة شخصية قابلة للاختبار، اختر Idle واعتمد فيديو وإطارات جميع الحركات المختارة أولاً." }, { status: 409 });
  }
  const idle = motions.find((motion) => motion.id === "idle");
  const id = slug(job.name, "ai-character") + "-ai-" + jobId.slice(0, 6);
  const idleGrid = grid(idle);
  const motionAtlases = {};
  const form = new FormData();
  form.set("id", id);
  form.set("type", job.assetType === "monster" ? "monster" : "plant");
  form.set("name", String(job.name || id).slice(0, 80));
  form.set("file", new Blob([await readFile(path.join(dir, idle.outputPath))], { type: "image/png" }), id + ".png");
  form.set("rows", String(idleGrid.rows));
  form.set("columns", String(idleGrid.columns));
  form.set("frameCount", String(idleGrid.frameCount));
  const attack = motions.find((motion) => motion.id === "attack");
  form.set("animationProfile", JSON.stringify({
    idle: { startFrame: 0, endFrame: idle.frames - 1, fps: idle.fps, loop: true },
    move: { startFrame: 0, endFrame: idle.frames - 1, fps: idle.fps, loop: true },
    attack: { startFrame: 0, endFrame: idle.frames - 1, fps: attack?.fps || 12, loop: false }
  }));
  for (const motion of motions) {
    const layout = grid(motion);
    motionAtlases[motion.id] = {
      rows: layout.rows, columns: layout.columns, frameCount: layout.frameCount,
      fps: motion.fps, loop: motion.loop, frameWidth: motion.frameWidth, frameHeight: motion.frameHeight
    };
    if (motion.id !== "idle") {
      const bytes = await readFile(path.join(dir, motion.outputPath));
      form.set("motionFile_" + motion.id, new Blob([bytes], { type: "image/png" }), id + "-" + motion.id + ".png");
    }
  }
  form.set("motionAtlases", JSON.stringify(motionAtlases));
  if (job.assetType === "monster") {
    form.set("monsterProfile", JSON.stringify({ baseArchetype: "cave-brute", hpMultiplier: 1, speedMultiplier: 1, damageMultiplier: 1, attackIntervalMultiplier: 1, widthScale: 1, heightScale: 1, spawnWeight: 20, firstWave: 1 }));
  } else {
    form.set("behavior", attack ? "melee" : "blocker");
    form.set("energyCost", "60");
    form.set("hp", "150");
    form.set("cooldownMs", "1800");
    form.set("damage", "30");
    form.set("range", "180");
    form.set("sizePercent", "100");
  }
  const cookie = req.headers.get("cookie") || "";
  const endpoint = new URL("/api/studio/assets", req.url);
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { cookie }, body: form, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: data.error || "تعذر إضافة الأصل إلى مكتبة Studio." }, { status: response.status });
    job.registry = { assetId: data.asset.id, type: data.asset.type, name: data.asset.name, status: data.asset.status, storage: data.storage, registeredAt: new Date().toISOString() };
    job.status = "registered_in_studio";
    job.updatedAt = new Date().toISOString();
    await writeFile(path.join(dir, "job.json"), JSON.stringify(job, null, 2) + "\n", "utf8");
    return NextResponse.json({ success: true, job, asset: data.asset, storage: data.storage, studioUrl: "/studio/assets/" + data.asset.id });
  } catch (error) {
    return NextResponse.json({ error: error.message || "تعذر الاتصال بمكتبة Studio." }, { status: 502 });
  }
}
