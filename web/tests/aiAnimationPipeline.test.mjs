import test from "node:test";
import assert from "node:assert/strict";
import { AI_ANIMATION_MOTIONS, createMotionSettings, safeAiJobId, assertMotionTransition } from "../game/studio/aiAnimationPipeline.mjs";

test("exposes the seven selectable animation states", () => {
  assert.deepEqual(AI_ANIMATION_MOTIONS.map((motion) => motion.id), ["idle","walk","run","fly","attack","hurt","death"]);
});

test("motion settings preserve custom prompts and bounded output settings", () => {
  const motion = createMotionSettings("attack", { frames: 24, fps: 12, width: 832, height: 480, prompt: "custom attack", selected: true });
  assert.equal(motion.prompt, "custom attack");
  assert.equal(motion.frames, 24);
  assert.equal(motion.loop, false);
  assert.equal(motion.selected, true);
});

test("rejects invalid motion ids and unsafe generation parameters", () => {
  assert.throws(() => createMotionSettings("teleport"), /Unknown animation motion/);
  assert.throws(() => createMotionSettings("idle", { frames: 1 }), /Frame count/);
  assert.throws(() => createMotionSettings("idle", { fps: 60 }), /FPS/);
  assert.throws(() => createMotionSettings("idle", { durationSeconds: 20 }), /duration/);
});

test("job IDs and approval transitions are validated", () => {
  assert.equal(safeAiJobId("7b9f0c1a-2d3e-4f50-8a1b-1234567890ab"), true);
  assert.equal(safeAiJobId("../../etc/passwd"), false);
  assert.doesNotThrow(() => assertMotionTransition({ status: "video_review" }, "approve-video"));
  assert.throws(() => assertMotionTransition({ status: "generating" }, "approve-video"), /Invalid action/);
});
