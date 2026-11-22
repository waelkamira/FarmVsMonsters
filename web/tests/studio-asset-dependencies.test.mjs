import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildAssetDependencyReport, getAssetDependents } from "../game/studio/assetDependencies.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const routeSource = readFileSync(path.join(here, "../app/api/studio/assets/route.js"), "utf8");
const detailsSource = readFileSync(path.join(here, "../app/studio/assets/[id]/page.js"), "utf8");
const studioSource = readFileSync(path.join(here, "../app/studio/page.js"), "utf8");


test("explicit inline projectile remains an inline file even when its id matches a library projectile", () => {
  const assets = [
    { id: "thorn", type: "plant", path: "/assets/plants/thorn.png", combat: { projectile: { id: "thorn-shot", path: "/assets/projectiles/inline-shot.png", managed: false } } },
    { id: "thorn-shot", type: "plantProjectile", path: "/assets/projectiles/library-shot.png" }
  ];
  const report = buildAssetDependencyReport(assets, "thorn");
  assert.equal(report.dependencies[0].kind, "embedded-file");
  assert.equal(report.dependencies[0].resolved, true);
  assert.equal(report.sharedFiles.some((entry) => entry.path === "/assets/projectiles/inline-shot.png"), false);
  assert.equal(buildAssetDependencyReport(assets, "thorn-shot").dependents.length, 0);
});

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


test("does not resolve a managed projectile ID to an asset of the wrong type", () => {
  const assets = [
    { id: "thorn", type: "plant", path: "/assets/plants/thorn.png", combat: { projectile: { id: "wrong-type", path: "/assets/effects/wrong.png", managed: true } } },
    { id: "wrong-type", type: "monster", path: "/assets/monsters/wrong.png" }
  ];
  const report = buildAssetDependencyReport(assets, "thorn");
  assert.equal(report.dependencies[0].kind, "asset");
  assert.equal(report.dependencies[0].resolved, false);
  assert.equal(report.unresolved.length, 1);
});


test("legacy projectile IDs that collide with non-projectile assets remain embedded", () => {
  const assets = [
    { id: "thorn", type: "plant", path: "/assets/plants/thorn.png", combat: { projectile: { id: "collision", path: "/assets/projectiles/inline.png" } } },
    { id: "collision", type: "monster", path: "/assets/monsters/collision.png" }
  ];
  const report = buildAssetDependencyReport(assets, "thorn");
  assert.equal(report.dependencies[0].kind, "embedded-file");
  assert.equal(report.dependencies[0].resolved, true);
  assert.equal(report.dependents.length, 0);
});

test("reports a missing managed projectile asset as an unresolved dependency", () => {
  const assets = [{ id: "thorn", type: "plant", path: "/assets/plants/thorn.png", combat: { projectile: { id: "missing-shot", path: "/assets/projectiles/missing-shot.png", managed: true } } }];
  const report = buildAssetDependencyReport(assets, "thorn");
  assert.equal(report.dependencies[0].kind, "asset");
  assert.equal(report.dependencies[0].resolved, false);
  assert.equal(report.unresolved.length, 1);
});
test("resolves an explicitly managed projectile reference to its library asset", () => {
  const assets = [
    { id: "thorn", type: "plant", path: "/assets/plants/thorn.png", combat: { projectile: { id: "thorn-shot", path: "/assets/projectiles/thorn-shot.png", managed: true } } },
    { id: "thorn-shot", type: "plantProjectile", name: "Thorn Shot", path: "/assets/projectiles/thorn-shot.png" }
  ];
  const report = buildAssetDependencyReport(assets, "thorn-shot");
  assert.deepEqual(report.dependents.map((item) => item.assetId), ["thorn"]);
  assert.equal(report.canArchive, false);
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

test("does not advertise archive for assets with an open release request", () => {
  const assets = [{ id: "released", type: "plant", path: "/assets/plants/released.png", status: "testing", releaseRequest: { number: 42 } }];
  const report = buildAssetDependencyReport(assets, "released");
  assert.equal(report.canArchive, false);
});
test("reports unresolved explicit dependencies and missing assets", () => {
  const assets = [{ id: "tower", type: "plant", path: "/assets/plants/tower.png", dependencies: [{ id: "unknown-effect", relation: "impact-effect" }] }];
  const report = buildAssetDependencyReport(assets, "tower");
  assert.equal(report.dependencies[0].resolved, false);
  assert.equal(report.unresolved.length, 1);
});

test("Studio API guards replacement, archive and version restore when direct dependents exist", () => {
  assert.match(routeSource, /getAssetDependents\(old\.assets,id\)/);
  assert.match(routeSource, /getAssetDependents\(registry\.assets,id\)/);
  assert.match(routeSource, /dependents\.length\)return NextResponse\.json/);
  const githubRestoreStart = routeSource.indexOf('if(operation==="restore-version"){', routeSource.indexOf("const token=process.env.STUDIO_GITHUB_TOKEN"));
  const githubRestoreGuard = routeSource.indexOf("getAssetDependents(registry.assets,id)", githubRestoreStart);
  const githubRestoreAction = routeSource.indexOf("restoreStudioAssetRevision(", githubRestoreStart);
  assert.ok(githubRestoreStart >= 0 && githubRestoreGuard > githubRestoreStart && githubRestoreGuard < githubRestoreAction, "GitHub restore must check reverse dependencies before restoring");
});

test("asset detail route imports the shared Studio stylesheet from the correct directory", () => {
  assert.match(detailsSource, /import "\.\.\/\.\.\/studio\.css"/);
  assert.match(detailsSource, /combat\.projectile\.managed/);
});

test("plant projectile references resolve to a managed projectile asset and block destructive lifecycle operations", () => {
  assert.match(studioSource, /studio-projectile-library/);
  assert.match(studioSource, /projectileAssetId/);
  assert.match(routeSource, /selectedProjectileAsset=projectileAssetId/);
  assert.match(routeSource, /id:selectedProjectileAsset\.id/);
  assert.match(routeSource, /getAssetDependents/);
  assert.match(routeSource, /managed:true/);
  assert.match(routeSource, /managed:false/);
  assert.match(routeSource, /managed:old\.assets\.some/);
});

test("allows archive analysis after a merged release request has been cleared from the workflow", () => {
  const assets = [{ id: "draft-after-release", type: "plant", path: "/assets/plants/draft.png", status: "draft", releaseRequest: { number: 123, state: "merged" } }];
  assert.equal(buildAssetDependencyReport(assets, "draft-after-release").canArchive, true);
});

test("rig part references are reported as dependencies and block source-part archival", () => {
  const assets = [
    { id: "plant", type: "plant", path: "/assets/plants/plant.png", rigProfile: { bones: [{ id: "head", part: { assetId: "head-part", frame: 0 } }] } },
    { id: "head-part", type: "item", name: "Head Part", path: "/assets/parts/head.png" }
  ];
  const report = buildAssetDependencyReport(assets, "plant");
  assert.equal(report.dependencies.length, 1);
  assert.equal(report.dependencies[0].relation, "rig-part");
  assert.equal(report.dependencies[0].targetId, "head-part");
  assert.equal(buildAssetDependencyReport(assets, "head-part").canArchive, false);
});

test("Studio asset API validates and publishes the rig profile with plant and monster catalogs", () => {
  assert.match(routeSource, /createSkeletalRigProfile/);
  assert.match(routeSource, /form\.get\("rigProfile"\)/);
  assert.match(routeSource, /rigProfile:asset\.rigProfile\|\|null/);
});
