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
  assert.match(source, /body\.task !== "part-detection"/);
  assert.match(source, /validateAutoRigWorkerResponse/);
  assert.match(source, /status: 422/);
});
