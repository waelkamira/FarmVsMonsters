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

test("worker bridge restricts upstream URL to HTTP loopback", () => {
  assert.match(source, /url\.protocol !== "http:"/);
  assert.match(source, /host === "localhost"/);
  assert.match(source, /remote hosts are not allowed/);
});

test("worker bridge validates image limits, task names, and worker geometry before returning proposals", () => {
  assert.match(source, /MAX_IMAGE_DATA_URL_CHARS/);
  assert.match(source, /MAX_REQUEST_BODY_BYTES/);
  assert.match(source, /new TextEncoder\(\)\.encode\(rawBody\)\.byteLength/);
  assert.match(source, /4096/);
  assert.match(source, /local-texture-inpaint/);
  assert.match(source, /body\.points\.length > 32/);
  assert.match(source, /typeof x !== "number" \|\| typeof y !== "number"/);
  assert.match(source, /!Number\.isInteger\(label\)/);
  assert.match(source, /points\.some\(\(point\) => point\.label === 1\)/);
  assert.match(source, /points\.push\(\{ x, y, label \}\)/);
  assert.match(source, /\.\.\.\(points \? \{ points \} : \{\}\)/);
  assert.match(source, /validateAutoRigWorkerResponse/);
  assert.match(source, /status: 422/);
});


test("worker bridge validates donor and target polygons and reviewable reconstruction output", () => {
  assert.match(source, /function validPolygon\(points, width, height\)/);
  assert.match(source, /body\.sourcePolygon/);
  assert.match(source, /body\.targetPolygon/);
  assert.match(source, /flipHorizontal/);
  assert.match(source, /function validReconstructionResponse/);
  assert.match(source, /reviewRequired === true/);
  assert.match(source, /status: 422/);
});

test("worker bridge accepts only bounded target polygons for local texture inpainting", () => {
  assert.match(source, /body\.task === "local-texture-inpaint"/);
  assert.match(source, /inpaintRadius/);
  assert.match(source, /opencv-telea-inpaint/);
});

test("worker bridge validates local diffusion anatomical reconstruction prompt, seed and provenance", () => {
  assert.match(source, /body\\.task === "anatomical-inpaint"/);
  assert.match(source, /body\\.prompt\\.length > 400/);
  assert.match(source, /local-diffusion-anatomical-inpaint/);
  assert.match(source, /data\\.provenance\\?\\.model/);
  assert.match(source, /data\\.provenance\\?\\.seed/);
  assert.match(source, /180_000/);
});
