import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { isStudioPrivateAccessAllowed } from "../game/studio/privateAccess.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const proxy = readFileSync(resolve(here, "../proxy.js"), "utf8");

function request(ip) {
  return { headers: new Headers(ip ? { "x-real-ip": ip } : {}) };
}

test("development Studio remains reachable without a production IP allowlist", () => {
  assert.equal(isStudioPrivateAccessAllowed(request("192.0.2.10"), { NODE_ENV: "development" }), true);
});

test("production Studio denies access when no trusted IP allowlist is configured", () => {
  assert.equal(isStudioPrivateAccessAllowed(request("192.0.2.10"), { NODE_ENV: "production" }), false);
});

test("production Studio accepts only exact reverse-proxy supplied allowlisted IPs", () => {
  const env = { NODE_ENV: "production", STUDIO_ALLOWED_IPS: "192.0.2.10, 2001:db8::1" };
  assert.equal(isStudioPrivateAccessAllowed(request("192.0.2.10"), env), true);
  assert.equal(isStudioPrivateAccessAllowed(request("192.0.2.11"), env), false);
  assert.equal(isStudioPrivateAccessAllowed(request(null), env), false);
});

test("the public game encounter read remains available while other Studio paths are gated", () => {
  assert.match(proxy, /request\.method === "GET" && request\.nextUrl\.pathname === "\/api\/studio\/stage-encounters"/);
  assert.match(proxy, /isStudioPrivateAccessAllowed\(request\)/);
  assert.match(proxy, /matcher: \["\/studio\/:path\*", "\/api\/studio\/:path\*"\]/);
});
