import test from "node:test";
import assert from "node:assert/strict";
import { cloneStudioAsset, createStudioAssetRevision, restoreStudioAssetRevision } from "../game/studio/assetVersions.mjs";

test("starts a new asset at revision one", () => {
  const created = createStudioAssetRevision(null, { id: "radish", type: "plant", path: "/assets/plants/radish-a.png" });
  assert.equal(created.revision, 1);
  assert.deepEqual(created.versions, []);
});

test("preserves the previous metadata and immutable asset path when editing", () => {
  const existing = { id: "radish", type: "plant", name: "Radish", path: "/assets/plants/radish-old.png", revision: 1, createdAt: "2026-11-20T10:00:00.000Z", updatedAt: "2026-11-20T11:00:00.000Z", combat: { mode: "projectile", projectile: { path: "/assets/projectiles/radish-old.png" } } };
  const updated = createStudioAssetRevision(existing, { ...existing, name: "Radish Improved", path: "/assets/plants/radish-new.png", updatedAt: "2026-11-21T10:00:00.000Z", status: "draft" });
  assert.equal(updated.revision, 2);
  assert.equal(updated.versions.length, 1);
  assert.equal(updated.versions[0].versionNumber, 1);
  assert.equal(updated.versions[0].path, "/assets/plants/radish-old.png");
  assert.equal(updated.versions[0].combat.projectile.path, "/assets/projectiles/radish-old.png");
});

test("restores an older version as a new draft revision without deleting history", () => {
  const current = { id: "radish", type: "plant", name: "Radish v3", path: "/assets/plants/radish-v3.png", revision: 3, status: "published", publishedAt: "2026-11-20T12:00:00.000Z", testingAt: "2026-11-20T11:00:00.000Z", versions: [{ versionNumber: 1, savedAt: "2026-11-19T10:00:00.000Z", name: "Radish v1", filename: "radish.png", path: "/assets/plants/radish-v1.png", rows: 3, columns: 3, spriteSheet: true, combat: { mode: "melee" } }, { versionNumber: 2, savedAt: "2026-11-20T10:00:00.000Z", name: "Radish v2", filename: "radish.png", path: "/assets/plants/radish-v2.png", rows: 3, columns: 3, spriteSheet: true, combat: { mode: "projectile" } }] };
  const restored = restoreStudioAssetRevision(current, 1, "2026-11-21T12:00:00.000Z");
  assert.equal(restored.name, "Radish v1");
  assert.equal(restored.path, "/assets/plants/radish-v1.png");
  assert.equal(restored.revision, 4);
  assert.equal(restored.status, "draft");
  assert.equal(restored.restoredFromVersion, 1);
  assert.equal(restored.versions.length, 3);
  assert.equal(restored.versions[2].versionNumber, 3);
  assert.equal(restored.releaseRequest, null);
  assert.equal(restored.publishedAt, null);
  assert.equal(restored.testingAt, null);
});

test("rejects a version number that is not in the asset history", () => {
  assert.throws(() => restoreStudioAssetRevision({ id: "radish", revision: 2, versions: [] }, 1), /الإصدار المطلوب غير موجود/);
});

test("clones any registered asset as a clean draft while preserving its immutable source path", () => {
  const source = { id: "fire-pepper", type: "plant", name: "Fire Pepper", path: "/assets/plants/fire-pepper-v1.png", revision: 4, versions: [{ versionNumber: 3 }], status: "published", releaseRequest: { number: 12 }, combat: { mode: "projectile", projectile: { id: "fire-pepper-projectile", path: "/assets/projectiles/fire-pepper.png" } }, animationProfile: { idle: { startFrame: 0, endFrame: 2, fps: 6, loop: true }, attack: { startFrame: 3, endFrame: 8, fps: 12, loop: false } }, monsterProfile: { baseArchetype: "monster-01", hpMultiplier: 1.5 }, dependencies: [{ id: "fire-pepper-projectile" }] };
  const clone = cloneStudioAsset(source, "ice-pepper", "Ice Pepper", "2026-11-21T15:00:00.000Z");
  assert.equal(clone.id, "ice-pepper");
  assert.equal(clone.name, "Ice Pepper");
  assert.equal(cloneStudioAsset(source, "ice-pepper").name, "Fire Pepper (نسخة)");
  assert.equal(cloneStudioAsset(source, "ice-pepper", "   ").name, "ice-pepper");
  assert.equal(clone.path, source.path);
  assert.deepEqual(clone.combat, source.combat);
  assert.notEqual(clone.combat, source.combat);
  assert.deepEqual(clone.animationProfile, source.animationProfile);
  assert.notEqual(clone.animationProfile, source.animationProfile);
  assert.deepEqual(clone.monsterProfile, source.monsterProfile);
  assert.notEqual(clone.monsterProfile, source.monsterProfile);
  assert.deepEqual(clone.dependencies, source.dependencies);
  clone.animationProfile.idle.startFrame = 1;
  clone.monsterProfile.hpMultiplier = 2;
  assert.equal(source.animationProfile.idle.startFrame, 0);
  assert.equal(source.monsterProfile.hpMultiplier, 1.5);
  assert.equal(clone.revision, 1);
  assert.deepEqual(clone.versions, []);
  assert.equal(clone.status, "draft");
  assert.equal(clone.releaseRequest, null);
  assert.equal(clone.clonedFrom, "fire-pepper");
  assert.throws(() => cloneStudioAsset(source, "../main"), /معرّف النسخة/);
});

test("version snapshots and restore preserve independent animation and monster profiles", () => {
  const source = {
    id: "studio-brute", type: "monster", name: "Studio Brute", path: "/assets/monsters/brute-v1.png",
    revision: 1, createdAt: "2026-11-20T10:00:00.000Z", updatedAt: "2026-11-20T11:00:00.000Z",
    animationProfile: {
      idle: { startFrame: 0, endFrame: 1, fps: 6, loop: true },
      move: { startFrame: 2, endFrame: 5, fps: 10, loop: true },
      attack: { startFrame: 6, endFrame: 8, fps: 14, loop: false }
    },
    monsterProfile: { baseArchetype: "monster-01", hpMultiplier: 1.4, spawnWeight: 20, firstWave: 3 },
    dependencies: [{ id: "brute-impact", relation: "impact-effect" }]
  };
  const edited = createStudioAssetRevision(source, {
    ...source,
    revision: 2,
    animationProfile: { ...source.animationProfile, attack: { startFrame: 1, endFrame: 2, fps: 8, loop: false } },
    monsterProfile: { ...source.monsterProfile, hpMultiplier: 2.2 },
    updatedAt: "2026-11-21T10:00:00.000Z"
  });
  assert.deepEqual(edited.versions[0].animationProfile, source.animationProfile);
  assert.deepEqual(edited.versions[0].monsterProfile, source.monsterProfile);
  assert.deepEqual(edited.versions[0].dependencies, source.dependencies);
  const restored = restoreStudioAssetRevision(edited, 1, "2026-11-21T12:00:00.000Z");
  assert.deepEqual(restored.animationProfile, source.animationProfile);
  assert.deepEqual(restored.monsterProfile, source.monsterProfile);
  assert.deepEqual(restored.dependencies, source.dependencies);
  restored.animationProfile.attack.startFrame = 2;
  restored.monsterProfile.hpMultiplier = 3;
  assert.equal(edited.versions[0].animationProfile.attack.startFrame, 6);
  assert.equal(edited.versions[0].monsterProfile.hpMultiplier, 1.4);
});

test("editing a previously published asset resets release timestamps on the new draft", () => {
  const existing = {
    id: "released-plant", type: "plant", path: "/assets/plants/released.png", revision: 2,
    status: "published", publishedAt: "2026-11-20T12:00:00.000Z", testingAt: "2026-11-20T11:00:00.000Z",
    archivedAt: null, restoredFromVersion: 1
  };
  const updated = createStudioAssetRevision(existing, { ...existing, status: "draft", publishedAt: null, testingAt: null, archivedAt: null, restoredFromVersion: null });
  assert.equal(updated.status, "draft");
  assert.equal(updated.publishedAt, null);
  assert.equal(updated.testingAt, null);
  assert.equal(updated.restoredFromVersion, null);
});

test("clone, revision snapshots, and restore preserve independent skeletal rig profiles", () => {
  const source = {
    id: "rigged-plant", type: "plant", path: "/assets/plants/rigged.png", revision: 1,
    rigProfile: {
      version: 1, canvas: { width: 200, height: 200 },
      bones: [{ id: "root", parentId: null, x: 0, y: 0 }, { id: "head", parentId: "root", x: 10, y: 0, part: { assetId: "head-part", frame: 0 } }],
      attachments: [{ id: "muzzle", boneId: "head", x: 8, y: 0 }],
      hitboxes: [], clips: []
    }
  };
  const clone = cloneStudioAsset(source, "rigged-plant-copy");
  assert.deepEqual(clone.rigProfile, source.rigProfile);
  assert.notEqual(clone.rigProfile, source.rigProfile);
  clone.rigProfile.bones[1].x = 99;
  assert.equal(source.rigProfile.bones[1].x, 10);

  const edited = createStudioAssetRevision(source, {
    ...source,
    rigProfile: { ...source.rigProfile, bones: source.rigProfile.bones.map((bone) => ({ ...bone, x: bone.x + 5 })) }
  });
  assert.deepEqual(edited.versions[0].rigProfile, source.rigProfile);
  const restored = restoreStudioAssetRevision(edited, 1);
  assert.deepEqual(restored.rigProfile, source.rigProfile);
  restored.rigProfile.bones[1].x = 50;
  assert.equal(edited.versions[0].rigProfile.bones[1].x, 10);
});
