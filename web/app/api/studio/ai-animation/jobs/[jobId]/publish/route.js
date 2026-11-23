import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { verifyStudioSession } from "../../../../../../../../game/studio/signedSession.mjs";
import { safeAiJobId } from "../../../../../../../../game/studio/aiAnimationPipeline.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "fvm_studio_session";
const ROOT = path.join(process.cwd(), ".autorig-workspace", "ai-animation", "jobs");
function githubHeaders(token) {
  return { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
}
function safeSlug(value, fallback) {
  const slug = String(value || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return slug || fallback;
}
export async function POST(req, context) {
  if (!verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN || "", req.cookies.get(COOKIE)?.value || "")) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { jobId } = await context.params;
  if (!safeAiJobId(jobId)) return NextResponse.json({ error: "Invalid job ID." }, { status: 400 });
  const token = process.env.STUDIO_GITHUB_TOKEN || "";
  if (!token) return NextResponse.json({ error: "STUDIO_GITHUB_TOKEN غير مضبوط في بيئة الخادم." }, { status: 503 });
  const repository = process.env.STUDIO_GITHUB_REPOSITORY || "waelkamira/FarmVsMonsters";
  const branch = process.env.STUDIO_GITHUB_BRANCH || "studio/assets";
  const dir = path.join(ROOT, jobId);
  let job;
  try { job = JSON.parse(await readFile(path.join(dir, "job.json"), "utf8")); }
  catch { return NextResponse.json({ error: "المهمة غير موجودة." }, { status: 404 }); }
  const motions = job.selectedMotionIds.map((id) => job.motions[id]);
  if (!motions.length || motions.some((motion) => motion.status !== "approved" || motion.spriteStatus !== "approved" || !motion.outputPath || !motion.atlasJsonPath)) {
    return NextResponse.json({ error: "يجب اعتماد فيديوهات وإطارات جميع الحركات المختارة قبل النشر." }, { status: 409 });
  }
  const slug = safeSlug(job.name, "character-" + jobId.slice(0, 8));
  const rootPath = "web/public/assets/ai-generated/" + slug + "/" + jobId;
  const files = [];
  const manifest = {
    version: 1, jobId, name: job.name, assetType: job.assetType, source: job.source,
    background: "#0000FF", createdAt: job.createdAt, publishedAt: new Date().toISOString(),
    motions: motions.map((motion) => ({
      id: motion.id, label: motion.label, loop: motion.loop, fps: motion.fps,
      frameCount: motion.frames, frameWidth: motion.frameWidth, frameHeight: motion.frameHeight,
      columns: motion.columns, durationSeconds: motion.durationSeconds,
      png: motion.id + ".png", atlasJson: motion.id + ".json",
      prompt: motion.prompt, negativePrompt: motion.negativePrompt,
      validation: motion.validationPath ? motion.validationPath : null
    }))
  };
  try {
    for (const motion of motions) {
      for (const [relative, filename, contentType] of [
        [motion.outputPath, motion.id + ".png", "image/png"],
        [motion.atlasJsonPath, motion.id + ".json", "application/json"]
      ]) {
        const bytes = await readFile(path.join(dir, relative));
        if (bytes.length > 8 * 1024 * 1024) throw new Error("الملف " + filename + " يتجاوز حد 8 MB.");
        const target = rootPath + "/" + filename;
        const response = await fetch("https://api.github.com/repos/" + repository + "/contents/" + target.split("/").map(encodeURIComponent).join("/"), {
          method: "PUT", headers: { ...githubHeaders(token), "Content-Type": "application/json" },
          body: JSON.stringify({ message: "studio: add approved AI animation " + slug + " " + motion.id, branch, content: bytes.toString("base64") })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || "GitHub upload failed (" + response.status + ") for " + filename + ".");
        files.push({ path: target, url: result.content?.html_url || null, sha: result.commit?.sha || null, contentType });
      }
    }
    const manifestPath = rootPath + "/manifest.json";
    const manifestResponse = await fetch("https://api.github.com/repos/" + repository + "/contents/" + manifestPath.split("/").map(encodeURIComponent).join("/"), {
      method: "PUT", headers: { ...githubHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ message: "studio: publish approved AI animation manifest " + slug, branch, content: Buffer.from(JSON.stringify(manifest, null, 2) + "\n").toString("base64") })
    });
    const manifestResult = await manifestResponse.json().catch(() => ({}));
    if (!manifestResponse.ok) throw new Error(manifestResult.message || "GitHub manifest upload failed (" + manifestResponse.status + ").");
    files.push({ path: manifestPath, url: manifestResult.content?.html_url || null, sha: manifestResult.commit?.sha || null, contentType: "application/json" });
    job.github = { repository, branch, rootPath, files, publishedAt: manifest.publishedAt, status: "published" };
    job.status = "published_to_github";
    job.updatedAt = new Date().toISOString();
    await writeFile(path.join(dir, "job.json"), JSON.stringify(job, null, 2) + "\n", "utf8");
    return NextResponse.json({ success: true, job, files, branch, repository });
  } catch (error) {
    job.github = { repository, branch, rootPath, files, status: "partial_or_failed", error: error.message, updatedAt: new Date().toISOString() };
    job.updatedAt = new Date().toISOString();
    await writeFile(path.join(dir, "job.json"), JSON.stringify(job, null, 2) + "\n", "utf8");
    return NextResponse.json({ error: error.message || "تعذر نشر ملفات الأنيميشن إلى GitHub.", uploadedFiles: files }, { status: 502 });
  }
}
