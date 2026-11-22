import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_RIG_WORKER_PROTOCOL_VERSION,
  normalizeAutoRigWorkerCapabilities,
  validateAutoRigWorkerProposal,
  validateAutoRigWorkerResponse
} from "../game/studio/autoRigWorkerProtocol.mjs";

const canvas = { width: 256, height: 256 };
const proposal = () => ({
  id: "body-main", role: "body", confidence: 0.94,
  bounds: { x: 20, y: 30, width: 100, height: 120 },
  mask: { kind: "polygon", points: [{ x: 20, y: 30 }, { x: 120, y: 30 }, { x: 120, y: 150 }, { x: 20, y: 150 }] },
  provenance: { segmentation: "sam2", pixels: "source" }
});

test("normalizes only supported worker capabilities and bounded model metadata", () => {
  const result = normalizeAutoRigWorkerCapabilities({
    protocolVersion: AUTO_RIG_WORKER_PROTOCOL_VERSION, status: "ready", device: "cuda",
    capabilities: ["part-detection", "unknown", "prompted-segmentation", "part-detection"],
    models: [{ id: "sam2", version: "2.1", license: "Apache-2.0" }, { id: 3, version: "bad" }],
    warnings: ["weights not installed", 4]
  });
  assert.deepEqual(result.capabilities, ["part-detection", "prompted-segmentation"]);
  assert.equal(result.models.length, 1);
  assert.deepEqual(result.warnings, ["weights not installed"]);
});

test("rejects an incompatible worker protocol", () => {
  assert.throws(() => normalizeAutoRigWorkerCapabilities({ protocolVersion: 2 }), /protocol version/);
});

test("accepts a source-coordinate proposal with editable mask and provenance", () => {
  assert.deepEqual(validateAutoRigWorkerProposal(proposal(), canvas), { valid: true, errors: [] });
});

test("rejects out-of-bounds masks, invalid confidence, and malformed geometry", () => {
  const invalid = proposal();
  invalid.confidence = 1.2;
  invalid.mask.points[2].x = 300;
  invalid.bounds.width = 0;
  const result = validateAutoRigWorkerProposal(invalid, canvas);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 3);
});

test("rejects worker responses with duplicate IDs or too many parts", () => {
  const duplicate = validateAutoRigWorkerResponse({ protocolVersion: 1, proposals: [proposal(), proposal()] }, canvas);
  assert.equal(duplicate.valid, false);
  assert.match(duplicate.errors[0], /duplicate proposal ID/);
  const tooMany = validateAutoRigWorkerResponse({ protocolVersion: 1, proposals: Array.from({ length: 64 }, (_, i) => ({ ...proposal(), id: "part-" + i })) }, canvas);
  assert.match(tooMany.errors[0], /at most 63/);
});

test("does not leak partial proposals when any worker output is invalid", () => {
  const valid = proposal();
  const invalid = { ...proposal(), id: "bad id" };
  const result = validateAutoRigWorkerResponse({ protocolVersion: 1, proposals: [valid, invalid] }, canvas);
  assert.equal(result.valid, false);
  assert.deepEqual(result.proposals, []);
});
