import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  consumeStudioLoginAttempt,
  STUDIO_LOGIN_MAX_ATTEMPTS,
  STUDIO_LOGIN_WINDOW_SECONDS
} from "../game/studio/loginRateLimit.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const sessionRoute = readFileSync(resolve(here, "../app/api/studio/session/route.js"), "utf8");
const protectedRoutes = [
  "../app/api/studio/assets/route.js",
  "../app/api/studio/testing/route.js",
  "../app/api/studio/stage-encounters/route.js",
  "../app/api/studio/auto-rig/worker/route.js"
].map((path) => readFileSync(resolve(here, path), "utf8"));

function request(ip) {
  return { headers: new Headers({ "x-real-ip": ip }) };
}

test("Studio login permits five attempts and blocks the sixth for the 15-minute window", async () => {
  const ip = "198.51.100." + Math.floor(Math.random() * 200 + 1);
  const options = { env: { NODE_ENV: "development" }, now: 1_900_000_000_000 };
  assert.equal(STUDIO_LOGIN_MAX_ATTEMPTS, 5);
  assert.equal(STUDIO_LOGIN_WINDOW_SECONDS, 900);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await consumeStudioLoginAttempt(request(ip), options);
    assert.equal(result.allowed, true);
    assert.equal(result.unavailable, false);
  }
  const blocked = await consumeStudioLoginAttempt(request(ip), options);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterSeconds, 900);
});

test("Studio login limits are isolated by client address", async () => {
  const ip = "203.0.113." + Math.floor(Math.random() * 200 + 1);
  const options = { env: { NODE_ENV: "development" }, now: 1_900_000_100_000 };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await consumeStudioLoginAttempt(request(ip), options);
  }
  const other = await consumeStudioLoginAttempt(request(ip + "-other"), options);
  assert.equal(other.allowed, true);
});

test("production Studio login fails closed when no shared rate-limit store is configured", async () => {
  const result = await consumeStudioLoginAttempt(request("192.0.2.200"), {
    env: { NODE_ENV: "production" }
  });
  assert.equal(result.allowed, false);
  assert.equal(result.unavailable, true);
});

test("shared Redis rate limiting enforces the server-side attempt count", async () => {
  let sent;
  const result = await consumeStudioLoginAttempt(request("192.0.2.201"), {
    env: {
      NODE_ENV: "production",
      STUDIO_RATE_LIMIT_REDIS_REST_URL: "https://redis.example.test",
      STUDIO_RATE_LIMIT_REDIS_REST_TOKEN: "test-token"
    },
    fetchImpl: async (url, options) => {
      sent = { url: String(url), options };
      return { ok: true, json: async () => ({ result: 6 }) };
    }
  });
  assert.equal(result.allowed, false);
  assert.equal(result.unavailable, false);
  assert.equal(sent.url, "https://redis.example.test/");
  assert.match(sent.options.headers.Authorization, /^Bearer /);
  const command = JSON.parse(sent.options.body);
  assert.equal(command[0], "EVAL");
  assert.equal(command[2], 1);
  assert.equal(command[4], 900);
});

test("a failed shared rate-limit store never falls back to an unshared production counter", async () => {
  const result = await consumeStudioLoginAttempt(request("192.0.2.202"), {
    env: {
      NODE_ENV: "production",
      STUDIO_RATE_LIMIT_REDIS_REST_URL: "https://redis.example.test",
      STUDIO_RATE_LIMIT_REDIS_REST_TOKEN: "test-token"
    },
    fetchImpl: async () => ({ ok: false, json: async () => ({}) })
  });
  assert.equal(result.allowed, false);
  assert.equal(result.unavailable, true);
});

test("Studio login compares the admin token but signs cookies with a separate secret", () => {
  assert.match(sessionRoute, /STUDIO_ADMIN_TOKEN/);
  assert.match(sessionRoute, /STUDIO_SESSION_SECRET/);
  assert.match(sessionRoute, /expected === signingSecret/);
  assert.match(sessionRoute, /createStudioSession\(signingSecret\)/);
  assert.match(sessionRoute, /consumeStudioLoginAttempt/);
  assert.match(sessionRoute, /status: 429/);
  assert.match(sessionRoute, /timingSafeEqual/);
  for (const route of protectedRoutes) {
    assert.match(route, /STUDIO_SESSION_SECRET/);
    assert.doesNotMatch(route, /verifyStudioSession\(process\.env\.STUDIO_ADMIN_TOKEN/);
  }
});
