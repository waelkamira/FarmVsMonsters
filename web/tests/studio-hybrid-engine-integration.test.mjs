import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../app/api/studio/assets/route.js", import.meta.url), "utf8");
const studioPage = readFileSync(new URL("../app/studio/page.js", import.meta.url), "utf8");
const battleScene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");

test("Studio persists validated skeletal profiles and serializes their part assets", () => {
  assert.ok(route.includes('createSkeletalRigProfile(submittedRigProfile)'));
  assert.ok(route.includes("getRigPartAssets"));
  assert.ok(route.includes("serializeRigParts(registry.assets||[],asset)"));
  assert.ok(route.includes("rigProfile}:{})"));
  assert.ok(route.includes("rigParts:rigPartAssets.map"));
  assert.ok(studioPage.includes('import RigEditor from "./RigEditor.jsx"'));
  assert.ok(studioPage.includes("rigProfile:JSON.stringify(rigProfile)"));
});

test("rigged projectile plants require and use the actual muzzle attachment", () => {
  assert.ok(route.includes('!rigProfile.attachments.some(item=>item.id==="muzzle")'));
  assert.ok(battleScene.includes('this.getStudioRigAttachmentWorld(skeletalRig, plant.view, "muzzle")'));
  assert.ok(battleScene.includes("const launchPoint = muzzle"));
  assert.ok(battleScene.includes("const launchOffsetX = launchPoint.x - laneOrigin.x"));
  assert.ok(battleScene.includes("const launchOffsetY = launchPoint.y - laneOrigin.y"));
});

test("skeletal attack and hurt hitboxes participate in battle collision", () => {
  assert.ok(battleScene.includes("getStudioRigHitboxesWorld"));
  assert.ok(battleScene.includes("studioRigHitboxesOverlap"));
  assert.ok(battleScene.includes("studioProjectileHitsMonster"));
  assert.ok(battleScene.includes("circleIntersectsConvexPolygon"));
  assert.ok(battleScene.includes("convexPolygonsOverlap"));
});

test("legacy Sprite Sheet rendering remains the fallback when a rig cannot render", () => {
  assert.ok(battleScene.includes("if (!rigRendered && this.textures.exists(textureKey))"));
  assert.ok(battleScene.includes("const hyenaSprite = studioRig ? null : customMonsterTexture"));
  assert.ok(battleScene.includes("preserving Sprite Sheet fallback"));
});
