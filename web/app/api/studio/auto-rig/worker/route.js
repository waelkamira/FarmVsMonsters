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

function validPolygon(points, width, height) {
  if (!Array.isArray(points) || points.length < 3 || points.length > 512) return false;
  if (points.some((point) => !point || typeof point.x !== "number" || typeof point.y !== "number" ||
      !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0 ||
      point.x >= width || point.y >= height)) return false;
  if (new Set(points.map((point) => point.x + ":" + point.y)).size < 3) return false;
  const area = Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2);
  return area >= 4;
}

function validReconstructionResponse(data, width, height, task) {
  const validBounds = (bounds) => bounds && ["x", "y", "width", "height"].every((key) => Number.isInteger(bounds[key])) &&
    bounds.x >= 0 && bounds.y >= 0 && bounds.width > 0 && bounds.height > 0 &&
    bounds.x + bounds.width <= width && bounds.y + bounds.height <= height;
  return data && data.protocolVersion === 1 &&
    typeof data.patchDataUrl === "string" && data.patchDataUrl.length <= MAX_IMAGE_DATA_URL_CHARS &&
    /^data:image\/png;base64,[a-zA-Z0-9+/]+={0,2}$/.test(data.patchDataUrl) &&
    validBounds(data.targetBounds) &&
    (task === "visible-donor-reconstruction" ? validBounds(data.donorBounds) && data.provenance?.method === "visible-donor-transfer" : task === "local-texture-inpaint" ? data.provenance?.method === "opencv-telea-inpaint" : data.provenance?.method === "local-diffusion-anatomical-inpaint" && typeof data.provenance?.model === "string" && typeof data.provenance?.prompt === "string" && Number.isInteger(data.provenance?.seed)) &&
    data.provenance?.pixels === "reconstructed" && data.provenance?.reviewRequired === true;
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
  if (!["part-detection", "prompted-segmentation", "semantic-classification", "anatomical-inpaint", "visible-donor-reconstruction", "local-texture-inpaint"].includes(body.task)) {
    return NextResponse.json({ error: "Unsupported Auto-Rig worker task." }, { status: 400 });
  }
  let semanticClassification;
  if (body.task === "semantic-classification") {
    if (!["plant", "monster"].includes(body.characterType) || !Array.isArray(body.proposals) ||
        body.proposals.length < 1 || body.proposals.length > 63) {
      return NextResponse.json({ error: "Visual classification requires a plant/monster type and 1–63 SAM 2 proposals." }, { status: 400 });
    }
    const proposalIds = new Set();
    for (const proposal of body.proposals) {
      if (!proposal || typeof proposal.id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,63}$/.test(proposal.id) ||
          proposalIds.has(proposal.id) || !validPolygon(proposal.mask?.points, width, height) ||
          proposal.mask?.kind !== "polygon" || !proposal.bounds ||
          !["x", "y", "width", "height"].every((key) => Number.isInteger(proposal.bounds[key])) ||
          proposal.bounds.x < 0 || proposal.bounds.y < 0 || proposal.bounds.width < 2 || proposal.bounds.height < 2 ||
          proposal.bounds.x + proposal.bounds.width > width || proposal.bounds.y + proposal.bounds.height > height) {
        return NextResponse.json({ error: "A visual-classification proposal has invalid identity, bounds, or polygon geometry." }, { status: 400 });
      }
      proposalIds.add(proposal.id);
    }
    semanticClassification = { characterType: body.characterType, proposals: body.proposals };
  }
  let anatomical;
  if (body.task === "anatomical-inpaint") {
    if (!validPolygon(body.targetPolygon, width, height) ||
        typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 400 ||
        (body.seed != null && (!Number.isInteger(body.seed) || body.seed < 0 || body.seed > 2147483647))) {
      return NextResponse.json({ error: "Anatomical reconstruction requires a valid target polygon, a description (max 400 characters), and an optional valid seed." }, { status: 400 });
    }
    anatomical = { targetPolygon: body.targetPolygon, prompt: body.prompt.trim(), seed: body.seed == null ? 20261122 : body.seed };
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
  let reconstruction;
  if (body.task === "visible-donor-reconstruction" || body.task === "local-texture-inpaint" || body.task === "anatomical-inpaint") {
    if (!validPolygon(body.targetPolygon, width, height) || (body.task === "visible-donor-reconstruction" && !validPolygon(body.sourcePolygon, width, height))) {
      return NextResponse.json({ error: "The hidden target and any required visible donor must be valid 3–512 point source-space polygons." }, { status: 400 });
    }
    if (body.task === "visible-donor-reconstruction" && body.flipHorizontal != null && typeof body.flipHorizontal !== "boolean") {
      return NextResponse.json({ error: "flipHorizontal must be a boolean when supplied." }, { status: 400 });
    }
    reconstruction = body.task === "visible-donor-reconstruction"
      ? { sourcePolygon: body.sourcePolygon, targetPolygon: body.targetPolygon, flipHorizontal: body.flipHorizontal !== false }
      : { targetPolygon: body.targetPolygon, inpaintRadius: Number.isInteger(body.inpaintRadius) && body.inpaintRadius >= 1 && body.inpaintRadius <= 8 ? body.inpaintRadius : 3 };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), body.task === "semantic-classification" || body.task === "anatomical-inpaint" ? 180_000 : WORKER_TIMEOUT_MS);
  try {
    const response = await fetch(new URL("/v1/auto-rig/" + body.task, base), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ protocolVersion: 1, canvas: { width, height }, imageDataUrl: body.imageDataUrl, prompt: typeof body.prompt === "string" ? body.prompt.slice(0, 500) : "", ...(points ? { points } : {}), ...(semanticClassification || {}), ...(anatomical || {}), ...(reconstruction || {}) }),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return NextResponse.json({ error: "Local worker rejected the task (" + response.status + ").", detail: detail.slice(0, 500) }, { status: 502 });
    }
    const workerData = await response.json();
    if (body.task === "semantic-classification") {
      const allowedRoles = new Set(["body", "stem", "head", "face", "eye.left", "eye.right", "eye", "mouth", "jaw.upper", "jaw.lower", "leaf", "leaf.left", "leaf.right", "flower", "fruit", "root", "arm", "arm.left", "arm.right", "hand", "hand.left", "hand.right", "leg", "foot", "weapon", "weapon.barrel", "weapon.muzzle", "tail", "armor", "accessory", "shadow", "effect", "unknown"]);
      const expectedIds = new Set(body.proposals.map((proposal) => proposal.id));
      const suggestions = workerData?.suggestions;
      if (workerData?.protocolVersion !== 1 || workerData?.classifier !== "local-clip-zero-shot" ||
          !Array.isArray(suggestions) || suggestions.length !== expectedIds.size ||
          suggestions.some((item) => !item || !expectedIds.has(item.proposalId) || !allowedRoles.has(item.role) ||
            typeof item.confidence !== "number" || !Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1 ||
            typeof item.margin !== "number" || !Number.isFinite(item.margin) || item.margin < 0 ||
            typeof item.reason !== "string" || item.model !== "local-clip-zero-shot") ||
          new Set(suggestions.map((item) => item.proposalId)).size !== expectedIds.size) {
        return NextResponse.json({ error: "Local visual classifier returned an invalid or incomplete response." }, { status: 422 });
      }
      return NextResponse.json(workerData, { headers: { "Cache-Control": "no-store" } });
    }
    if (body.task === "visible-donor-reconstruction" || body.task === "local-texture-inpaint") {
      if (!validReconstructionResponse(workerData, width, height, body.task)) {
        return NextResponse.json({ error: "Worker returned invalid reconstructed image data or geometry." }, { status: 422 });
      }
      return NextResponse.json(workerData, { headers: { "Cache-Control": "no-store" } });
    }
    const result = validateAutoRigWorkerResponse(workerData, { width, height });
    if (!result.valid) return NextResponse.json({ error: "Worker returned invalid or unsafe geometry.", validationErrors: result.errors }, { status: 422 });
    return NextResponse.json({ protocolVersion: 1, proposals: result.proposals }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timeoutError = error?.name === "AbortError";
    return NextResponse.json({ error: timeoutError ? "Local AI worker timed out." : "Could not communicate with the local AI worker.", code: timeoutError ? "WORKER_TIMEOUT" : "WORKER_OFFLINE" }, { status: 503 });
  } finally { clearTimeout(timeout); }
}
