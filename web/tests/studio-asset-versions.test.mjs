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
  const current = { id: "radish", type: "plant", name: "Radish v3", path: "/assets/plants/radish-v3.png", revision: 3, status: "published", versions: [{ versionNumber: 1, savedAt: "2026-11-19T10:00:00.000Z", name: "Radish v1", filename: "radish.png", path: "/assets/plants/radish-v1.png", rows: 3, columns: 3, spriteSheet: true, combat: { mode: "melee" } }, { versionNumber: 2, savedAt: "2026-11-20T10:00:00.000Z", name: "Radish v2", filename: "radish.png", path: "/assets/plants/radish-v2.png", rows: 3, columns: 3, spriteSheet: true, combat: { mode: "projectile" } }] };
  const restored = restoreStudioAssetRevision(current, 1, "2026-11-21T12:00:00.000Z");
  assert.equal(restored.name, "Radish v1");
  assert.equal(restored.path, "/assets/plants/radish-v1.png");
  assert.equal(restored.revision, 4);
  assert.equal(restored.status, "draft");
  assert.equal(restored.restoredFromVersion, 1);
  assert.equal(restored.versions.length, 3);
  assert.equal(restored.versions[2].versionNumber, 3);
  assert.equal(restored.releaseRequest, null);
});

test("rejects a version number that is not in the asset history", () => {
  assert.throws(() => restoreStudioAssetRevision({ id: "radish", revision: 2, versions: [] }, 1), /الإصدار المطلوب غير موجود/);
});

test("clones any registered asset as a clean draft while preserving its immutable source path", () => {
  const source = { id: "fire-pepper", type: "plant", name: "Fire Pepper", path: "/assets/plants/fire-pepper-v1.png", revision: 4, versions: [{ versionNumber: 3 }], status: "published", releaseRequest: { number: 12 }, combat: { mode: "projectile", projectile: { id: "fire-pepper-projectile", path: "/assets/projectiles/fire-pepper.png" } } };
  const clone = cloneStudioAsset(source, "ice-pepper", "Ice Pepper", "2026-11-21T15:00:00.000Z");
  assert.equal(clone.id, "ice-pepper");
  assert.equal(clone.name, "Ice Pepper");
  assert.equal(clone.path, source.path);
  assert.deepEqual(clone.combat, source.combat);
  assert.notEqual(clone.combat, source.combat);
  assert.equal(clone.revision, 1);
  assert.deepEqual(clone.versions, []);
  assert.equal(clone.status, "draft");
  assert.equal(clone.releaseRequest, null);
  assert.equal(clone.clonedFrom, "fire-pepper");
  assert.throws(() => cloneStudioAsset(source, "../main"), /معرّف النسخة/);
});
