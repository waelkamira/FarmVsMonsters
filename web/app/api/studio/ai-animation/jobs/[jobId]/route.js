import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyStudioSession } from "../../../../../../game/studio/signedSession.mjs";
import { safeAiJobId, assertMotionTransition } from "../../../../../../game/studio/aiAnimationPipeline.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "fvm_studio_session";
const ROOT = path.join(process.cwd(), ".autorig-workspace", "ai-animation", "jobs");
function authorized(req) { return verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN || "", req.cookies.get(COOKIE)?.value || ""); }
async function load(id) { return JSON.parse(await readFile(path.join(ROOT, id, "job.json"), "utf8")); }
async function save(job) { job.updatedAt = new Date().toISOString(); await writeFile(path.join(ROOT, job.id, "job.json"), JSON.stringify(job, null, 2) + "\n", "utf8"); }
export async function GET(req, context) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { jobId } = await context.params;
  if (!safeAiJobId(jobId)) return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  try { const job = await load(jobId); return NextResponse.json({ job, sourceUrl: "/api/studio/ai-animation/jobs/" + jobId + "/files/" + job.source.path }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "المهمة غير موجودة." }, { status: 404 }); }
}
export async function PATCH(req, context) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { jobId } = await context.params;
  if (!safeAiJobId(jobId)) return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  let body; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  try {
    const job = await load(jobId);
    if (body.action === "registry-testing") {
      if (!job.registry?.assetId) return NextResponse.json({ error: "لم يتم تسجيل الشخصية في مكتبة Studio." }, { status: 409 });
      job.registry.status = "testing";
      job.registry.testPreparedAt = new Date().toISOString();
      await save(job);
      return NextResponse.json({ job });
    }
    const motion = job.motions?.[body.motionId];
    if (!motion) return NextResponse.json({ error: "الحركة غير موجودة في هذه المهمة." }, { status: 404 });
    assertMotionTransition(motion, body.action);
    if (body.action === "approve-video") {
      motion.status = "video_approved";
      motion.videoApprovedAt = new Date().toISOString();
    } else if (body.action === "reject-video") {
      motion.status = "rejected";
      motion.videoApprovedAt = null;
    } else if (body.action === "approve-sprites") {
      motion.spriteStatus = "approved";
      motion.status = "approved";
    } else if (body.action === "reject-sprites") {
      motion.spriteStatus = "rejected";
      motion.status = "video_approved";
    }
    const states = Object.values(job.motions);
    if (states.every((item) => item.status === "approved")) job.status = "approved";
    else if (states.some((item) => item.status === "sprite_review")) job.status = "awaiting_sprite_approval";
    else if (states.some((item) => item.status === "video_review")) job.status = "awaiting_video_approval";
    else if (states.some((item) => item.status === "video_approved")) job.status = "ready_for_processing";
    else if (states.some((item) => item.status === "rejected")) job.status = "needs_revision";
    await save(job);
    return NextResponse.json({ job });
  } catch (error) { return NextResponse.json({ error: error.message || "تعذر تحديث حالة الحركة." }, { status: 409 }); }
}
