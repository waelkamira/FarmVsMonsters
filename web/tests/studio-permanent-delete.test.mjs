import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createProductionAssetDeletionPlan,
  getAssetDependencyConflict,
  getAssetReleasePaths,
  requestProductionAssetDeletion,
  removeAssetManifestReferencesFromBranch
} from "../game/studio/assetDeletion.mjs";

const route = readFileSync(new URL("../app/api/studio/assets/route.js", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/studio/page.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");

const publishedAsset = (overrides = {}) => ({ id: "oak", type: "plant", status: "published", path: "/assets/plants/oak.png", ...overrides });

test("Studio exposes authenticated permanent deletion with a confirmation dialog", () => {
  assert.match(page, /data-testid="studio-delete-asset"/);
  assert.match(page, /role="alertdialog"[^>]*aria-modal="true"/);
  assert.match(page, /storage==="github"\?"\u0637\u0644\u0628 \u0625\u0632\u0627\u0644\u0629/);
  assert.match(page, /\u0633\u062a\u0628\u0642\u0649 \u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0625\u0646\u062a\u0627\u062c/);
  assert.match(page, /operation:"delete"/);
  assert.match(css, /\.studio-delete-button/);
  assert.match(css, /\.studio-delete-confirm/);
});

test("deletion checks stage references, asset dependents and shared owned paths", () => {
  assert.match(route, /getStageAssetReferences/);
  assert.match(route, /getAssetDependencyConflict\(registry\.assets,id\)/);
  assert.match(route, /assetPathStillUsed\(remaining,assetPath\)/);
  assert.match(route, /assetOwnedPaths\(asset\)/);
});

test("production deletion plan rejects stage references and dependent assets with HTTP 409", () => {
  const asset = publishedAsset();
  assert.throws(() => createProductionAssetDeletionPlan({
    registry: { assets: [asset] }, assetId: "oak",
    stageConfig: { stages: { "3": { plants: [{ id: "oak", enabled: false }] } } }
  }), { status: 409, message: /\u0627\u0644\u0645\u0631\u062d\u0644\u0629 3/ });
  const child = publishedAsset({ id: "oak-child", path: "/assets/plants/oak-child.png", dependencies: ["oak"] });
  const conflict = getAssetDependencyConflict([asset, child], "oak");
  assert.equal(conflict.status, 409);
  assert.match(conflict.message, /oak-child/);
  assert.throws(() => createProductionAssetDeletionPlan({
    registry: { assets: [asset, child] }, assetId: "oak", stageConfig: { stages: {} }
  }), { status: 409, message: /oak-child/ });
});

test("shared paths are retained while unshared deletion paths are included in the plan", () => {
  const asset = publishedAsset();
  const other = publishedAsset({ id: "other", path: asset.path });
  const plan = createProductionAssetDeletionPlan({ registry: { assets: [asset, other] }, assetId: "oak", stageConfig: { stages: {} } });
  assert.ok(plan.candidatePaths.includes(asset.path));
  assert.ok(!plan.removablePaths.includes(asset.path));
  const withThumbnail = publishedAsset({ thumbnailPath: "/assets/thumbnails/oak-thumb.png" });
  const thumbnailPlan = createProductionAssetDeletionPlan({ registry: { assets: [withThumbnail] }, assetId: "oak", stageConfig: { stages: {} } });
  assert.ok(thumbnailPlan.removablePaths.includes("/assets/thumbnails/oak-thumb.png"));
});

test("local deletion is idempotent and records a tombstone without requiring GitHub credentials", () => {
  const start = route.indexOf('if(driver!=="github"){', route.indexOf("export async function PATCH"));
  const end = route.indexOf("const token=process.env.STUDIO_GITHUB_TOKEN,targetBranch=", start);
  assert.ok(start >= 0 && end > start);
  const localBranch = route.slice(start, end);
  assert.match(localBranch, /alreadyDeleted:true/);
  assert.match(localBranch, /registry\.deletedAssetIds\.push/);
  assert.match(localBranch, /await removeLocalAssetManifestReferences\(candidatePaths\)/);
  assert.match(localBranch, /await unlink\(/);
  assert.match(localBranch, /await saveLocalRegistry\(registry\)/);
  assert.doesNotMatch(localBranch, /STUDIO_GITHUB_TOKEN|githubPut|githubGetBytes|fetch\(/);
});

test("production deletion cleans and records a PR request on its release branch only", async () => {
  const plan = createProductionAssetDeletionPlan({ registry: { assets: [publishedAsset()] }, assetId: "oak", stageConfig: { stages: {} } });
  const calls = [];
  const result = await requestProductionAssetDeletion({
    plan, baseBranch: "main",
    beginRelease: async (id, base) => { calls.push(["begin", id, base]); return { branch: "studio-release/remove-oak", pr: null }; },
    removeReleaseFiles: async (branch, deletionPlan) => calls.push(["cleanup", branch, deletionPlan.removablePaths]),
    finishRelease: async (release, _deletionPlan, base) => {
      calls.push(["finish", release.branch, base]);
      return { number: 765, url: "https://example.test/pr/765", branch: release.branch, state: "open", operation: "delete" };
    }
  });
  assert.deepEqual(calls, [
    ["begin", "oak", "main"],
    ["cleanup", "studio-release/remove-oak", ["/assets/plants/oak.png"]],
    ["finish", "studio-release/remove-oak", "main"]
  ]);
  assert.equal(result.operation, "delete-requested");
  assert.equal(result.finalized, false);
  assert.equal(result.releaseRequest.number, 765);
  assert.equal(plan.asset.status, "published");
  assert.match(route, /beginProductionRelease\(token,assetId,"delete",baseBranch,releaseAsset\)/);
  assert.match(route, /removeGithubAssetManifestReferences\(deletionPlan\.removablePaths,token,releaseBranch\)/);
  assert.match(route, /githubDeleteIfExists\("web\/public"\+assetPath,[\s\S]*?releaseBranch\)/);
  assert.doesNotMatch(route, /githubDeleteIfExists\([^\n]*targetBranch/);
});

test("production deletion retries reuse the existing PR and never finalize before merge", async () => {
  const plan = createProductionAssetDeletionPlan({ registry: { assets: [publishedAsset()] }, assetId: "oak", stageConfig: { stages: {} } });
  let createdPullRequests = 0;
  const result = await requestProductionAssetDeletion({
    plan, baseBranch: "main",
    beginRelease: async () => ({ branch: "studio-release/remove-oak", pr: { number: 765, state: "open" } }),
    removeReleaseFiles: async () => {},
    finishRelease: async (release) => {
      if (!release.pr) createdPullRequests += 1;
      return { number: release.pr.number, state: "open" };
    }
  });
  assert.equal(createdPullRequests, 0);
  assert.equal(result.finalized, false);
  assert.equal(result.releaseRequest.number, 765);
  const merged = await requestProductionAssetDeletion({
    plan, baseBranch: "main", beginRelease: async () => ({ completed: { number: 765, merged: true } }),
    removeReleaseFiles: async () => assert.fail("merged removal must not repeat cleanup"),
    finishRelease: async () => assert.fail("merged removal must not create another PR")
  });
  assert.equal(merged.finalized, true);
  assert.equal(merged.operation, "deleted");
});

test("PR creation failure does not mutate the source asset or report deletion success", async () => {
  const asset = publishedAsset();
  const plan = createProductionAssetDeletionPlan({ registry: { assets: [asset] }, assetId: "oak", stageConfig: { stages: {} } });
  await assert.rejects(requestProductionAssetDeletion({
    plan, baseBranch: "main", beginRelease: async () => ({ branch: "studio-release/remove-oak", pr: null }),
    removeReleaseFiles: async () => {}, finishRelease: async () => { throw new Error("GitHub PR creation failed"); }
  }), /GitHub PR creation failed/);
  assert.equal(asset.status, "published");
  assert.equal(plan.asset.status, "published");
});

test("Manifest and Audit cleanup reads and writes only the supplied PR branch", async () => {
  const branch = "studio-release/remove-oak";
  const docs = new Map([
    ["web/public/assets/asset-manifest.json", { sha: "m1", content: JSON.stringify({ assets: [{ url: "/assets/plants/oak.png", group: "plants", bytes: 8 }], assetCount: 1, totalBytes: 8 }) }],
    ["web/public/assets/asset-audit.json", { sha: "a1", content: JSON.stringify({ assetCount: 1, totalBytes: 8, groups: {}, largeFiles: [], spritesheets: [], exactDuplicates: [] }) }]
  ]);
  const writes = [];
  const result = await removeAssetManifestReferencesFromBranch({
    assetPaths: ["/assets/plants/oak.png"], branch,
    getDocument: async (file, ref) => { assert.equal(ref, branch); return docs.get(file); },
    putFile: async (file, bytes, _message, ref) => writes.push({ file, branch: ref, body: bytes.toString("utf8") })
  });
  assert.equal(result.changed, true);
  assert.deepEqual(writes.map(({ file, branch: ref }) => [file, ref]), [
    ["web/public/assets/asset-manifest.json", branch], ["web/public/assets/asset-audit.json", branch]
  ]);
  assert.equal(JSON.parse(writes[0].body).assetCount, 0);
  assert.equal(JSON.parse(writes[1].body).assetCount, 0);
  const retryWrites = [];
  const retry = await removeAssetManifestReferencesFromBranch({
    assetPaths: ["/assets/plants/oak.png"], branch,
    getDocument: async (file) => file.endsWith("asset-manifest.json") ? { content: writes[0].body, sha: "m2" } : { content: writes[1].body, sha: "a2" },
    putFile: async (...args) => retryWrites.push(args)
  });
  assert.equal(retry.changed, false);
  assert.equal(retryWrites.length, 0);
});

test("retry repairs Audit when Manifest cleanup committed before an Audit write failure", async () => {
  const branch = "studio-release/remove-oak";
  const docs = new Map([
    ["web/public/assets/asset-manifest.json", { sha: "m1", content: JSON.stringify({ assets: [{ url: "/assets/plants/oak.png", group: "plants", bytes: 8 }], assetCount: 1, totalBytes: 8 }, null, 2) + "\n" }],
    ["web/public/assets/asset-audit.json", { sha: "a1", content: JSON.stringify({ assetCount: 1, totalBytes: 8, groups: {}, largeFiles: [], spritesheets: [], exactDuplicates: [] }, null, 2) + "\n" }]
  ]);
  let auditFailure = true;
  await assert.rejects(removeAssetManifestReferencesFromBranch({
    assetPaths: ["/assets/plants/oak.png"], branch,
    getDocument: async (file) => docs.get(file),
    putFile: async (file, bytes, _message, ref, sha) => {
      assert.equal(ref, branch);
      if (file.endsWith("asset-audit.json") && auditFailure) { auditFailure = false; throw new Error("Audit write failed"); }
      docs.set(file, { sha: sha + "2", content: bytes.toString("utf8") });
    }
  }), /Audit write failed/);
  assert.equal(JSON.parse(docs.get("web/public/assets/asset-manifest.json").content).assetCount, 0);
  assert.equal(JSON.parse(docs.get("web/public/assets/asset-audit.json").content).assetCount, 1);
  const retryWrites = [];
  await removeAssetManifestReferencesFromBranch({
    assetPaths: ["/assets/plants/oak.png"], branch,
    getDocument: async (file) => docs.get(file),
    putFile: async (file, bytes, _message, ref) => retryWrites.push({ file, ref, content: bytes.toString("utf8") })
  });
  assert.deepEqual(retryWrites.map((item) => [item.file, item.ref]), [["web/public/assets/asset-audit.json", branch]]);
  assert.equal(JSON.parse(retryWrites[0].content).assetCount, 0);
});

test("deletion refuses to proceed when the release branch lacks Manifest or Audit", async () => {
  const writes = [];
  await assert.rejects(removeAssetManifestReferencesFromBranch({
    assetPaths: ["/assets/plants/oak.png"], branch: "studio-release/remove-oak",
    getDocument: async (file) => file.endsWith("asset-manifest.json") ? { sha: "m1", content: "{\"assets\":[]}" } : null,
    putFile: async (...args) => writes.push(args)
  }), /Manifest or Audit is unavailable/);
  assert.equal(writes.length, 0);
});

test("local and production paths remain separate, and Studio sync state stays visible", () => {
  const localStart = route.indexOf('if(driver!=="github"){', route.indexOf("export async function PATCH"));
  const githubStart = route.indexOf("const token=process.env.STUDIO_GITHUB_TOKEN,targetBranch=", localStart);
  assert.ok(localStart >= 0 && githubStart > localStart);
  assert.match(page, /studio-sync-state/);
  assert.match(page, /syncStates/);
  assert.match(css, /\.studio-sync-state/);
});

test("release path collection walks nested dependencies and fails closed on missing links", () => {
  const root = { id: "oak", type: "plant", status: "published", path: "/assets/plants/oak.png", dependencies: ["branch"] };
  const branch = { id: "branch", type: "rigPart", status: "published", path: "/assets/parts/branch.png", dependencies: ["leaf"] };
  const leaf = { id: "leaf", type: "rigPart", status: "published", path: "/assets/parts/leaf.png" };
  assert.deepEqual(getAssetReleasePaths([root, branch, leaf], root).sort(), [
    "/assets/parts/branch.png",
    "/assets/parts/leaf.png",
    "/assets/plants/oak.png"
  ]);
  assert.throws(() => getAssetReleasePaths([root, branch], root), /Missing required Studio dependency: leaf/);
});
