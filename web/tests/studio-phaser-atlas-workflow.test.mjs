import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/studio/page.js", import.meta.url), "utf8");
const route = await readFile(new URL("../app/api/studio/assets/route.js", import.meta.url), "utf8");
const battle = await readFile(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");

test("Studio offers both Sprite Sheet and Phaser Output folder import modes", () => {
  assert.match(page, /setUploadMode\("spritesheet"\)/);
  assert.match(page, /setUploadMode\("atlas"\)/);
  assert.match(page, /webkitdirectory/);
  assert.match(page, /atlasJsonFile/);
  assert.match(page, /form\.set\("atlasJsonFile",atlasJsonFile\)/);
});

test("Studio API validates and stores the PNG plus its matching Phaser JSON atlas", () => {
  assert.match(route, /validatePhaserAtlasDocument/);
  assert.match(route, /createImmutableAssetPath\(config\.folder,id\+"-atlas","\.json"/);
  assert.match(route, /jsonPath:"\/assets\/"+atlasJsonRelative/);
  assert.match(route, /Phaser Atlas JSON/);
  assert.match(route, /application\/json/);
});

test("Phaser queues Atlas texture and JSON together and registers named animation frames", () => {
  assert.match(battle, /this\.load\.atlas\("studio-plant-/);
  assert.match(battle, /this\.load\.atlas\("studio-monster-/);
  assert.match(battle, /frameNames\.map\(frame=>\(\{key:textureKey,frame\}\)\)/);
  assert.match(battle, /frameNames\.map\(frame=>\(\{key:monster\.textureKey,frame\}\)\)/);
});

test("Auto-Rig builder UI and manifest fields are absent from the permanent Studio workflow", () => {
  assert.doesNotMatch(page, /AutoRigBuilderPanel|rigBuildManifest|Auto-Rig/);
  assert.doesNotMatch(route, /autoRigBuilder|rigBuildManifest|analyzeAutoRigQuality/);
});
