import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyStudioSession } from "../../../../../../../../game/studio/signedSession.mjs";
import { safeAiJobId } from "../../../../../../../../game/studio/aiAnimationPipeline.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "fvm_studio_session";
const ROOT = path.join(process.cwd(), ".autorig-workspace", "ai-animation", "jobs");
function authorized(req) { return verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN || "", req.cookies.get(COOKIE)?.value || ""); }
export async function POST(req, context) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { jobId, motionId } = await context.params;
  if (!safeAiJobId(jobId) || !/^(idle|walk|run|fly|attack|hurt|death)$/.test(motionId)) return NextResponse.json({ error: "Invalid job or motion ID." }, { status: 400 });
  let job;
  try { job = JSON.parse(await readFile(path.join(ROOT, jobId, "job.json"), "utf8")); } catch { return NextResponse.json({ error: "المهمة غير موجودة." }, { status: 404 }); }
  const motion = job.motions?.[motionId];
  if (!motion) return NextResponse.json({ error: "الحركة غير محددة في هذه المهمة." }, { status: 404 });
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > 100 * 1024 * 1024) return NextResponse.json({ error: "حجم الفيديو يتجاوز 100 MB." }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("video");
  if (!file || typeof file.arrayBuffer !== "function" || file.size < 16 || file.size > 100 * 1024 * 1024) return NextResponse.json({ error: "اختر فيديو MP4 أو WebM حتى 100 MB." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const isMp4 = bytes.length > 12 && bytes.toString("ascii", 4, 8) === "ftyp";
  const isWebm = bytes.length > 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  if (!isMp4 && !isWebm) return NextResponse.json({ error: "محتوى الفيديو لا يطابق MP4 أو WebM." }, { status: 400 });
  const extension = isMp4 ? ".mp4" : ".webm";
  const dir = path.join(ROOT, jobId, "videos");
  await mkdir(dir, { recursive: true });
  const relative = "videos/" + motionId + extension;
  await writeFile(path.join(dir, motionId + extension), bytes);
  motion.videoPath = relative;
  motion.status = "video_review";
  motion.error = null;
  job.status = "awaiting_video_approval";
  job.updatedAt = new Date().toISOString();
  await writeFile(path.join(ROOT, jobId, "job.json"), JSON.stringify(job, null, 2) + "\n", "utf8");
  return NextResponse.json({ success: true, job, videoUrl: "/api/studio/ai-animation/jobs/" + jobId + "/files/" + relative });
}
