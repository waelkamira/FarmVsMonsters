import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { getLocalGitStatus } from "../game/studio/localGitStatus.mjs";
import { getStudioStorageDriver, canWriteStudioStorage } from "../game/studio/storageDriver.mjs";
import { importManifestPlants } from "../game/studio/assetLibraryImport.mjs";
import { getStageAssetReferences } from "../game/studio/stageMonsterReferences.mjs";

const assetsRoute = readFileSync(new URL("../app/api/studio/assets/route.js", import.meta.url), "utf8");
const stageRoute = readFileSync(new URL("../app/api/studio/stage-encounters/route.js", import.meta.url), "utf8");
const testingRoute = readFileSync(new URL("../app/api/studio/testing/route.js", import.meta.url), "utf8");

test("development always uses local Studio storage even with a stale GitHub setting and token", () => {
  const env = { NODE_ENV: "development", STUDIO_STORAGE_DRIVER: "github", STUDIO_GITHUB_TOKEN: "configured" };
  assert.equal(getStudioStorageDriver(env), "local");
  assert.equal(canWriteStudioStorage(env), true);
});

test("production GitHub mode is readable but not directly writable", () => {
  const env = { NODE_ENV: "production", STUDIO_STORAGE_DRIVER: "local", STUDIO_GITHUB_TOKEN: "configured" };
  assert.equal(getStudioStorageDriver(env), "github");
  assert.equal(canWriteStudioStorage(env), false);
});

test("opening the asset library GET cannot write, hydrate, or sync files", () => {
  const start = assetsRoute.indexOf("export async function GET(req)");
  const end = assetsRoute.indexOf("export async function POST(req)", start);
  const get = assetsRoute.slice(start, end);
  assert.doesNotMatch(get, /hydratePlantLibrary|saveLocalRegistry|writeFile\(|githubPut\(|githubDelete/);
  assert.match(get, /const driver=getStudioStorageDriver\(\)/);
});

test("Studio GET reconciles finalized removals from the production tombstone registry", () => {
  const start = assetsRoute.indexOf("export async function GET(req)");
  const end = assetsRoute.indexOf("export async function POST(req)", start);
  const get = assetsRoute.slice(start, end);
  assert.match(get, /githubGetDocument\(REGISTRY_PATH,token,process\.env\.STUDIO_PUBLISH_BRANCH\|\|"main"\)/);
  assert.match(get, /if\(!productionDocument\)throw new Error\("Production Studio registry is unavailable/);
  assert.match(get, /applyProductionDeletionTombstones\(assets,productionRegistry\.deletedAssetIds\)/);
  assert.doesNotMatch(get, /githubPut\(|githubDeleteIfExists|saveLocalRegistry/);
});

test("manifest import is an explicit authenticated local-only operation", () => {
  const start = assetsRoute.indexOf('if(operation==="import-manifest")');
  const end = assetsRoute.indexOf('if(operation==="set-effects")', start);
  const action = assetsRoute.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(action, /if\s*\(!canWriteStudioStorage\(\)\)/);
  assert.match(action, /asset-manifest\.json/);
  assert.match(action, /importManifestPlants\(/);
  assert.match(action, /saveLocalRegistry\(result\.registry\)/);
  assert.doesNotMatch(action, /fetch\(|githubPut|STUDIO_GITHUB_TOKEN/);
});

test("manifest import adds only absent assets and preserves tombstoned and existing records", () => {
  const original = { id: "existing-plant", type: "plant", status: "testing", hp: 321, updatedAt: "kept" };
  const registry = { version: 1, assets: [original], deletedAssetIds: [{ id: "deleted-plant" }] };
  const manifest = { assets: [
    { url: "/assets/plants/existing-plant.png", group: "plants" },
    { url: "/assets/plants/deleted-plant.png", group: "plants" },
    { url: "/assets/plants/new-plant.png", group: "plants", frameCount: 4 }
  ] };
  const result = importManifestPlants(registry, manifest, { plants: [] }, "2026-11-27T00:00:00.000Z");
  assert.equal(result.imported, 1);
  assert.deepEqual(result.registry.assets[0], original);
  assert.equal(result.registry.assets.some((asset) => asset.id === "deleted-plant"), false);
  assert.equal(result.registry.assets.find((asset) => asset.id === "new-plant").status, "draft");
  const repeated = importManifestPlants(result.registry, manifest, { plants: [] }, "2026-11-28T00:00:00.000Z");
  assert.equal(repeated.imported, 0);
  assert.equal(repeated.registry.assets.length, result.registry.assets.length);
});

test("local asset uploads cannot reuse a tombstoned ID", () => {
  const start = assetsRoute.indexOf("export async function POST(req)");
  const end = assetsRoute.indexOf("export async function PATCH(req)", start);
  const post = assetsRoute.slice(start, end);
  assert.match(post, /findAssetDeletionTombstone\(old,id\)/);
  assert.match(post, /status:409/);
});

test("explicit import preserves real grouped Manifest Atlas and animation metadata", () => {
  const atlasAsset = {
    url: "/assets/plants/oak.png",
    group: "plants",
    type: "spritesheet",
    width: 3600,
    height: 150,
    bytes: 42000,
    sha256: "abc123",
    rows: 1,
    columns: 24,
    frameCount: 24,
    frameConfig: { frameWidth: 150, frameHeight: 150, margin: 0, spacing: 0 },
    atlasMetadataPath: "/assets/plants/oak.json",
    atlasClips: { idle: { startFrame: 0, endFrame: 7 }, attack: { startFrame: 8, endFrame: 17 }, hurt: { startFrame: 18, endFrame: 23 } },
    animationProfile: { idle: { startFrame: 0, endFrame: 7, fps: 8, loop: true }, attack: { startFrame: 8, endFrame: 17, fps: 12, loop: false } },
    customManifestMetadata: { license: "CC0", source: "fixture" }
  };
  const manifest = { version: 1, groups: { plants: [atlasAsset] }, assetCount: 1, totalBytes: 42000 };
  const result = importManifestPlants({ version: 1, assets: [] }, manifest, { plants: [] }, "2026-11-27T00:00:00.000Z");
  assert.equal(result.imported, 1);
  const imported = result.registry.assets[0];
  for (const key of ["width", "height", "bytes", "sha256", "frameConfig", "atlasMetadataPath", "atlasClips", "animationProfile", "customManifestMetadata"]) {
    assert.deepEqual(imported[key], atlasAsset[key], `${key} was preserved`);
  }
  assert.equal(imported.rows, 1);
  assert.equal(imported.columns, 24);
  assert.equal(imported.frameCount, 24);
  assert.equal(imported.spriteSheet, true);
  assert.equal(imported.status, "draft");
});

test("manifest import includes plants that exist only in the published catalog", () => {
  const result = importManifestPlants(
    { version: 1, assets: [] },
    { assets: [] },
    { plants: [{ id: "catalog-only-plant", name: "Catalog Only", path: "/assets/plants/catalog-only-plant.png" }] },
    "2026-11-27T00:00:00.000Z"
  );
  assert.equal(result.imported, 1);
  assert.equal(result.registry.assets[0].id, "catalog-only-plant");
  assert.equal(result.registry.assets[0].status, "published");
});

test("manifest import resolves hashed published paths and preserves tombstones", () => {
  const digest = "a".repeat(64);
  const publishedPath = "/assets/plants/oak-" + digest + ".png";
  const published = importManifestPlants(
    { version: 1, assets: [] },
    { assets: [{ url: publishedPath, group: "plants" }] },
    { plants: [{ id: "oak", name: "Oak", path: publishedPath, publishedAt: "2026-11-20T00:00:00.000Z" }] },
    "2026-11-27T00:00:00.000Z"
  );
  assert.equal(published.imported, 1);
  assert.equal(published.registry.assets[0].id, "oak");
  assert.equal(published.registry.assets[0].status, "published");

  const tombstoned = importManifestPlants(
    { version: 1, assets: [], deletedAssetIds: [{ id: "oak", path: publishedPath }] },
    { assets: [{ url: publishedPath, group: "plants" }] },
    { plants: [] },
    "2026-11-27T00:00:00.000Z"
  );
  assert.equal(tombstoned.imported, 0);
  assert.equal(tombstoned.registry.assets.length, 0);
  assert.equal(tombstoned.skippedDeleted, 1);
});

test("local effects and test preparation do not use GitHub operations", () => {
  const effectsStart = assetsRoute.indexOf("async function setAssetEffects");
  const effectsEnd = assetsRoute.indexOf("\n}", effectsStart);
  const effects = assetsRoute.slice(effectsStart, effectsEnd);
  const localBranchStart = assetsRoute.indexOf('if(driver!=="github"){', assetsRoute.indexOf("export async function PATCH(req)"));
  const localBranchEnd = assetsRoute.indexOf('const token=process.env.STUDIO_GITHUB_TOKEN,targetBranch=', localBranchStart);
  const localBranch = assetsRoute.slice(localBranchStart, localBranchEnd);
  assert.match(effects, /await saveLocalRegistry\(registry\)/);
  assert.match(localBranch, /operation==="prepare-test"/);
  assert.match(localBranch, /await access\(/);
  assert.doesNotMatch(localBranch, /fetch\(|githubPut|githubGetBytes/);
  assert.match(testingRoute, /const driver = getStudioStorageDriver\(\)/);
});

test("stage edits in production are rejected before any GitHub write path", () => {
  const start = stageRoute.indexOf("export async function PATCH(req)");
  const end = stageRoute.indexOf("\n}", start);
  const patch = stageRoute.slice(start, end);
  assert.match(patch, /if\(!canWriteStudioStorage\(\)\)return NextResponse\.json/);
  assert.match(patch, /await writeLocal\(config\)/);
  assert.doesNotMatch(patch, /writeGithub\(|https:\/\/api\.github\.com/);
});

test("stage reference checks cover both plant and monster rosters", () => {
  const references = getStageAssetReferences({ stages: {
    "1": { plants: [{ id: "oak", enabled: true }], monsters: [{ id: "cave-brute", wave: 2 }] }
  } }, "oak");
  assert.deepEqual(references.map((item) => [item.stageId, item.kind]), [["1", "plant"]]);
  assert.equal(getStageAssetReferences({ stages: { "1": { monsters: [{ id: "cave-brute", wave: 2 }] } } }, "cave-brute")[0].wave, 2);
});

test("production publish and delete use a release branch and PR before recording request state", () => {
  assert.match(assetsRoute, /githubCreateReleaseBranch/);
  assert.match(assetsRoute, /githubCreateReleasePullRequest/);
  assert.match(assetsRoute, /draft:true/);
  assert.match(assetsRoute, /githubMarkPullRequestReady/);
  assert.match(assetsRoute, /releaseAssetFingerprint/);
  assert.match(assetsRoute, /beginProductionRelease\(token,id,"publish",targetBranch,asset\)/);
  assert.match(assetsRoute, /for\(const assetPath of releasePaths\)[\s\S]*?githubPutImmutable\(filePath,bytes,[\s\S]*?releaseBranch\)/);
  assert.match(assetsRoute, /operation:"publish-requested"/);
  assert.match(assetsRoute, /published:false/);
  assert.match(assetsRoute, /writeProductionRegistryRelease\(token,pr\.branch/);
  assert.match(assetsRoute, /findAssetDeletionTombstone\(productionRegistry,id\)/);
  assert.match(assetsRoute, /if\(operation==="delete"&&deletionTombstone\)return NextResponse\.json/);
  assert.doesNotMatch(assetsRoute, /githubPutImmutable\(artworkPath,artworkBytes,[\s\S]{0,100}token,targetBranch\)/);
});

test("GitHub failures cannot mark a release successful and retries reuse the matching open PR", () => {
  const begin = assetsRoute.slice(assetsRoute.indexOf("async function beginProductionRelease"), assetsRoute.indexOf("async function writeProductionRegistryRelease"));
  const finish = assetsRoute.slice(assetsRoute.indexOf("async function finishProductionRelease"), assetsRoute.indexOf("async function writeProductionRegistryRelease"));
  assert.match(begin, /githubListReleasePullRequests/);
  assert.match(begin, /matches\.find\(\(item\)=>item\.state==="open"\)/);
  assert.match(assetsRoute, /for\(let page=1;page<=100;page\+\+\)/);
  assert.match(assetsRoute, /&per_page=100&page="\+page/);
  assert.match(assetsRoute, /GitHub release request lookup exceeded its safe pagination limit/);
  const createOffset = finish.indexOf("await githubCreateReleasePullRequest");
  const writeOffset = finish.indexOf("await writeProductionRegistryRelease");
  assert.ok(createOffset >= 0, "release PR creation must exist");
  assert.ok(writeOffset >= 0, "registry release write must exist");
  assert.ok(createOffset < writeOffset, "PR is created before registry state is staged on its head");
  assert.match(assetsRoute, /catch\(error\)\{return NextResponse\.json\(\{error:error\.message\|\|"Studio action failed\."\}/);
});

test("Studio local sync state is derived from read-only Git inspection, not fixed labels", () => {
  assert.match(assetsRoute, /getLocalGitStatus\(\)/);
  assert.match(assetsRoute, /syncStates:gitStatus\.syncStates/);
  assert.doesNotMatch(assetsRoute, /syncStates:\["Local changes","Not committed","Not synced"\]/);
  const page = readFileSync(new URL("../app/studio/page.js", import.meta.url), "utf8");
  for (const state of ["Local changes", "Not committed", "Not synced", "Production differs", "Published", "Conflict"]) {
    assert.ok(page.includes(state), `missing UI state ${state}`);
  }
});

test("local Git status reports real uncommitted changes without mutating the repository", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "fvm-studio-git-"));
  const run = (args) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
  try {
    run(["init", "-b", "main"]);
    run(["config", "user.email", "studio-test@example.invalid"]);
    run(["config", "user.name", "Studio Test"]);
    writeFileSync(path.join(root, "fixture.txt"), "initial" + String.fromCharCode(10));
    run(["add", "fixture.txt"]);
    run(["commit", "-m", "initial"]);
    const clean = await getLocalGitStatus({ cwd: root, env: { NODE_ENV: "development" } });
    assert.equal(clean.available, true);
    assert.equal(clean.branch, "main");
    assert.equal(clean.dirty, false);
    assert.ok(clean.syncStates.includes("Not synced"));
    writeFileSync(path.join(root, "fixture.txt"), "changed" + String.fromCharCode(10));
    const dirty = await getLocalGitStatus({ cwd: root, env: { NODE_ENV: "development" } });
    assert.equal(dirty.available, true);
    assert.equal(dirty.dirty, true);
    assert.ok(dirty.syncStates.includes("Local changes"));
    assert.ok(dirty.syncStates.includes("Not committed"));
    assert.deepEqual(dirty.changedFiles.map((item) => item.path), ["fixture.txt"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Git status reports the actual studio/assets versus main diff", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "fvm-studio-branches-"));
  const run = (args) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
  const output = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  try {
    run(["init", "-b", "main"]);
    run(["config", "user.email", "studio-test@example.invalid"]);
    run(["config", "user.name", "Studio Test"]);
    writeFileSync(path.join(root, "fixture.txt"), "base");
    run(["add", "fixture.txt"]);
    run(["commit", "-m", "base"]);
    const mainSha = output(["rev-parse", "HEAD"]);
    run(["update-ref", "refs/remotes/origin/main", mainSha]);
    writeFileSync(path.join(root, "fixture.txt"), "studio branch content");
    run(["add", "fixture.txt"]);
    run(["commit", "-m", "studio change"]);
    const studioSha = output(["rev-parse", "HEAD"]);
    run(["update-ref", "refs/remotes/origin/studio/assets", studioSha]);
    const status = await getLocalGitStatus({ cwd: root, env: { NODE_ENV: "development" } });
    assert.equal(status.productionDiffers, true);
    assert.equal(status.productionAhead, 0);
    assert.equal(status.productionBehind, 1);
    assert.deepEqual(status.productionChangedFiles.map((item) => item.path), ["fixture.txt"]);
    assert.ok(status.syncStates.includes("Production differs"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("production never invokes local Git inspection", async () => {
  const result = await getLocalGitStatus({ cwd: "/path/that/must/not/be/read", env: { NODE_ENV: "production" } });
  assert.equal(result.enabled, false);
  assert.equal(result.available, false);
  assert.deepEqual(result.syncStates, ["Production differs"]);
});

test("production deletion planning includes production-only shared assets", () => {
  assert.match(assetsRoute, /createProductionAssetDeletionPlan\(\{registry:deletionRegistry,assetId:id/);
});

test("publish rejects assets outside plant and monster catalogs", () => {
  const publishIndex = assetsRoute.indexOf('if(operation!=="publish")');
  const publishBranch = assetsRoute.slice(publishIndex, publishIndex + 500);
  assert.match(publishBranch, /asset\.type!=="plant"&&asset\.type!=="monster"/);
});

test("Studio source sync is local-only, authenticated, and uses Git pull/push", () => {
  const syncRoute = readFileSync(new URL("../app/api/studio/source-sync/route.js", import.meta.url), "utf8");
  const syncScript = readFileSync(new URL("../scripts/sync-studio-source-assets.mjs", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/studio/page.js", import.meta.url), "utf8");
  assert.match(syncRoute, /if\(!canWriteStudioStorage\(\)\)/);
  assert.match(syncRoute, /verifyStudioSession/);
  assert.ok(syncScript.includes('git(["pull", "--ff-only"]'));
  assert.ok(syncScript.includes('git(["push", "origin", "HEAD:refs/heads/" + sourceBranch]'));
  assert.match(page, /syncSourceAssets/);
  assert.match(page, /مزامنة الأصول المختبرة إلى studio\/assets/);
});

test("local test preparation rejects missing required references instead of filtering them out", () => {
  const start = assetsRoute.indexOf('if(operation==="prepare-test")');
  const end = assetsRoute.indexOf('if(operation==="delete")', start);
  const prepare = assetsRoute.slice(start, end);
  assert.match(prepare, /required\.some\(assetPath=>!safeAssetPath\(assetPath\)\)/);
  assert.doesNotMatch(prepare, /\.filter\(safeAssetPath\)/);
});

test("clean battlefield SVG hash, size, and manifest/audit totals are synchronized", () => {
  const svg = Buffer.from(readFileSync(new URL("../public/assets/backgrounds/farm-battlefield-clean.svg", import.meta.url), "utf8").replace(/\r\n/g, "\n"), "utf8");
  const manifest = JSON.parse(readFileSync(new URL("../public/assets/asset-manifest.json", import.meta.url), "utf8"));
  const audit = JSON.parse(readFileSync(new URL("../public/assets/asset-audit.json", import.meta.url), "utf8"));
  const expectedHash = createHash("sha256").update(svg).digest("hex");
  const entries = [
    ...(manifest.assets || []),
    ...Object.values(manifest.groups || {}).flat()
  ].filter((entry) => entry.url === "/assets/backgrounds/farm-battlefield-clean.svg");
  assert.equal(entries.length, 2);
  for (const entry of entries) {
    assert.equal(entry.bytes, svg.byteLength);
    assert.equal(entry.sha256, expectedHash);
  }
  assert.equal(manifest.totalBytes, audit.totalBytes);
  assert.equal(audit.groups.backgrounds.totalBytes, 75028 + 56081);
});

test("list-based release lookup treats merged_at as a merged pull request", () => {
  assert.match(assetsRoute, /merged:Boolean\(matched\.merged\|\|matched\.merged_at\),mergedAt:matched\.merged_at/);
});
