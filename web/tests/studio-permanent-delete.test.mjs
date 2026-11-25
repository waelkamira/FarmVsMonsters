import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../app/api/studio/assets/route.js", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/studio/page.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");

test("Studio exposes permanent deletion only for plants and monsters with an explicit confirmation dialog", () => {
  assert.match(page, /data-testid="studio-delete-asset"/);
  assert.match(page, /\(a\.type==="plant"\|\|a\.type==="monster"\)&&<button[^>]*studio-delete-button/);
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
});

test("Deletion removes linked catalog entries and owned files without deleting shared paths", () => {
  assert.match(route, /PUBLISHED_CATALOG_PATH,"plants"/);
  assert.match(route, /PUBLISHED_MONSTER_CATALOG_PATH,"monsters"/);
  assert.match(route, /function assetOwnedPaths\(asset\)/);
  assert.match(route, /import \{mkdir,readFile,writeFile,unlink\} from "node:fs\\/promises"/);
  assert.match(route, /asset\?\.atlas\?\.jsonPath/);
  assert.match(route, /asset\?\.audio\?\.path/);
  assert.match(route, /asset\?\.combat\?\.projectile\?\.path/);
  assert.match(route, /function assetPathStillUsed\(assets,assetPath\)/);
});
