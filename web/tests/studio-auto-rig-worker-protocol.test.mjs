import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAutoRigWorkerCapabilities,
  validateAutoRigWorkerProposal,
  validateAutoRigWorkerResponse
} from "../game/studio/autoRigWorkerProtocol.mjs";

const canvas = { width: 100, height: 80 };
const proposal = {
  id: "part-1",
  role: "unknown",
  confidence: 0.92,
  bounds: { x: 10, y: 10, width: 30, height: 25 },
  mask: { kind: "polygon", points: [
    { x: 10, y: 10 }, { x: 40, y: 10 }, { x: 40, y: 35 }, { x: 10, y: 35 }
  ] },
  provenance: { segmentation: "sam2", pixels: "source" }
};

test("worker capability normalization never advertises unimplemented reconstruction", () => {
  const normalized = normalizeAutoRigWorkerCapabilities({
    protocolVersion: 1,
    status: "ready",
    device: "cpu",
    capabilities: ["part-detection", "prompted-segmentation", "hidden-part-reconstruction", "unknown"]
  });
  assert.deepEqual(normalized.capabilities, ["part-detection", "prompted-segmentation"]);
  assert.equal(normalized.status, "ready");
});

test("worker with no implemented capabilities is degraded even if it reports ready", () => {
  const normalized = normalizeAutoRigWorkerCapabilities({
    protocolVersion: 1,
    status: "ready",
    capabilities: ["hidden-part-reconstruction"]
  });
  assert.deepEqual(normalized.capabilities, []);
  assert.equal(normalized.status, "degraded");
});

test("rejects unsupported worker protocol versions", () => {
  assert.throws(() => normalizeAutoRigWorkerCapabilities({ protocolVersion: 2 }), /protocol version/);
});

test("accepts valid source-space polygon proposals", () => {
  assert.deepEqual(validateAutoRigWorkerProposal(proposal, canvas), { valid: true, errors: [] });
});

test("rejects geometry outside the source canvas and invalid confidence", () => {
  const invalid = { ...proposal, confidence: 1.2, bounds: { x: 90, y: 10, width: 30, height: 25 } };
  const result = validateAutoRigWorkerProposal(invalid, canvas);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("confidence")));
  assert.ok(result.errors.some((error) => error.includes("bounds")));
});

test("rejects malformed masks and duplicate proposal identifiers", () => {
  const malformed = { ...proposal, mask: { kind: "bitmap", points: [] } };
  assert.equal(validateAutoRigWorkerProposal(malformed, canvas).valid, false);
  const response = validateAutoRigWorkerResponse({ protocolVersion: 1, proposals: [proposal, proposal] }, canvas);
  assert.equal(response.valid, false);
  assert.deepEqual(response.proposals, []);
  assert.ok(response.errors.some((error) => error.includes("duplicate")));
});

test("rejects worker responses above the proposal limit", () => {
  const response = validateAutoRigWorkerResponse({
    protocolVersion: 1,
    proposals: Array.from({ length: 64 }, (_, index) => ({ ...proposal, id: "part-" + index }))
  }, canvas);
  assert.equal(response.valid, false);
  assert.equal(response.proposals.length, 0);
});
