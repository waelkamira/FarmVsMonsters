import test from "node:test";
import assert from "node:assert/strict";
import { AUTO_RIG_ROLE_DICTIONARY_VERSION, AUTO_RIG_ROLE_OPTIONS, buildAutoRigFromParts, validateAutoRigBuildManifest } from "../game/studio/autoRigBuilder.mjs";
import {
  evaluateSkeletalClip,
  getSkeletalAttachmentTransform,
  validateSkeletalRigProfile
} from "../game/studio/skeletalAnimation.mjs";

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
    id: "muzzle", name: "Muzzle / emitter", boneId: "part-weapon-main",
    x: 66, y: 0, rotation: 0, scaleX: 1, scaleY: 1
  });
});

test("blocks projectile rigs without an explicit muzzle anchor", () => {
  const input = baseInput();
  input.requiresMuzzle = true;
  assert.throws(() => buildAutoRigFromParts(input), /confirmed muzzle\/emitter anchor/);
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

test("rejects a muzzle anchor that references a missing or non-weapon part", () => {
  const missing = baseInput();
  missing.anchors = { muzzle: { partId: "missing-weapon", x: 220, y: 136 } };
  assert.throws(() => buildAutoRigFromParts(missing), /missing emitter part/);
  const wrongRole = baseInput();
  wrongRole.anchors = { muzzle: { partId: "body-main", x: 128, y: 120 } };
  assert.throws(() => buildAutoRigFromParts(wrongRole), /weapon, barrel, muzzle-region, mouth, head, or face/);
});


test("generated rig contract resolves the muzzle to the original source-space point in the shared evaluator", () => {
  const input = baseInput();
  input.requiresMuzzle = true;
  input.anchors = { muzzle: { partId: "weapon-main", x: 224, y: 136, rotation: 0 } };
  const { profile } = buildAutoRigFromParts(input);
  const validation = validateSkeletalRigProfile(profile);
  assert.equal(validation.valid, true, validation.errors.join("; "));
  const pose = evaluateSkeletalClip(validation.profile, "idle", 0);
  const muzzle = getSkeletalAttachmentTransform(validation.profile, pose, "muzzle");
  assert.ok(Math.abs(muzzle.x - (224 - input.canvas.width / 2)) < 1e-9);
  assert.ok(Math.abs(muzzle.y - (136 - input.canvas.height / 2)) < 1e-9);
});

test("accepts full-length existing asset IDs while keeping bone-safe part instance IDs", () => {
  const input = baseInput();
  input.parts[0].assetId = "a".repeat(64);
  const result = buildAutoRigFromParts(input);
  assert.equal(result.profile.bones.find((bone) => bone.id === "part-body-main").part.assetId, "a".repeat(64));
  input.parts[0].id = "p".repeat(60);
  assert.throws(() => buildAutoRigFromParts(input), /1–59 safe characters/);
});

test("rejects a muzzle point outside the selected weapon bounds even when it remains on the canvas", () => {
  const input = baseInput();
  input.anchors = { muzzle: { partId: "weapon-main", x: 100, y: 136 } };
  assert.throws(() => buildAutoRigFromParts(input), /inside or on the confirmed emitter part bounds/);
});

test("chooses the nearest eligible parent instance instead of depending on input order", () => {
  const input = baseInput();
  input.parts.push(
    { id: "body-secondary", assetId: "asset-body-secondary", role: "body", bounds: { x: 180, y: 180, width: 50, height: 50 }, pivot: { x: 205, y: 205 } },
    { id: "leaf-near-secondary", assetId: "asset-leaf-near", role: "leaf", bounds: { x: 180, y: 130, width: 30, height: 30 }, pivot: { x: 195, y: 145 } }
  );
  const first = buildAutoRigFromParts(input);
  input.parts.reverse();
  const second = buildAutoRigFromParts(input);
  const parentId = first.manifest.parts.find((part) => part.id === "leaf-near-secondary").parentPartId;
  assert.equal(parentId, "body-secondary");
  assert.equal(second.manifest.parts.find((part) => part.id === "leaf-near-secondary").parentPartId, parentId);
});


test("records source identity, versioned roles, polygon masks, and pixel provenance in the authoring manifest", () => {
  const input = baseInput();
  input.source = { assetId: "plant-source", sha256: "a".repeat(64), frame: 0 };
  input.parts[0].mask = {
    kind: "polygon",
    points: [{ x: 90, y: 100 }, { x: 160, y: 100 }, { x: 160, y: 180 }, { x: 90, y: 180 }]
  };
  input.parts[0].provenance = { segmentation: "manual-polygon", pixels: "source" };
  const result = buildAutoRigFromParts(input);
  assert.equal(result.manifest.roleDictionaryVersion, AUTO_RIG_ROLE_DICTIONARY_VERSION);
  assert.deepEqual(result.manifest.source, {
    assetId: "plant-source", sha256: "a".repeat(64), frame: 0, width: 256, height: 256
  });
  assert.equal(result.manifest.parts[0].mask.kind, "polygon");
  assert.equal(result.manifest.parts[0].provenance.segmentation, "manual-polygon");
  assert.equal(result.manifest.parts[0].provenance.pixels, "source");
});

test("rejects malformed source hashes and masks outside source coordinates", () => {
  const invalidHash = baseInput();
  invalidHash.source = { sha256: "not-a-sha256" };
  assert.throws(() => buildAutoRigFromParts(invalidHash), /64-character hexadecimal SHA-256/);
  const invalidMask = baseInput();
  invalidMask.parts[0].mask = {
    kind: "polygon",
    points: [{ x: 90, y: 100 }, { x: 160, y: 100 }, { x: 500, y: 180 }]
  };
  assert.throws(() => buildAutoRigFromParts(invalidMask), /outside the source canvas/);
});


test("shares one versioned semantic role dictionary between the builder and Studio options", () => {
  const input = baseInput();
  input.parts.push({
    id: "muzzle-region", assetId: "asset-muzzle", role: "weapon.muzzle",
    bounds: { x: 210, y: 126, width: 18, height: 12 }, pivot: { x: 219, y: 132 }
  });
  const result = buildAutoRigFromParts(input);
  assert.ok(AUTO_RIG_ROLE_OPTIONS.some((option) => option.value === "weapon.muzzle"));
  assert.ok(!result.warnings.some((warning) => warning.code === "unknown-role" && warning.partId === "muzzle-region"));
});


test("flags generated pixel provenance even when occlusion is not separately marked", () => {
  const input = baseInput();
  input.parts[0].provenance = { segmentation: "model-mask", pixels: "reconstructed" };
  const result = buildAutoRigFromParts(input);
  assert.ok(result.warnings.some((warning) => warning.code === "generated-pixels" && warning.partId === "body-main"));
});


test("validates persisted build manifests while allowing subsequent manual rig edits", () => {
  const generated = buildAutoRigFromParts(baseInput());
  const valid = validateAutoRigBuildManifest(generated.manifest, generated.profile);
  assert.equal(valid.valid, true, valid.errors.join("; "));
  const editedProfile = JSON.parse(JSON.stringify(generated.profile));
  editedProfile.bones.push({
    id: "manual-extra-bone", name: "Manual extra bone", parentId: "part-body-main",
    x: 5, y: 6, rotation: 0, scaleX: 1, scaleY: 1, pivot: { x: 0, y: 0 }, part: null
  });
  assert.equal(validateAutoRigBuildManifest(generated.manifest, editedProfile).valid, true);
  const invalidManifest = JSON.parse(JSON.stringify(generated.manifest));
  invalidManifest.parts[0].parentPartId = "missing-parent";
  assert.match(validateAutoRigBuildManifest(invalidManifest, generated.profile).errors[0], /missing parent/);
});


test("suggests contact-aware pivots when the author has not supplied manual pivots", () => {
  const input = baseInput();
  input.parts[0].pivot = null;
  input.parts[1].pivot = null;
  const result = buildAutoRigFromParts(input);
  const body = result.profile.bones.find((bone) => bone.id === "part-body-main");
  const head = result.profile.bones.find((bone) => bone.id === "part-head-main");
  assert.deepEqual(body.pivot, { x: 48, y: 120 });
  assert.deepEqual(head.pivot, { x: 36, y: 70 });
  assert.deepEqual({ x: head.x, y: head.y }, { x: 0, y: -108 });
});


test("generates editable idle, move, attack, hit, and death clips using the shared skeletal evaluator", () => {
  const result = buildAutoRigFromParts(baseInput());
  assert.deepEqual(result.profile.clips.map((clip) => clip.id), ["idle", "move", "attack", "hit", "death"]);
  for (const clip of result.profile.clips) {
    assert.ok(clip.tracks.length > 0);
    assert.doesNotThrow(() => evaluateSkeletalClip(result.profile, clip.id, Math.floor(clip.durationMs / 2)));
  }
  const validation = validateSkeletalRigProfile(result.profile);
  assert.equal(validation.valid, true, validation.errors.join("; "));
});

test("single-part Auto-Rigs do not create duplicate animation tracks", () => {
  const input = baseInput();
  input.parts = [input.parts[0]];
  input.parts[0].role = "leaf";
  const result = buildAutoRigFromParts(input);
  for (const clip of result.profile.clips) {
    const ids = clip.tracks.map((track) => track.boneId);
    assert.equal(new Set(ids).size, ids.length);
  }
});


test("supports mouth and head emitter anchors for plants without a separate weapon sprite", () => {
  const input = baseInput();
  input.parts = input.parts.filter((part) => part.role !== "weapon");
  input.parts.find((part) => part.role === "head").id = "mouth-emitter";
  input.parts.find((part) => part.role === "head").role = "mouth";
  input.requiresMuzzle = true;
  input.anchors = { muzzle: { partId: "mouth-emitter", x: 128, y: 102 } };
  const result = buildAutoRigFromParts(input);
  assert.equal(result.profile.attachments[0].boneId, "part-mouth-emitter");
  assert.equal(result.profile.attachments[0].id, "muzzle");
});


test("uses a dedicated weapon-muzzle region as a confirmed projectile emitter", () => {
  const input = baseInput();
  input.parts.push({
    id: "weapon-tip", assetId: "asset-weapon-tip", role: "weapon.muzzle",
    bounds: { x: 214, y: 126, width: 16, height: 20 }, pivot: { x: 222, y: 136 }
  });
  input.requiresMuzzle = true;
  input.anchors = { muzzle: { partId: "weapon-tip", x: 224, y: 136 } };
  const result = buildAutoRigFromParts(input);
  assert.equal(result.profile.attachments[0].boneId, "part-weapon-tip");
});
