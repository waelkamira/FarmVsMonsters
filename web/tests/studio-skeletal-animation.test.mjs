import test from "node:test";
import assert from "node:assert/strict";
import {
  createSkeletalRigProfile,
  evaluateSkeletalClip,
  getSkeletalAttachmentTransform,
  getSkeletalHitboxTransform,
  validateSkeletalRigProfile
} from "../game/studio/skeletalAnimation.mjs";

function sampleRig(overrides = {}) {
  return {
    version: 1,
    canvas: { width: 200, height: 200 },
    bones: [
      { id: "root", parentId: null, x: 10, y: 20, rotation: 0 },
      { id: "head", parentId: "root", x: 20, y: 0, rotation: 0, part: { assetId: "head-image", frame: 0 } },
      { id: "weapon", parentId: "head", x: 12, y: 4, rotation: 0 }
    ],
    attachments: [{ id: "muzzle", boneId: "weapon", x: 8, y: 0 }],
    hitboxes: [{ id: "bite", boneId: "head", x: 4, y: 0, width: 20, height: 12, kind: "attack" }],
    clips: [{
      id: "fire",
      durationMs: 1000,
      loop: false,
      tracks: [{
        boneId: "head",
        keyframes: [
          { timeMs: 0, x: 20, y: 0, rotation: 350 },
          { timeMs: 1000, x: 20, y: 0, rotation: 10 }
        ]
      }]
    }],
    ...overrides
  };
}

test("validates a rig and freezes its normalized profile", () => {
  const rig = createSkeletalRigProfile(sampleRig());
  assert.equal(rig.bones.length, 3);
  assert.equal(Object.isFrozen(rig), true);
  assert.equal(Object.isFrozen(rig.bones[0]), true);
});

test("rejects duplicate IDs, missing parents, and cyclic hierarchies", () => {
  assert.throws(() => createSkeletalRigProfile(sampleRig({
    bones: [{ id: "root", parentId: null }, { id: "root", parentId: "root" }]
  })), /Duplicate bone ID/);
  assert.throws(() => createSkeletalRigProfile(sampleRig({
    bones: [{ id: "root", parentId: null }, { id: "child", parentId: "missing" }]
  })), /missing parent/);
  assert.throws(() => createSkeletalRigProfile(sampleRig({
    bones: [{ id: "root", parentId: null }, { id: "a", parentId: "b" }, { id: "b", parentId: "a" }]
  })), /cycle/);
});

test("rejects attachments, hitboxes, and animation tracks that reference unknown bones", () => {
  assert.throws(() => createSkeletalRigProfile(sampleRig({
    attachments: [{ id: "muzzle", boneId: "missing" }]
  })), /missing bone/);
  assert.throws(() => createSkeletalRigProfile(sampleRig({
    hitboxes: [{ id: "hurt", boneId: "missing", width: 1, height: 1 }]
  })), /missing bone/);
  assert.throws(() => createSkeletalRigProfile(sampleRig({
    clips: [{ id: "bad", durationMs: 100, tracks: [{ boneId: "missing", keyframes: [{ timeMs: 0 }] }] }]
  })), /missing bone/);
});

test("evaluates hierarchical bone transforms and interpolates the shortest rotation arc", () => {
  const rig = createSkeletalRigProfile(sampleRig());
  const pose = evaluateSkeletalClip(rig, "fire", 500);
  assert.equal(pose.timeMs, 500);
  assert.ok(Math.abs(pose.bones.head.rotation - 360) < 0.001);
  assert.ok(Math.abs(pose.bones.weapon.x - 42) < 0.001);
  assert.ok(Math.abs(pose.bones.weapon.y - 24) < 0.001);
});

test("loops clips and clamps non-looping clips at their duration", () => {
  const looping = createSkeletalRigProfile(sampleRig({
    clips: [{ id: "idle", durationMs: 500, loop: true, tracks: [{ boneId: "head", keyframes: [{ timeMs: 0 }, { timeMs: 500, x: 30 }] }] }]
  }));
  assert.equal(evaluateSkeletalClip(looping, "idle", 750).timeMs, 250);
  const once = createSkeletalRigProfile(sampleRig());
  assert.equal(evaluateSkeletalClip(once, "fire", 5000).timeMs, 1000);
});

test("resolves a weapon muzzle attachment from the evaluated bone pose", () => {
  const rig = createSkeletalRigProfile(sampleRig());
  const pose = evaluateSkeletalClip(rig, "fire", 500);
  const muzzle = getSkeletalAttachmentTransform(rig, pose, "muzzle");
  assert.ok(Number.isFinite(muzzle.x));
  assert.ok(Number.isFinite(muzzle.y));
  assert.equal(muzzle.rotation, 360);
});

test("resolves hitboxes from the same animated pose used for rendering", () => {
  const rig = createSkeletalRigProfile(sampleRig());
  const pose = evaluateSkeletalClip(rig, "fire", 500);
  const hitbox = getSkeletalHitboxTransform(rig, pose, "bite");
  assert.ok(Number.isFinite(hitbox.x));
  assert.ok(Number.isFinite(hitbox.y));
  assert.equal(hitbox.width, 20);
  assert.equal(hitbox.kind, "attack");
});

test("rejects out-of-order keyframes and invalid canvas sizes", () => {
  assert.throws(() => createSkeletalRigProfile(sampleRig({
    clips: [{ id: "bad", durationMs: 100, tracks: [{ boneId: "root", keyframes: [{ timeMs: 50 }, { timeMs: 20 }] }] }]
  })), /strictly increasing/);
  assert.throws(() => createSkeletalRigProfile(sampleRig({ canvas: { width: 0, height: 200 } })), /canvas.width/);
});

test("returns actionable validation errors without throwing", () => {
  const result = validateSkeletalRigProfile({ bones: [{ id: "root", parentId: null }, null] });
  assert.equal(result.valid, false);
  assert.equal(result.profile, null);
  assert.match(result.errors[0], /must be an object/);
});

test("partial keyframes inherit the bone base transform instead of snapping to the origin", () => {
  const rig = createSkeletalRigProfile({
    version: 1,
    bones: [{ id: "root", parentId: null, x: 40, y: 25, rotation: 0 }],
    clips: [{ id: "idle", durationMs: 1000, loop: true, tracks: [{ boneId: "root", keyframes: [{ timeMs: 0, rotation: 0 }, { timeMs: 1000, rotation: 90 }] }] }]
  });
  const pose = evaluateSkeletalClip(rig, "idle", 500);
  assert.equal(pose.bones.root.x, 40);
  assert.equal(pose.bones.root.y, 25);
  assert.equal(pose.bones.root.rotation, 45);
});
