import test from "node:test";
import assert from "node:assert/strict";
import { buildAssetDependencyReport, getAssetDependents } from "../game/studio/assetDependencies.mjs";

test("reports registered projectile assets as explicit dependencies and reverse references", () => {
  const assets = [
    { id: "fire", type: "plant", name: "Fire", path: "/assets/plants/fire.png", combat: { projectile: { id: "fire-shot", path: "/assets/projectiles/fire-shot.png" } } },
    { id: "fire-shot", type: "plantProjectile", name: "Fire Shot", path: "/assets/projectiles/fire-shot.png", status: "draft" }
  ];
  const report = buildAssetDependencyReport(assets, "fire-shot");
  assert.equal(report.dependencies.length, 0);
  assert.deepEqual(report.dependents.map((item) => item.assetId), ["fire"]);
  assert.equal(report.canArchive, false);
  assert.deepEqual(getAssetDependents(assets, "fire-shot").map((item) => item.assetId), ["fire"]);
});
test("reports inline projectile files without falsely treating them as missing", () => {
  const assets = [{ id: "bamboo", type: "plant", path: "/assets/plants/bamboo.png", combat: { projectile: { id: "bamboo-projectile", path: "/assets/projectiles/bamboo-shot.png" } } }];
  const report = buildAssetDependencyReport(assets, "bamboo");
  assert.equal(report.dependencies[0].kind, "embedded-file");
  assert.equal(report.dependencies[0].resolved, true);
  assert.equal(report.unresolved.length, 0);
});
test("detects shared immutable files between cloned assets without blocking safe replacement", () => {
  const assets = [
    { id: "pepper", type: "plant", path: "/assets/plants/pepper-v1.png", status: "draft" },
    { id: "pepper-copy", type: "plant", path: "/assets/plants/pepper-v1.png", status: "draft", clonedFrom: "pepper" }
  ];
  const report = buildAssetDependencyReport(assets, "pepper");
  assert.equal(report.sharedFiles.length, 1);
  assert.equal(report.sharedFiles[0].usedBy[0].assetId, "pepper-copy");
  assert.equal(report.canReplace, true);
  assert.match(report.warnings[0], /ينشئ مساراً جديداً/);
});
test("reports unresolved explicit dependencies and missing assets", () => {
  const assets = [{ id: "tower", type: "plant", path: "/assets/plants/tower.png", dependencies: [{ id: "unknown-effect", relation: "impact-effect" }] }];
  const report = buildAssetDependencyReport(assets, "tower");
  assert.equal(report.dependencies[0].resolved, false);
  assert.equal(report.unresolved.length, 1);
});
