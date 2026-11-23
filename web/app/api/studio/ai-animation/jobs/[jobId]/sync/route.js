import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyStudioSession } from "../../../../../../../../game/studio/signedSession.mjs";
import { safeAiJobId } from "../../../../../../../../game/studio/aiAnimationPipeline.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "fvm_studio_session";
const ROOT = path.join(process.cwd(), ".autorig-workspace", "ai-animation", "jobs");
const MAX_VIDEO = 100 * 1024 * 1024;
function isVideo(bytes) { return (bytes.length > 12 && bytes.toString("ascii",4,8)==="ftyp") || (bytes.length > 4 && bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))); }
export async function POST(req, context) {
  if (!verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN || "", req.cookies.get(COOKIE)?.value || "")) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { jobId } = await context.params;
  if (!safeAiJobId(jobId)) return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  const baseRaw = process.env.FVM_WAN_WORKER_URL || "";
  const token = process.env.FVM_WAN_WORKER_TOKEN || "";
  if (!baseRaw || !token) return NextResponse.json({ error: "Wan Worker غير مهيأ." }, { status: 503 });
  const base = new URL(baseRaw);
  const dir = path.join(ROOT, jobId);
  let job; try { job = JSON.parse(await readFile(path.join(dir, "job.json"), "utf8")); } catch { return NextResponse.json({ error: "المهمة غير موجودة." }, { status: 404 }); }
  if (!job.provider?.providerJobId) return NextResponse.json({ error: "لم يتم إرسال هذه المهمة إلى Wan." }, { status: 409 });
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const statusResponse = await fetch(new URL("/v1/jobs/" + encodeURIComponent(job.provider.providerJobId), base), { headers: { Authorization: "Bearer " + token }, signal: controller.signal, cache: "no-store" });
    const data = await statusResponse.json().catch(() => ({}));
    if (!statusResponse.ok) return NextResponse.json({ error: data.error || "تعذر قراءة حالة Worker." }, { status: 502 });
    job.provider.status = data.status || "running";
    if (Array.isArray(data.videos)) {
      for (const item of data.videos) {
        const motion = job.motions?.[item.motionId];
        if (!motion || !job.selectedMotionIds.includes(item.motionId) || typeof item.downloadPath !== "string" || !item.downloadPath.startsWith("/v1/jobs/")) continue;
        const videoUrl = new URL(item.downloadPath, base);
        if (videoUrl.origin !== base.origin) continue;
        const videoResponse = await fetch(videoUrl, { headers: { Authorization: "Bearer " + token }, signal: controller.signal });
        if (!videoResponse.ok) continue;
        const declared = Number(videoResponse.headers.get("content-length") || 0);
        if (declared > MAX_VIDEO) continue;
        const bytes = Buffer.from(await videoResponse.arrayBuffer());
        if (bytes.length > MAX_VIDEO || !isVideo(bytes)) continue;
        const ext = bytes.toString("ascii",4,8)==="ftyp" ? ".mp4" : ".webm";
        await mkdir(path.join(dir,"videos"),{recursive:true});
        await writeFile(path.join(dir,"videos",item.motionId+ext),bytes);
        motion.videoPath = "videos/" + item.motionId + ext;
        motion.status = "video_review";
      }
    }
    const states = Object.values(job.motions);
    if (states.some((motion) => motion.status === "video_review")) job.status = "awaiting_video_approval";
    else if (data.status === "failed") job.status = "failed";
    else if (data.status === "completed") job.status = "completed";
    else job.status = "generating";
    job.updatedAt = new Date().toISOString();
    await writeFile(path.join(dir,"job.json"),JSON.stringify(job,null,2)+"\n","utf8");
    return NextResponse.json({ job });
  } catch (error) { return NextResponse.json({ error: error.name === "AbortError" ? "انتهت مهلة مزامنة Wan." : "تعذرت مزامنة نتائج Wan." }, { status: 503 }); }
  finally { clearTimeout(timer); }
}
