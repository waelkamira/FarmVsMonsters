import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { verifyStudioSession } from "../../../../../../../../game/studio/signedSession.mjs";
import { safeAiJobId } from "../../../../../../../../game/studio/aiAnimationPipeline.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const COOKIE = "fvm_studio_session";
const ROOT = path.join(process.cwd(), ".autorig-workspace", "ai-animation", "jobs");
const SCRIPT = path.join(process.cwd(), "game", "studio", "autoRig", "videoPipeline", "video_to_spritesheet.py");
function authorized(req) { return verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN || "", req.cookies.get(COOKIE)?.value || ""); }
function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (chunk) => { stdout = (stdout + chunk.toString()).slice(-20000); });
    child.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString()).slice(-20000); });
    const timer = setTimeout(() => child.kill("SIGTERM"), 280000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 || code === 2) resolve({ code, stdout, stderr });
      else reject(new Error((stderr || stdout || "Sprite extraction failed.").slice(-3000)));
    });
  });
}
export async function POST(req, context) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { jobId, motionId } = await context.params;
  if (!safeAiJobId(jobId) || !/^(idle|walk|run|fly|attack|hurt|death)$/.test(motionId)) return NextResponse.json({ error: "Invalid job or motion ID." }, { status: 400 });
  const dir = path.join(ROOT, jobId);
  let job; try { job = JSON.parse(await readFile(path.join(dir, "job.json"), "utf8")); } catch { return NextResponse.json({ error: "المهمة غير موجودة." }, { status: 404 }); }
  const motion = job.motions?.[motionId];
  if (!motion || motion.status !== "video_approved" || !motion.videoPath) return NextResponse.json({ error: "يجب اعتماد الفيديو أولاً قبل استخراج الإطارات." }, { status: 409 });
  const input = path.join(dir, motion.videoPath);
  const output = path.join(dir, "export", motionId);
  await mkdir(output, { recursive: true });
  motion.status = "processing";
  job.status = "processing";
  job.updatedAt = new Date().toISOString();
  await writeFile(path.join(dir, "job.json"), JSON.stringify(job, null, 2) + "\n", "utf8");
  try {
    const command = process.env.FVM_PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
    const result = await run(command, [SCRIPT, "--input", input, "--output-dir", output, "--name", job.id + "-" + motionId,
      "--frames", String(motion.frames), "--fps", String(motion.fps), "--width", String(motion.frameWidth || 150), "--height", String(motion.frameHeight || 150),
      "--columns", String(Math.min(motion.columns || 6, motion.frames)), "--background", "blue"], process.cwd());
    const validationPath = path.join(output, "validation.json");
    const validation = JSON.parse(await readFile(validationPath, "utf8"));
    motion.outputPath = "export/" + motionId + "/" + job.id + "-" + motionId + ".png";
    motion.atlasJsonPath = "export/" + motionId + "/" + job.id + "-" + motionId + ".json";
    motion.validationPath = "export/" + motionId + "/validation.json";
    motion.spriteStatus = validation.status === "passed_structural_checks" ? "sprite_review" : "needs_review";
    motion.status = "sprite_review";
    motion.processingWarnings = validation.warnings || [];
    motion.processingExitCode = result.code;
    job.status = "awaiting_sprite_approval";
    job.updatedAt = new Date().toISOString();
    await writeFile(path.join(dir, "job.json"), JSON.stringify(job, null, 2) + "\n", "utf8");
    return NextResponse.json({ success: true, job, validation, warnings: motion.processingWarnings });
  } catch (error) {
    motion.status = "video_approved";
    motion.error = error.message;
    job.status = "failed";
    job.updatedAt = new Date().toISOString();
    await writeFile(path.join(dir, "job.json"), JSON.stringify(job, null, 2) + "\n", "utf8");
    return NextResponse.json({ error: error.message || "تعذرت معالجة الفيديو." }, { status: 500 });
  }
}
