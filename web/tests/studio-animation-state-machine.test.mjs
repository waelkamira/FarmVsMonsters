import test from "node:test";
import assert from "node:assert/strict";
import { createSkeletalAnimationController } from "../game/studio/animationStateMachine.mjs";

function profile() {
  return {
    version: 1, canvas: { width: 200, height: 200 },
    bones: [
      { id: "root", parentId: null, x: 0, y: 0 },
      { id: "head", parentId: "root", x: 10, y: 0, rotation: 350 }
    ],
    attachments: [{ id: "muzzle", boneId: "head", x: 10, y: 0 }],
    hitboxes: [],
    clips: [
      { id: "idle", durationMs: 1000, loop: true, tracks: [{ boneId: "head", keyframes: [{ timeMs: 0, rotation: 350 }, { timeMs: 1000, rotation: 350 }] }] },
      { id: "attack", durationMs: 500, loop: false, tracks: [{ boneId: "head", keyframes: [{ timeMs: 0, rotation: 10 }, { timeMs: 500, rotation: 90 }] }] },
      { id: "move", durationMs: 800, loop: true, tracks: [{ boneId: "root", keyframes: [{ timeMs: 0, x: 0 }, { timeMs: 800, x: 30 }] }] }
    ]
  };
}

test("animation controller changes state and advances the selected clip", () => {
  const controller = createSkeletalAnimationController(profile(), "idle");
  assert.equal(controller.state, "idle");
  controller.setState("attack", 0);
  assert.equal(controller.state, "attack");
  const pose = controller.update(250);
  assert.equal(pose.timeMs, 250);
  assert.equal(pose.localBones.head.rotation, 50);
});

test("crossfades local bone transforms using shortest-path rotation", () => {
  const controller = createSkeletalAnimationController(profile(), "idle");
  controller.setState("attack", 200);
  const halfway = controller.update(100);
  assert.ok(Math.abs(halfway.localBones.head.rotation - 368) < 0.001);
  const complete = controller.update(100);
  assert.equal(complete.localBones.head.rotation, 42);
});

test("crossfaded world pose keeps child hierarchy and supports reset", () => {
  const controller = createSkeletalAnimationController(profile(), "idle");
  controller.setState("move", 100);
  const pose = controller.update(50);
  assert.equal(pose.localBones.root.x, 0.9375);
  assert.ok(Number.isFinite(pose.bones.head.x));
  controller.reset();
  assert.equal(controller.elapsedMs, 0);
});

test("controller rejects missing states and profiles without clips", () => {
  const controller = createSkeletalAnimationController(profile());
  assert.throws(() => controller.setState("missing"), /Unknown skeletal animation state/);
  assert.throws(() => createSkeletalAnimationController({ ...profile(), clips: [] }), /requires at least one clip/);
});
