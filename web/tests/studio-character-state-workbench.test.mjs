import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateCharacterStateAnimation, validateCharacterStateAnimations } from "../game/studio/characterStateAnimations.mjs";
import { applyStudioAssetFileAudit } from "../game/studio/assetReadiness.mjs";
import { cloneStudioAsset, createStudioAssetRevision, restoreStudioAssetRevision } from "../game/studio/assetVersions.mjs";
import { assetOwnedPaths, assetPathStillUsed } from "../game/studio/assetDeletion.mjs";

const validState = {
  stateId: "burn",
  path: "/assets/monsters/states/brute-burn-abc123.png",
  rows: 2,
  columns: 3,
  frameCount: 6,
  fps: 12,
  loop: true
};

test("character status animation validates supported state, safe path, grid, frame count and FPS", () => {
  const result = validateCharacterStateAnimation(validState);
  assert.equal(result.valid, true);
  assert.deepEqual(result.profile, { ...validState, spriteSheet: true });
});

test("character status animation rejects unknown states, unsafe paths and mismatched frame grids", () => {
  assert.equal(validateCharacterStateAnimation({ ...validState, stateId: "made-up" }).valid, false);
  assert.equal(validateCharacterStateAnimation({ ...validState, path: "/assets/../private.png" }).valid, false);
  assert.equal(validateCharacterStateAnimation({ ...validState, rows: 1 }).valid, false);
  assert.equal(validateCharacterStateAnimation({ ...validState, fps: 31 }).valid, false);
});

test("a character may retain multiple independent status animation sheets", () => {
  const states = {
    burn: validState,
    freeze: { ...validState, stateId: "freeze", path: "/assets/monsters/states/brute-freeze.png", fps: 9 }
  };
  assert.equal(validateCharacterStateAnimations(states).valid, true);
  assert.equal(validateCharacterStateAnimations({ ...states, broken: { ...validState, stateId: "broken" } }).valid, false);
});

test("status animation sheets are preserved by asset revisions, restore and clone", () => {
  const source = {
    id: "brute", type: "monster", path: "/assets/monsters/brute.png", revision: 1,
    stateAnimations: { burn: { ...validState } }
  };
  const edited = createStudioAssetRevision(source, { ...source, stateAnimations: { freeze: { ...validState, stateId: "freeze" } } });
  assert.deepEqual(edited.versions[0].stateAnimations, source.stateAnimations);
  const restored = restoreStudioAssetRevision(edited, 1);
  assert.deepEqual(restored.stateAnimations, source.stateAnimations);
  const cloned = cloneStudioAsset(source, "brute-copy");
  assert.deepEqual(cloned.stateAnimations, source.stateAnimations);
  cloned.stateAnimations.burn.fps = 2;
  assert.equal(source.stateAnimations.burn.fps, 12);
});

test("Studio exposes the workbench before effect assignment and persists status sheets through the authenticated upload route", () => {
  const details = readFileSync(new URL("../app/studio/assets/[id]/page.js", import.meta.url), "utf8");
  const workbench = readFileSync(new URL("../app/studio/CharacterStateWorkbench.jsx", import.meta.url), "utf8");
  const effectPreview = readFileSync(new URL("../game/vfx/effects/effectPreview.mjs", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/studio/assets/route.js", import.meta.url), "utf8");
  const battle = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");
  const deletion = readFileSync(new URL("../game/studio/assetDeletion.mjs", import.meta.url), "utf8");
  assert.match(details, /CharacterStateWorkbench/);
  assert.ok(details.indexOf("CharacterStateWorkbench") < details.indexOf("<EffectPicker"));
  assert.match(workbench, /CHARACTER_STATUS_STATES/);
  assert.match(workbench, /FramePreview/);
  assert.match(workbench, /الصفوف/);
  assert.match(workbench, /الأعمدة/);
  assert.match(workbench, /targetRenderer/);
  assert.match(workbench, /listEffects\(\{ appliesTo: asset\.type \}\)/);
  assert.match(effectPreview, /targetRenderer = null/);
  assert.match(workbench, /stateAnimationFile/);
  assert.match(route, /validateCharacterStateAnimation/);
  assert.match(route, /createImmutableAssetPath\(config\.folder\+"\/states"/);
  assert.ok(route.includes('githubPutImmutable("web/public/assets/"+stateRelative'));
  assert.match(route, /stateAnimations/);
  assert.match(route, /stateAnimations:asset\.stateAnimations\|\|\{\}/);
  assert.match(route, /publish \"\+stateId\+\" state frames for \"\+id/);
  assert.match(route, /addStatePreviewUrls/);
  assert.match(route, /Object\.values\(snapshot\?\.stateAnimations\|\|\{\}\)\.map\(state=>state\?\.path\)/);
  assert.match(battle, /queueCharacterStateTextures/);
  assert.match(battle, /registerCharacterStateAnimations/);
  assert.match(battle, /applyCharacterStateFromEffects/);
  assert.match(battle, /studioStatusOverlay/);
  assert.match(battle, /studioStatusRigRoot/);
  assert.match(battle, /studioCharacterBounds/);
  assert.match(battle, /rigRoot\.setVisible\(false\)/);
});

test("asset file audit checks every custom state sprite sheet path", () => {
  const report = {
    assets: [{
      id: "brute",
      readiness: "ready",
      errors: [],
      warnings: []
    }]
  };
  const audited = applyStudioAssetFileAudit(report, [{
    id: "brute",
    path: "/assets/monsters/brute.png",
    stateAnimations: { burn: { path: "/assets/monsters/states/brute-burn.png" } }
  }], {
    "/assets/monsters/brute.png": "present",
    "/assets/monsters/states/brute-burn.png": "missing"
  });
  assert.equal(audited.assets[0].readiness, "blocked");
  assert.ok(audited.assets[0].errors.some((message) => message.includes("brute-burn.png")));
  assert.equal(audited.fileAudit.checked, 2);
});


test("permanent deletion owns state sheets across all revisions and protects shared state paths", () => {\n  const asset = { id: "brute", path: "/assets/monsters/brute.png", stateAnimations: { burn: { path: "/assets/monsters/states/burn.png" } }, versions: [{ path: "/assets/monsters/old.png", stateAnimations: { freeze: { path: "/assets/monsters/states/freeze.png" } } }] };\n  assert.deepEqual(assetOwnedPaths(asset).sort(), ["/assets/monsters/brute.png", "/assets/monsters/old.png", "/assets/monsters/states/burn.png", "/assets/monsters/states/freeze.png"].sort());\n  assert.equal(assetPathStillUsed([{ id: "other", stateAnimations: { burn: { path: "/assets/monsters/states/burn.png" } } }], "/assets/monsters/states/burn.png"), true);\n  assert.equal(assetPathStillUsed([], "/assets/monsters/states/freeze.png"), false);\n});\n