import test from "node:test";
import assert from "node:assert/strict";
import { buildAutoRigFromParts } from "../game/studio/autoRigBuilder.mjs";
import { validateSkeletalRigProfile } from "../game/studio/skeletalAnimation.mjs";

const baseInput = () => ({
  canvas: { width: 256, height: 256 },
  parts: [
    { id: "body-main", assetId: "asset-body", role: "body", bounds: { x: 80, y: 90, width: 96, height: 120 }, pivot: { x: 128, y: 150 } },
    { id: "head-main", assetId: "asset-head", role: "head", bounds: { x: 92, y: 32, width: 72, height: 70 }, pivot: { x: 128, y: 94 } },
    { id: "leaf-left-01", assetId: "asset-leaf-left", role: "leaf.left", bounds: { x: 24, y: 60, width: 72, height: 48 }, pivot: { x: 90, y: 100 } },
    { id: "leaf-right-01", assetId: "asset-leaf-right", role: "leaf.right", bounds: { x: 160, y: 60, width: 72, height: 48 }, pivot: { x: 166, y: 100 } },
    { id: "weapon-main", assetId: "asset-weapon", role: "weapon", bounds: { x: 150, y: 120, width: 80, height: 32 }, pivot: { x: 158, y: 136 } }
  ]
});

test("builds a valid deterministic rig from semantically labeled extracted parts", () => {
  const first = buildAutoRigFromParts(baseInput());
  const second = buildAutoRigFromParts(baseInput());
  assert.equal(validateSkeletalRigProfile(first.profile).valid, true);
  assert.deepEqual(first.profile, second.profile);
  assert.deepEqual(first.profile.bones.map((bone) => bone.id), second.profile.bones.map((bone) => bone.id));
  assert.equal(first.profile.bones.find((bone) => bone.id === "part-head-main").parentId, "part-body-main");
});

test("supports multiple instances of the same role without reusing IDs", () => {
  const input = baseInput();
  input.parts.push({ id: "leaf-extra-02", assetId: "asset-leaf-extra", role: "leaf", bounds: { x: 10, y: 20, width: 24, height: 24 }, pivot: { x: 22, y: 42 } });
  const result = buildAutoRigFromParts(input);
  assert.equal(result.profile.bones.filter((bone) => bone.id.startsWith("part-leaf")).length, 3);
});

test("converts source-space pivots to cropped-image pivots and parent-local positions", () => {
  const result = buildAutoRigFromParts(baseInput());
  const head = result.profile.bones.find((bone) => bone.id === "part-head-main");
  assert.deepEqual(head.pivot, { x: 36, y: 62 });
  assert.deepEqual({ x: head.x, y: head.y }, { x: 0, y: -56 });
});

test("creates a muzzle attachment relative to the confirmed weapon pivot", () => {
  const input = baseInput();
  input.requiresMuzzle = true;
  input.anchors = { muzzle: { partId: "weapon-main", x: 224, y: 136, rotation: 0 } };
  const result = buildAutoRigFromParts(input);
  assert.deepEqual(result.profile.attachments[0], {
    id: "muzzle", name: "Weapon muzzle", boneId: "part-weapon-main",
    x: 66, y: 0, rotation: 0, scaleX: 1, scaleY: 1
  });
});

test("blocks projectile rigs without an explicit muzzle anchor", () => {
  const input = baseInput();
  input.requiresMuzzle = true;
  assert.throws(() => buildAutoRigFromParts(input), /confirmed muzzle anchor/);
});

test("rejects duplicate part IDs, invalid bounds, and cyclic parent references", () => {
  const duplicate = baseInput();
  duplicate.parts.push({ ...duplicate.parts[0] });
  assert.throws(() => buildAutoRigFromParts(duplicate), /Duplicate part instance ID/);
  const outside = baseInput();
  outside.parts[0].bounds.x = 250;
  assert.throws(() => buildAutoRigFromParts(outside), /fit inside/);
  const cycle = baseInput();
  cycle.parts[0].parentPartId = "head-main";
  cycle.parts[1].parentPartId = "body-main";
  assert.throws(() => buildAutoRigFromParts(cycle), /cycle/);
});

test("preserves uncertain and reconstructed occlusion as explicit warnings", () => {
  const input = baseInput();
  input.parts[0].occlusion = "unresolved";
  input.parts[1].occlusion = "reconstructed";
  input.parts[2].role = "petal.rare";
  const result = buildAutoRigFromParts(input);
  assert.ok(result.warnings.some((warning) => warning.code === "unresolved-occlusion"));
  assert.ok(result.warnings.some((warning) => warning.code === "generated-pixels"));
  assert.ok(result.warnings.some((warning) => warning.code === "unknown-role"));
});
