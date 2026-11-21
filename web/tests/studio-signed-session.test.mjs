import test from "node:test";
import assert from "node:assert/strict";
import { createStudioSession, STUDIO_SESSION_TTL_MS, verifyStudioSession } from "../game/studio/signedSession.mjs";

test("a newly issued Studio session verifies before its expiry", () => {
  const now = 1_800_000_000_000;
  const session = createStudioSession("test-secret", now);
  assert.equal(verifyStudioSession("test-secret", session, now), true);
  assert.equal(verifyStudioSession("test-secret", session, now + STUDIO_SESSION_TTL_MS - 1000), true);
});

test("a Studio session is rejected after its signed expiry even if the cookie is replayed", () => {
  const now = 1_800_000_000_000;
  const session = createStudioSession("test-secret", now);
  assert.equal(verifyStudioSession("test-secret", session, now + STUDIO_SESSION_TTL_MS + 1000), false);
});

test("a Studio session is rejected when its signature or secret is changed", () => {
  const session = createStudioSession("test-secret", 1_800_000_000_000);
  assert.equal(verifyStudioSession("wrong-secret", session, 1_800_000_000_000), false);
  const [nonce, expiry, signature] = session.split(".");
  const changed = signature[0] === "0" ? "1" + signature.slice(1) : "0" + signature.slice(1);
  assert.equal(verifyStudioSession("test-secret", [nonce, expiry, changed].join("."), 1_800_000_000_000), false);
});

test("malformed sessions and missing secrets are rejected", () => {
  assert.equal(verifyStudioSession("", "bad"), false);
  assert.equal(verifyStudioSession("test-secret", "bad"), false);
  assert.equal(verifyStudioSession("test-secret", "not-a-nonce.123.not-a-signature"), false);
  assert.throws(() => createStudioSession("", 1_800_000_000_000));
});
