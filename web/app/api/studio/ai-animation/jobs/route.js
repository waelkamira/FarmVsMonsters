import { NextResponse } from "next/server";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { verifyStudioSession } from "../../../../../game/studio/signedSession.mjs";
import { AI_ANIMATION_MOTIONS, createMotionSettings } from "../../../../../game/studio/aiAnimationPipeline.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "fvm_studio_session";
const ROOT = path.join(process.cwd(), ".autorig-workspace", "ai-animation", "jobs");
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function authorized(req) {
  return verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN || "", req.cookies.get(COOKIE)?.value || "");
}
function imageExtension(file) {
  const type = String(file.type || "").toLowerCase();
  if (type === "image/png") return ".png";
  if (type === "image/jpeg") return ".jpg";
  return "";
}
function validImageSignature(bytes, type) {
  if (type === "image/png") return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (type === "image/jpeg") return bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return false;
}
async function saveJob(job) {
  const dir = path.join(ROOT, job.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "job.json"), JSON.stringify(job, null, 2) + "\n", "utf8");
}
async function readJob(id) {
  return JSON.parse(await readFile(path.join(ROOT, id, "job.json"), "utf8"));
}

export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  await mkdir(ROOT, { recursive: true });
  const entries = await readdir(ROOT, { withFileTypes: true });
  const jobs = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[a-f0-9-]{36}$/i.test(entry.name)) continue;
    try {
      const job = await readJob(entry.name);
      jobs.push({ ...job, sourceUrl: "/api/studio/ai-animation/jobs/" + job.id + "/files/source" });
    } catch { /* Ignore incomplete workspace folders. */ }
  }
  jobs.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return NextResponse.json({ jobs }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let form;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "بيانات الرفع غير صالحة." }, { status: 400 }); }
  const file = form.get("image");
  if (!file || typeof file.arrayBuffer !== "function") return NextResponse.json({ error: "اختر صورة النبتة أولاً." }, { status: 400 });
  const extension = imageExtension(file);
  if (!extension || file.size < 16 || file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "ارفع صورة PNG أو JPEG بحجم لا يتجاوز 8 MB." }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validImageSignature(bytes, file.type)) return NextResponse.json({ error: "امتداد الصورة لا يطابق محتواها." }, { status: 400 });
  let selected;
  let rawSettings;
  try {
    selected = JSON.parse(String(form.get("selectedMotions") || "[]"));
    rawSettings = JSON.parse(String(form.get("motionSettings") || "{}"));
  } catch { return NextResponse.json({ error: "اختيارات الحركات أو إعداداتها غير صالحة." }, { status: 400 }); }
  if (!Array.isArray(selected) || selected.length < 1 || selected.length > AI_ANIMATION_MOTIONS.length ||
      selected.some((id) => !AI_ANIMATION_MOTIONS.some((motion) => motion.id === id)) ||
      new Set(selected).size !== selected.length) {
    return NextResponse.json({ error: "اختر حركة واحدة على الأقل من القائمة المتاحة." }, { status: 400 });
  }
  const motions = {};
  try {
    for (const id of selected) motions[id] = createMotionSettings(id, rawSettings[id] || {});
  } catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
  const id = randomUUID();
  const now = new Date().toISOString();
  const job = {
    version: 1, id, name: String(form.get("name") || file.name.replace(/\.[^.]+$/, "") || "New character").slice(0, 100),
    assetType: ["plant", "monster"].includes(form.get("assetType")) ? form.get("assetType") : "plant",
    source: { filename: file.name.slice(0, 180), mimeType: file.type, bytes: bytes.length, path: "source" + extension, background: "#0000FF" },
    provider: { id: "wan2.1", status: "not_configured", providerJobId: null },
    status: "draft", selectedMotionIds: selected, motions, createdAt: now, updatedAt: now
  };
  const dir = path.join(ROOT, id);
  await mkdir(path.join(dir, "videos"), { recursive: true });
  await mkdir(path.join(dir, "export"), { recursive: true });
  await writeFile(path.join(dir, job.source.path), bytes);
  await saveJob(job);
  return NextResponse.json({ job: { ...job, sourceUrl: "/api/studio/ai-animation/jobs/" + id + "/files/source" } }, { status: 201 });
}
