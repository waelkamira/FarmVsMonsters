import test from "node:test";
import assert from "node:assert/strict";
import {
  createSkeletalRigProfile,
  evaluateSkeletalClip,
  getSkeletalAttachmentTransform,
  getSkeletalAttachmentsByKind,
  getSkeletalHitboxTransform,
  snapSkeletalKeyframeTime,
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

test("animation clips normalize and validate preview FPS metadata", () => {
  const rig = createSkeletalRigProfile(sampleRig({ clips: [
    { id: "idle", durationMs: 1000, loop: true, tracks: [] }
  ] }));
  assert.equal(rig.clips[0].fps, 24);
  assert.throws(() => createSkeletalRigProfile(sampleRig({ clips: [
    { id: "idle", durationMs: 1000, fps: 61, loop: true, tracks: [] }
  ] })), /fps/);
});

test("keyframe snapping returns valid integer frame times within clip bounds", () => {
  const clip = { durationMs: 1000, fps: 24 };
  assert.equal(snapSkeletalKeyframeTime(20, clip.fps, clip.durationMs), 0);
  assert.equal(snapSkeletalKeyframeTime(45, clip.fps, clip.durationMs), 42);
  assert.equal(snapSkeletalKeyframeTime(clip, 45), 42);
  assert.equal(snapSkeletalKeyframeTime(50, 30, 1000), 67);
  assert.equal(snapSkeletalKeyframeTime(990, clip.fps, clip.durationMs), 1000);
  assert.equal(Number.isInteger(snapSkeletalKeyframeTime(213.7, clip.fps, clip.durationMs)), true);
  assert.equal(snapSkeletalKeyframeTime(900, 12, 300), 300);
});




test("preserves semantic attachment roles and resolves eye and pupil anchors by kind", () => {
  const rig = createSkeletalRigProfile(sampleRig({
    attachments: [
      { id: "eye-left", name: "Left eye", kind: "eye", boneId: "head", x: -4, y: -2 },
      { id: "pupil-left", name: "Left pupil", kind: "pupil", boneId: "head", x: -3, y: -2 },
      { id: "muzzle", kind: "muzzle", boneId: "weapon", x: 8, y: 0 }
    ]
  }));
  const pose = evaluateSkeletalClip(rig, "fire", 500);
  const eyes = getSkeletalAttachmentsByKind(rig, pose, "eye");
  const pupils = getSkeletalAttachmentsByKind(rig, pose, "pupil");
  assert.equal(eyes.length, 1);
  assert.equal(eyes[0].id, "eye-left");
  assert.equal(pupils.length, 1);
  assert.equal(pupils[0].kind, "pupil");
  assert.equal(getSkeletalAttachmentsByKind(rig, pose, "muzzle")[0].id, "muzzle");
});

test("normalizes detachable bitmap-part metadata without changing legacy rig defaults", () => {
  const rig = createSkeletalRigProfile(sampleRig({
    bones: [
      { id: "root", parentId: null, x: 10, y: 20 },
      { id: "hat", parentId: "root", x: 0, y: -12, part: { assetId: "hat-image", frame: 0, detachable: true } },
      { id: "head", parentId: "root", x: 0, y: 0, part: { assetId: "head-image", frame: 0 } }
    ]
  }));
  assert.equal(rig.bones.find((bone) => bone.id === "hat").part.detachable, true);
  assert.equal(rig.bones.find((bone) => bone.id === "head").part.detachable, false);
});

test("requires at least one clip so every rig can produce an initial pose", () => {
  assert.throws(() => createSkeletalRigProfile(sampleRig({ clips: [] })), /requires at least one clip/);
});
