import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveSpriteThumbnailGrid } from "../game/studio/spriteSheetGrid.mjs";

const studioPage = readFileSync(new URL("../app/studio/page.js", import.meta.url), "utf8");
const assetRoute = readFileSync(new URL("../app/api/studio/assets/route.js", import.meta.url), "utf8");
const battleScene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");

test("asset library falls back to a real grid when legacy sprite metadata is incomplete", () => {
  assert.deepEqual(resolveSpriteThumbnailGrid(9, 1, 1), { rows: 3, columns: 3 });
  assert.deepEqual(resolveSpriteThumbnailGrid(6, 2, 3), { rows: 2, columns: 3 });
});

test("editing submits the selected asset ID and requires a replacement response", () => {
  assert.match(studioPage, /const targetAsset=editingAsset;const wasReplacing=Boolean\(targetAsset\);const targetId=targetAsset\?\.id\|\|id/);
  assert.match(studioPage, /id:targetId/);
  assert.match(studioPage, /replace:String\(wasReplacing\)/);
  assert.match(studioPage, /d\.operation!==\"replaced\"\|\|d\.asset\?\.id!==targetId/);
});

test("server replacement updates the existing registry slot rather than appending a second asset", () => {
  assert.match(assetRoute, /const index=old\.assets\.findIndex\(a=>a\.id===id\)/);
  assert.match(assetRoute, /existing\?old\.assets\.map\(\(a,i\)=>i===index\?record:a\):\[\.\.\.old\.assets,record\]/);
});

test("Phaser clears cached Studio images and animations before reloading replacement assets", () => {
  assert.match(battleScene, /const clearStudioTexture = \(key\) => \{\s*if \(this\.textures\.exists\(key\)\) this\.textures\.remove\(key\);/);
  assert.match(battleScene, /clearStudioAnimation\(\"studio-\" \+ entry\.id \+ \"-idle\"\)/);
  assert.match(battleScene, /clearStudioAnimation\(\"studio-monster-\" \+ entry\.id \+ \"-idle\"\)/);
});
