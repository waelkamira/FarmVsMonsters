import test from "node:test";
import assert from "node:assert/strict";

const route = await import("../app/api/studio/auto-rig/worker/route.js");

test("Studio worker route exposes node runtime and dynamic execution", () => {
  assert.equal(route.runtime, "nodejs");
  assert.equal(route.dynamic, "force-dynamic");
  assert.equal(typeof route.GET, "function");
  assert.equal(typeof route.POST, "function");
});

test("worker route never exposes the worker endpoint without a valid Studio session", async () => {
  const request = new Request("http://localhost/api/studio/auto-rig/worker");
  const response = await route.GET(request);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized." });
});
