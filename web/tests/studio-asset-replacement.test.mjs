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

const studioStyles = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
const rosterPage = readFileSync(new URL("../app/studio/StageRosterManager.jsx", import.meta.url), "utf8");
const rosterStyles = readFileSync(new URL("../app/studio/stage-roster.css", import.meta.url), "utf8");

test("Studio asset library uses larger thumbnails and a horizontal responsive action toolbar", () => {
  assert.match(studioStyles, /grid-template-columns:176px minmax\(0,1fr\)!important/);
  assert.match(studioStyles, /flex-direction:row!important;flex-wrap:wrap!important/);
  assert.match(studioStyles, /height:auto!important;min-height:0!important/);
  assert.match(studioPage, /Number\(a\.frameCount\?\?\(\(Number\(a\.rows\)\|\|1\)\*\(Number\(a\.columns\)\|\|1\)\)\)>1/);
});

test("stage roster plant and monster thumbnails crop sprite sheets to frame zero", () => {
  assert.match(rosterPage, /BUILTIN_SHEETS/);
  assert.match(rosterPage, /backgroundPosition:"left top"/);
  assert.match(rosterPage, /frameCount>1/);
  assert.match(rosterStyles, /\.stage-roster-first-frame/);
});

test("Phaser uses first frame for all built-in seed icons and keeps one-frame Studio assets as images", () => {
  assert.match(battleScene, /"pineapple-level-1", "hazelnut-level-1"/);
  assert.match(battleScene, /studioPlantsByType\[type\]\.frameCount > 1/);
  assert.match(battleScene, /plant\.spriteSheet = Boolean\(plant\.spriteSheet && frameCount > 1\)/);
  assert.match(battleScene, /studioMonster\.spriteSheet/);
  assert.match(battleScene, /studioMonster\.frameCount > 1/);
});
