import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyStudioSession } from "../../../../../../../../game/studio/signedSession.mjs";
import { safeAiJobId } from "../../../../../../../../game/studio/aiAnimationPipeline.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "fvm_studio_session";
const ROOT = path.join(process.cwd(), ".autorig-workspace", "ai-animation", "jobs");
export async function POST(req, context) {
  if (!verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN || "", req.cookies.get(COOKIE)?.value || "")) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { jobId, motionId } = await context.params;
  if (!safeAiJobId(jobId)) return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  const baseRaw = process.env.FVM_WAN_WORKER_URL || "";
  const token = process.env.FVM_WAN_WORKER_TOKEN || "";
  if (!baseRaw || !token) return NextResponse.json({ error: "محرك Wan غير موصول. اضبط FVM_WAN_WORKER_URL وFVM_WAN_WORKER_TOKEN." }, { status: 503 });
  let base;
  try { base = new URL(baseRaw); } catch { return NextResponse.json({ error: "FVM_WAN_WORKER_URL غير صالح." }, { status: 503 }); }
  if (!["https:", "http:"].includes(base.protocol) || base.username || base.password) return NextResponse.json({ error: "عنوان Worker غير صالح." }, { status: 503 });
  const dir = path.join(ROOT, jobId);
  let job;
  try { job = JSON.parse(await readFile(path.join(dir, "job.json"), "utf8")); } catch { return NextResponse.json({ error: "المهمة غير موجودة." }, { status: 404 }); }
  const motion = job.motions?.[motionId];
  if (!motion || !job.selectedMotionIds.includes(motionId)) return NextResponse.json({ error: "الحركة غير موجودة في هذه المهمة." }, { status: 404 });
  if (!["rejected", "failed"].includes(motion.status)) return NextResponse.json({ error: "يمكن إعادة توليد الحركة بعد رفض الفيديو أو فشل التوليد فقط." }, { status: 409 });
  if (job.provider?.providerJobId && ["queued", "running", "generating"].includes(job.provider.status)) return NextResponse.json({ error: "لا تزال هناك مهمة توليد نشطة. زامنها أو انتظر انتهائها أولاً." }, { status: 409 });
  const image = await readFile(path.join(dir, job.source.path));
  const providerJobId = null;
  const payload = {
    protocolVersion: 1, jobId,
    sourceImage: { mimeType: job.source.mimeType, base64: image.toString("base64"), background: "#0000FF" },
    motions: [{ id: motionId, ...motion }]
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(new URL("/v1/generate", base), {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(payload), signal: controller.signal, cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.providerJobId !== "string" || !data.providerJobId) return NextResponse.json({ error: data.error || "Wan Worker لم يقبل إعادة التوليد (" + response.status + ")." }, { status: 502 });
    motion.previousVideos = [...(motion.previousVideos || []), ...(motion.videoPath ? [motion.videoPath] : [])];
    motion.previousOutputs = [...(motion.previousOutputs || []), ...(motion.outputPath ? [{ videoPath: motion.videoPath, outputPath: motion.outputPath, atlasJsonPath: motion.atlasJsonPath, validationPath: motion.validationPath }] : [])];
    motion.revision = Math.max(1, Number(motion.revision) || 1) + 1;
    motion.status = "generating";
    motion.videoPath = null;
    motion.outputPath = null;
    motion.atlasJsonPath = null;
    motion.validationPath = null;
    motion.spriteStatus = "not_started";
    motion.error = null;
    job.provider = { id: "wan2.1", status: data.status || "queued", providerJobId: data.providerJobId, retryMotionId: motionId };
    job.status = "generating";
    job.updatedAt = new Date().toISOString();
    await writeFile(path.join(dir, "job.json"), JSON.stringify(job, null, 2) + "\n", "utf8");
    return NextResponse.json({ success: true, job });
  } catch (error) {
    return NextResponse.json({ error: error.name === "AbortError" ? "انتهت مهلة الاتصال بمحرك Wan." : "تعذر الاتصال بمحرك Wan." }, { status: 503 });
  } finally { clearTimeout(timer); }
}
