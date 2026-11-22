import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/api/studio/auto-rig/worker/route.js", import.meta.url), "utf8");

test("Studio worker bridge is a dynamic Node route with authenticated GET and POST handlers", () => {
  assert.match(source, /export const runtime = "nodejs"/);
  assert.match(source, /export const dynamic = "force-dynamic"/);
  assert.match(source, /export async function GET\(req\)/);
  assert.match(source, /export async function POST\(req\)/);
  assert.match(source, /if \(!authorized\(req\)\)/);
});

test("worker bridge requires same-origin JSON POST requests", () => {
  assert.ok(source.includes("function sameOriginPost(req)"));
  assert.ok(source.includes('origin !== new URL(req.url).origin'));
  assert.ok(source.includes('["same-origin", "same-site", "none"].includes(fetchSite)'));
  assert.ok(source.includes('split(";", 1).trim().toLowerCase() === "application/json"') === false);
  assert.ok(source.includes('Cross-origin or non-JSON requests are not allowed.'));
});

test("worker bridge restricts upstream URL to HTTP loopback", () => {
  assert.match(source, /url\.protocol !== "http:"/);
  assert.match(source, /host === "localhost"/);
  assert.match(source, /remote hosts are not allowed/);
});

test("worker bridge validates image limits, task names, and worker geometry before returning proposals", () => {
  assert.match(source, /MAX_IMAGE_DATA_URL_CHARS/);
  assert.match(source, /MAX_REQUEST_BODY_BYTES/);
  assert.ok(source.includes("async function readBoundedBody(request, maxBytes)"));
  assert.match(source, /4096/);
  assert.match(source, /\["part-detection", "prompted-segmentation"\]\.includes\(body\.task\)/);
  assert.match(source, /body\.points\.length > 32/);
  assert.match(source, /typeof x !== "number" \|\| typeof y !== "number"/);
  assert.match(source, /!Number\.isInteger\(label\)/);
  assert.match(source, /points\.some\(\(point\) => point\.label === 1\)/);
  assert.match(source, /points\.push\(\{ x, y, label \}\)/);
  assert.match(source, /\.\.\.\(points \? \{ points \} : \{\}\)/);
  assert.match(source, /validateAutoRigWorkerResponse/);
  assert.match(source, /status: 422/);
});

test("worker bridge reads request and response streams with explicit byte ceilings", () => {
  assert.ok(source.includes("async function readBoundedBody(request, maxBytes)"));
  assert.match(source, /total > maxBytes/);
  assert.match(source, /readBoundedJsonResponse/);
  assert.ok(source.includes("maxBytes = 2 * 1024 * 1024"));
});

test("worker bridge does not forward internal worker error response bodies", () => {
  assert.ok(!source.includes("detail: detail.slice"));
  assert.match(source, /Local worker rejected the task/);
});

test("worker bridge validates Content-Length syntax and exact streamed byte count", () => {
  assert.ok(source.includes('if (declaredLength && (!/^\\d+$/.test(declaredLength)'));
  assert.ok(source.includes("Number(declaredLength) !== rawBody.byteLength"));
});
