import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const apiSource = await readFile(new URL("../app/api/studio/assets/route.js", import.meta.url), "utf8");
const uiSource = await readFile(new URL("../app/studio/page.js", import.meta.url), "utf8");
const publishStart = apiSource.indexOf('if(operation!=="publish")');
const publishEnd = apiSource.indexOf('return NextResponse.json({success:true,operation:"publish-requested"', publishStart);
const publishSource = apiSource.slice(publishStart, publishEnd > publishStart ? publishEnd : undefined);

test("Studio publish creates an isolated release branch and pull request", () => {
  assert.match(apiSource, /createStudioReleaseBranchName/);
  assert.match(apiSource, /async function githubCreateBranch\(/);
  assert.match(apiSource, /async function githubCreatePullRequest\(/);
  assert.match(publishSource, /githubCreateBranch\(releaseBranch,targetBranch,token\)/);
  assert.match(publishSource, /githubCreatePullRequest\(/);
  assert.match(publishSource, /operation:"publish-requested"/);
  assert.doesNotMatch(publishSource, /Publish directly to the configured game branch/);
});

test("all release binaries are staged on the release branch, not directly on the game branch", () => {
  assert.match(publishSource, /sourceFiles\.set\(asset\.path/);
  assert.match(publishSource, /for\(const \[assetPath,bytes\] of sourceFiles\)/);
  assert.match(publishSource, /githubPutImmutable\("web\/public"\+assetPath,bytes,[^;]+releaseBranch\)/);
  assert.doesNotMatch(publishSource, /githubPutImmutable\([^\n]+targetBranch\)/);
});

test("release package includes linked projectile, rig dependencies, and runtime metadata", () => {
  assert.match(publishSource, /asset\.combat\.projectile\.path/);
  assert.match(publishSource, /rigPartAssets/);
  assert.match(publishSource, /rigProfile:asset\.rigProfile\|\|null/);
  assert.match(publishSource, /rigParts,/);
  assert.match(publishSource, /flipX:Boolean\(asset\.flipX\)/);
  assert.match(publishSource, /githubPut\(catalogPath,[\s\S]*?releaseBranch,catalogDocument\?\.sha/);
});

test("incomplete staging branches are cleaned up before a pull request is attempted", () => {
  assert.match(apiSource, /async function githubDeleteBranch\(/);
  assert.match(apiSource, /releaseBranchForCleanup=releaseBranch/);
  assert.match(apiSource, /releasePullRequestAttempted=true/);
  assert.match(apiSource, /if\(releaseBranchForCleanup&&!releasePullRequestAttempted\)/);
});

test("Studio UI describes review-based publishing and links the created pull request", () => {
  assert.match(uiSource, /طلب مراجعة النشر/);
  assert.match(uiSource, /d\.reviewUrl/);
  assert.match(uiSource, /لا يتغير فرع اللعبة إلا بعد مراجعة Pull Request ودمجه/);
  assert.doesNotMatch(uiSource, /تم النشر مباشرة في اللعبة/);
});

test("closed unmerged release requests are reconciled before the testing-state guard", () => {
  const requestIndex = publishSource.indexOf("if(asset.releaseRequest?.number)");
  const stateGuardIndex = publishSource.indexOf('if(asset.status!=="testing")');
  assert.ok(requestIndex >= 0 && stateGuardIndex > requestIndex);
});

test("archiving after a closed unmerged release returns the asset to testing before transition", () => {
  assert.match(apiSource, /candidate=\{\.\.\.asset,status:"testing",releaseRequest:null\}/);
});

test("permanent deletion cannot mutate the published game branch", () => {
  const patchStart = apiSource.indexOf("export async function PATCH");
  const firstDelete = apiSource.indexOf('if(operation==="delete"){', patchStart);
  const deleteStart = apiSource.indexOf('if(operation==="delete"){', firstDelete + 1);
  const deleteEnd = apiSource.indexOf('if(operation==="clone"){', deleteStart);
  const deleteSource = apiSource.slice(deleteStart, deleteEnd);
  assert.match(deleteSource, /asset\.status==="published"/);
  assert.match(deleteSource, /release\?\.merged/);
  assert.match(deleteSource, /collection\.some\(item=>item\.id===id\)/);
  assert.match(deleteSource, /isPublishedPathReferenced/);
  assert.doesNotMatch(deleteSource, /githubPut\(catalogPath/);
  assert.doesNotMatch(deleteSource, /githubDeleteIfExists\([^\n]+targetBranch/);
});

test("Studio storage cannot target the live game branch", () => {
  assert.match(apiSource, /if\(branch===targetBranch\)/);
  assert.match(apiSource, /if\(storageBranch===targetBranch\)/);
});
