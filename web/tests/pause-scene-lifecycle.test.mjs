import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { claimPauseSceneTransition } from "../game/services/pauseSceneLifecycle.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pauseScene = readFileSync(resolve(here, "../game/scenes/PauseScene.js"), "utf8");

test("a pause scene can claim only one queued resume or restart transition", () => {
  const scene = {};
  assert.equal(claimPauseSceneTransition(scene), true);
  assert.equal(claimPauseSceneTransition(scene), false);
  assert.equal(scene.pauseTransitioning, true);
});

test("transition locks are isolated per scene instance and reset for a new launch", () => {
  const firstScene = { pauseTransitioning: true };
  const secondScene = {};
  assert.equal(claimPauseSceneTransition(firstScene), false);
  assert.equal(claimPauseSceneTransition(secondScene), true);
  firstScene.pauseTransitioning = false;
  assert.equal(claimPauseSceneTransition(firstScene), true);
});

test("missing scene references cannot claim a transition", () => {
  assert.equal(claimPauseSceneTransition(null), false);
  assert.equal(claimPauseSceneTransition(undefined), false);
});

test("resume and restart claim the transition before queuing Phaser scene operations", () => {
  const resume = pauseScene.slice(pauseScene.indexOf("  resumeBattle() {"), pauseScene.indexOf("  restartBattle() {"));
  const restart = pauseScene.slice(pauseScene.indexOf("  restartBattle() {"));
  assert.ok(resume.indexOf("claimPauseSceneTransition(this)") >= 0);
  assert.ok(resume.indexOf("claimPauseSceneTransition(this)") < resume.indexOf("this.scene.stop()"));
  assert.ok(restart.indexOf("claimPauseSceneTransition(this)") >= 0);
  assert.ok(restart.indexOf("claimPauseSceneTransition(this)") < restart.indexOf("battle.scene.stop()"));
  assert.match(pauseScene, /this\.pauseTransitioning = false;/);
});
