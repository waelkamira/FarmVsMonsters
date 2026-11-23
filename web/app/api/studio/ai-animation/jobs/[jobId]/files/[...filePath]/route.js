import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { verifyStudioSession } from "../../../../../../../../game/studio/signedSession.mjs";
import { safeAiJobId } from "../../../../../../../../game/studio/aiAnimationPipeline.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "fvm_studio_session";
const ROOT = path.join(process.cwd(), ".autorig-workspace", "ai-animation", "jobs");
const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4", ".webm": "video/webm", ".json": "application/json" };
export async function GET(req, context) {
  if (!verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN || "", req.cookies.get(COOKIE)?.value || "")) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { jobId, filePath = [] } = await context.params;
  if (!safeAiJobId(jobId) || !Array.isArray(filePath) || filePath.length < 1 || filePath.some((part) => !part || part === "." || part === ".." || part.includes("\\"))) return NextResponse.json({ error: "Invalid asset path." }, { status: 400 });
  const base = path.resolve(ROOT, jobId);
  const target = path.resolve(base, ...filePath);
  if (!target.startsWith(base + path.sep)) return NextResponse.json({ error: "Invalid asset path." }, { status: 400 });
  const type = TYPES[path.extname(target).toLowerCase()];
  if (!type) return NextResponse.json({ error: "Unsupported artifact type." }, { status: 415 });
  try {
    const bytes = await readFile(target);
    return new NextResponse(bytes, { headers: { "Content-Type": type, "Content-Length": String(bytes.length), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "الملف غير موجود." }, { status: 404 }); }
}
