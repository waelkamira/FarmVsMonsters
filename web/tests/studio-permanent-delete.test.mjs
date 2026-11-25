import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../app/api/studio/assets/route.js", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/studio/page.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");

test("Studio exposes permanent deletion for every asset type with an explicit confirmation dialog", () => {
  assert.match(page, /data-testid="studio-delete-asset"/);
  assert.match(page, /className="studio-delete-button" data-testid="studio-delete-asset"[^>]*onClick=\{\(\)=>setDeleteDialog\(a\)\}/);
  assert.doesNotMatch(page, /\(a\.type==="plant"\|\|a\.type==="monster"\)&&<button[^>]*studio-delete-button/);
  assert.match(page, /role="alertdialog"[^>]*aria-modal="true"/);
  assert.match(page, /تأكيد الحذف النهائي/);
  assert.match(page, /لا يمكن التراجع عن هذه العملية/);
  assert.match(page, /operation:"delete"/);
  assert.match(css, /\.studio-delete-button/);
  assert.match(css, /\.studio-delete-confirm/);
});

test("Permanent deletion is authenticated, dependency-guarded, and supported by local and GitHub storage", () => {
  assert.match(route, /if\(!authorized\(req\)\)return NextResponse\.json\(\{error:"Unauthorized\."\}/);
  assert.match(route, /"clone","delete"\]\./);
  assert.equal((route.match(/operation==="delete"/g) || []).length, 2);
  assert.match(route, /const dependents=getAssetDependents\(registry\.assets,id\)/);
  assert.match(route, /if\(dependents\.length\)return NextResponse\.json\(\{error:"لا يمكن حذف الأصل لأن أصولاً أخرى تعتمد عليه:/);
  assert.match(route, /assetPathStillUsed\(remaining,assetPath\)/);
  assert.match(route, /githubDeleteIfExists\(filePath/);
  assert.match(route, /if\(targetBranch!==storageBranch\)await githubDeleteIfExists/);
  assert.match(route, /githubPut\(REGISTRY_PATH,Buffer\.from\(JSON\.stringify\(\{\.\.\.registry,assets:remaining\}/);
  assert.match(route, /release\?\.state==="open"/);
  const localDelete = route.indexOf("await unlink(target)", route.indexOf("if(operation===" + '"delete"' + "){"));
  const localRegistrySave = route.indexOf("await saveLocalRegistry(registry)", localDelete);
  const githubDelete = route.indexOf("await githubDeleteIfExists(filePath");
  const githubRegistrySave = route.indexOf("await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify({...registry,assets:remaining}");
  assert.ok(localDelete >= 0 && localRegistrySave > localDelete, "local registry remains retryable until file cleanup finishes");
  assert.ok(githubDelete >= 0 && githubRegistrySave > githubDelete, "GitHub registry remains retryable until file cleanup finishes");
});

test("Deletion removes linked catalog entries and owned files without deleting shared paths", () => {
  assert.match(route, /PUBLISHED_CATALOG_PATH,"plants"/);
  assert.match(route, /PUBLISHED_MONSTER_CATALOG_PATH,"monsters"/);
  assert.match(route, /function assetOwnedPaths\(asset\)/);
  assert.match(route, /filter\(\(value\)=>typeof value==="string"&&safeAssetPath\(value\)\)/);
  assert.ok(route.includes('import {mkdir,readFile,writeFile,unlink} from "node:fs/promises"'));
  assert.match(route, /snapshot\?\.atlasMetadataPath/);
  assert.match(route, /snapshot\?\.atlas\?\.jsonPath/);
  assert.match(route, /asset\?\.audio\?\.path/);
  assert.match(route, /asset\?\.combat\?\.projectile\?\.path/);
  assert.match(route, /function assetPathStillUsed\(assets,assetPath\)/);
  assert.match(route, /function removeManifestAssetReferences\(manifest,assetPaths\)/);
  assert.match(route, /removeLocalAssetManifestReferences\(candidatePaths\)/);
  assert.match(route, /removeGithubAssetManifestReferences\(candidatePaths,token,storageBranch\)/);
  assert.match(route, /manifest\.assetCount=all\.length/);
  assert.match(route, /manifest\.totalBytes=all\.reduce/);
  assert.match(route, /Array\.isArray\(asset\?\.versions\)/);
});

test("Local permanent deletion never calls GitHub-only cleanup helpers", () => {
  const localStart = route.indexOf('if(driver!=="github"){', route.indexOf("export async function PATCH"));
  const githubStart = route.indexOf('const token=process.env.STUDIO_GITHUB_TOKEN,storageBranch=', localStart);
  assert.ok(localStart >= 0 && githubStart > localStart, "local and GitHub storage branches are distinct");
  const localBranch = route.slice(localStart, githubStart);
  assert.match(localBranch, /await removeLocalAssetManifestReferences\(candidatePaths\)/);
  assert.doesNotMatch(localBranch, /removeGithubAssetManifestReferences|targetBranch|storageBranch|\btoken\b/);
});


test("GitHub permanent deletion cleans hydration manifests on storage and game branches before deleting files", () => {
  const patchStart = route.indexOf("export async function PATCH");
  const githubStart = route.indexOf('const token=process.env.STUDIO_GITHUB_TOKEN,storageBranch=', patchStart);
  const deleteStart = route.indexOf('if(operation==="delete"){', githubStart);
  const fileDelete = route.indexOf("await githubDeleteIfExists(filePath", deleteStart);
  const registrySave = route.indexOf('await githubPut(REGISTRY_PATH,Buffer.from(JSON.stringify({...registry,assets:remaining}', deleteStart);
  assert.ok(githubStart > patchStart && deleteStart > githubStart, "GitHub delete branch is present");
  const githubDeleteBranch = route.slice(deleteStart, fileDelete);
  assert.match(githubDeleteBranch, /await removeGithubAssetManifestReferences\(candidatePaths,token,storageBranch\)/);
  assert.match(githubDeleteBranch, /if\(targetBranch!==storageBranch\)await removeGithubAssetManifestReferences\(candidatePaths,token,targetBranch\)/);
  assert.ok(fileDelete > deleteStart && registrySave > fileDelete, "manifest/catalog cleanup and file deletion happen before registry removal");
});


test("Permanent deletion reconciles both the asset manifest and asset audit in local and GitHub storage", () => {
  assert.match(route, /const ASSET_AUDIT_PATH="web\/public\/assets\/asset-audit\.json"/);
  assert.match(route, /function synchronizeAssetAudit\(audit,manifest\)/);
  assert.match(route, /await writeFile\(auditPath,JSON\.stringify\(audit,null,2\)/);
  assert.match(route, /githubGetDocument\(ASSET_AUDIT_PATH,token,branch\)/);
  assert.match(route, /reconcile asset audit after permanent deletion/);
});
