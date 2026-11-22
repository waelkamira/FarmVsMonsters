import { NextResponse } from "next/server";
import { verifyStudioSession } from "../../../../../game/studio/signedSession.mjs";
import { normalizeAutoRigWorkerCapabilities, validateAutoRigWorkerResponse } from "../../../../../game/studio/autoRigWorkerProtocol.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "fvm_studio_session";
const MAX_IMAGE_DATA_URL_CHARS = 11 * 1024 * 1024;
const MAX_REQUEST_BODY_BYTES = 12 * 1024 * 1024;
const WORKER_TIMEOUT_MS = 45_000;

function authorized(req) {
  return verifyStudioSession(process.env.STUDIO_ADMIN_TOKEN || "", req.cookies.get(COOKIE)?.value || "");
}

function workerEndpoint() {
  const raw = process.env.STUDIO_LOCAL_AI_WORKER_URL || "http://127.0.0.1:8765";
  let url;
  try { url = new URL(raw); } catch { throw new Error("STUDIO_LOCAL_AI_WORKER_URL is not a valid URL."); }
  const host = url.hostname.toLowerCase();
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  if (url.protocol !== "http:" || !loopback || url.username || url.password || url.search || url.hash) {
    throw new Error("The Studio AI worker must be an unauthenticated HTTP loopback service; remote hosts are not allowed.");
  }
  return url;
}

export async function GET(req) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let base;
  try { base = workerEndpoint(); } catch (error) {
    return NextResponse.json({ status: "not-configured", error: error.message }, { status: 503 });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(new URL("/v1/capabilities", base), { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return NextResponse.json({ status: "unavailable", error: "Worker health check failed (" + response.status + ")." }, { status: 503 });
    const data = normalizeAutoRigWorkerCapabilities(await response.json());
    return NextResponse.json({ status: data.status === "ready" ? "connected" : "degraded", capabilities: data }, { status: data.status === "ready" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "offline", error: "Local AI worker is not reachable. Start the worker on this machine and retry." }, { status: 503 });
  } finally { clearTimeout(timeout); }
}

export async function POST(req) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let base;
  try { base = workerEndpoint(); } catch (error) {
    return NextResponse.json({ error: error.message, code: "WORKER_NOT_CONFIGURED" }, { status: 503 });
  }
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    return NextResponse.json({ error: "Request body exceeds the 12 MB limit." }, { status: 413 });
  }
  let body;
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json({ error: "Request body exceeds the 12 MB limit." }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON within the size limit." }, { status: 400 });
  }
  const width = Number(body?.canvas?.width), height = Number(body?.canvas?.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 4096 || height > 4096) {
    return NextResponse.json({ error: "Canvas dimensions must be integers between 1 and 4096." }, { status: 400 });
  }
  if (typeof body.imageDataUrl !== "string" || body.imageDataUrl.length > MAX_IMAGE_DATA_URL_CHARS ||
      !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/]+=*$/.test(body.imageDataUrl)) {
    return NextResponse.json({ error: "Provide a PNG, JPEG, or WebP base64 data URL within the 8 MB source limit." }, { status: 400 });
  }
  if (!["part-detection", "prompted-segmentation"].includes(body.task)) {
    return NextResponse.json({ error: "Unsupported Auto-Rig worker task." }, { status: 400 });
  }
  let points;
  if (body.task === "prompted-segmentation") {
    if (!Array.isArray(body.points) || body.points.length < 1 || body.points.length > 32) {
      return NextResponse.json({ error: "Prompted segmentation requires 1–32 points." }, { status: 400 });
    }
    points = [];
    for (const point of body.points) {
      const x = point?.x, y = point?.y, label = point?.label == null ? 1 : point.label;
      if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= width || y >= height || !Number.isInteger(label) || ![0, 1].includes(label)) {
        return NextResponse.json({ error: "Prompt points must be finite source coordinates with labels 0 or 1." }, { status: 400 });
      }
      points.push({ x, y, label });
    }
    if (!points.some((point) => point.label === 1)) {
      return NextResponse.json({ error: "At least one positive point is required for SAM 2 segmentation." }, { status: 400 });
    }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS);
  try {
    const response = await fetch(new URL("/v1/auto-rig/" + body.task, base), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ protocolVersion: 1, canvas: { width, height }, imageDataUrl: body.imageDataUrl, prompt: typeof body.prompt === "string" ? body.prompt.slice(0, 500) : "", ...(points ? { points } : {}) }),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ error: "Local worker rejected the task (" + response.status + ").", detail: detail.slice(0, 500) }, { status: 502 });
    }
    const result = validateAutoRigWorkerResponse(await response.json(), { width, height });
    if (!result.valid) return NextResponse.json({ error: "Worker returned invalid or unsafe geometry.", validationErrors: result.errors }, { status: 422 });
    return NextResponse.json({ protocolVersion: 1, proposals: result.proposals }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timeoutError = error?.name === "AbortError";
    return NextResponse.json({ error: timeoutError ? "Local AI worker timed out." : "Could not communicate with the local AI worker.", code: timeoutError ? "WORKER_TIMEOUT" : "WORKER_OFFLINE" }, { status: 503 });
  } finally { clearTimeout(timeout); }
}
