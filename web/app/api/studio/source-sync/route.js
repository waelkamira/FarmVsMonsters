import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { verifyStudioSession } from "../../../../game/studio/signedSession.mjs";
import { canWriteStudioStorage } from "../../../../game/studio/storageDriver.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const execFileAsync = promisify(execFile);
const COOKIE = "fvm_studio_session";

function authorized(req) {
  return verifyStudioSession(process.env.STUDIO_SESSION_SECRET || "", req.cookies.get(COOKIE)?.value || "");
}

export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canWriteStudioStorage()) return NextResponse.json({ error: "Source-branch synchronization is available only in local development." }, { status: 403 });

  try {
    const script = path.join(process.cwd(), "scripts", "sync-studio-source-assets.mjs");
    const result = await execFileAsync(process.execPath, [script], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 1024 * 1024,
      windowsHide: true
    });
    return NextResponse.json({ success: true, output: String(result.stdout || "").trim() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const detail = String(error.stderr || error.message || "").trim();
    return NextResponse.json({ error: detail || "Could not synchronize tested assets to studio/assets." }, { status: 409 });
  }
}
