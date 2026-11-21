import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { verifyStudioSession } from "../../../../game/studio/signedSession.mjs";
import { auditStudioAssetRegistry } from "../../../../game/studio/assetReadiness.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "fvm_studio_session";
const REGISTRY_PATH = "web/game/data/studioAssetRegistry.json";

function authorized(req) {
  return verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN || "", req.cookies.get(COOKIE)?.value || "");
}
function githubHeaders(token) {
  return { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
}
async function loadRegistry() {
  const driver = process.env.STUDIO_STORAGE_DRIVER || "local";
  if (driver === "github") {
    const token = process.env.STUDIO_GITHUB_TOKEN;
    if (!token) throw Object.assign(new Error("STUDIO_GITHUB_TOKEN is required."), { status: 503 });
    const repository = process.env.STUDIO_GITHUB_REPOSITORY || "waelkamira/FarmVsMonsters";
    const branch = process.env.STUDIO_GITHUB_BRANCH || "studio/assets";
    const url = "https://api.github.com/repos/" + repository + "/contents/" + REGISTRY_PATH + "?ref=" + encodeURIComponent(branch);
    const response = await fetch(url, { headers: githubHeaders(token), cache: "no-store" });
    if (response.status === 404) return { driver, assets: [] };
    if (!response.ok) throw Object.assign(new Error("تعذر قراءة سجل Studio من GitHub (" + response.status + ")."), { status: 502 });
    const document = await response.json();
    const registry = JSON.parse(Buffer.from(document.content || "", "base64").toString("utf8"));
    return { driver, assets: Array.isArray(registry.assets) ? registry.assets : [] };
  }
  try {
    const registry = JSON.parse(await readFile(path.join(process.cwd(), "game/data/studioAssetRegistry.json"), "utf8"));
    return { driver, assets: Array.isArray(registry.assets) ? registry.assets : [] };
  } catch (error) {
    if (error.code === "ENOENT") return { driver, assets: [] };
    throw error;
  }
}
export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const { driver, assets } = await loadRegistry();
    const report = auditStudioAssetRegistry(assets);
    return NextResponse.json({
      ...report,
      storage: driver,
      checkedAt: new Date().toISOString(),
      scope: "registry-and-runtime-contracts",
      note: "هذا الفحص يتحقق من سجل الأصول وعقود التوافق ومساراتها النصية فقط؛ لا يفحص وجود بايتات الملفات الفعلية، ولا يشغّل معركة Phaser، ولا يحل محل اختبار المتصفح."
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.message || "تعذر تشغيل فحص Studio." }, { status: error.status || 500 });
  }
}
