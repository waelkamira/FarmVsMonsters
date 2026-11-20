import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const here = new URL(".", import.meta.url);
const read = (relative) => readFileSync(new URL(relative, here), "utf8");
const studioPage = read("../app/studio/page.js");
const assetsRoute = read("../app/api/studio/assets/route.js");
const battleScene = read("../game/scenes/BattleScene.js");
const selector = read("../app/stage/1/select/page.js");
const syncScript = read("../scripts/sync-studio-test-assets.mjs");

test("Studio requires manual behavior selection and only links a projectile in projectile mode", () => {
  assert.match(studioPage, /projectileFile/);
  assert.match(studioPage, /required value=\{behavior\}/);
  for (const behavior of ["projectile", "melee", "contact", "blocker", "energy"]) {
    assert.ok(studioPage.includes('value="' + behavior + '"'));
  }
  assert.match(assetsRoute, /behavior==="projectile"/);
  assert.match(assetsRoute, /hasProjectile&&behavior!=="projectile"/);
  assert.match(assetsRoute, /createStudioPlantCombatProfile/);
  assert.match(assetsRoute, /removeProjectile/);
});

test("Studio enforces draft-to-testing-to-published and publishes the catalog only after testing", () => {
  assert.match(assetsRoute, /"prepare-test","publish"/);
  assert.match(assetsRoute, /asset\.status!=="testing"/);
  assert.match(assetsRoute, /status:"testing"/);
  assert.match(assetsRoute, /status:"published"/);
  assert.match(assetsRoute, /PUBLISHED_CATALOG_PATH/);
  assert.match(assetsRoute, /githubPut\("web\/public"\+asset\.path/);
});

test("local sync downloads only testing plants and writes the exact local runtime catalog path", () => {
  assert.match(syncScript, /asset\.status==="testing"/);
  assert.match(syncScript, /STUDIO_GITHUB_BRANCH/);
  assert.match(syncScript, /public\/assets\/studio-test\/plant-catalog\.json/);
  assert.match(syncScript, /manifest:"public\/assets\/studio-test\/plant-catalog\.json"/);
  assert.match(syncScript, /web\/game\/data\/studioAssetRegistry\.json/);
});

test("seed selection and Phaser runtime load the live authenticated Studio testing catalog", () => {
  assert.match(selector, /studio-plant-catalog\.json/);
  assert.match(selector, /api\/studio\/assets\?catalog=testing/);
  assert.match(battleScene, /studio-plant-catalog\.json/);
  assert.match(battleScene, /api\/studio\/assets\?catalog=testing/);
  assert.match(battleScene, /const testingTypes = \(this\.studioPlants \|\| \[\]\)/);
  assert.match(battleScene, /\.filter\(\(plant\) => plant\.testOnly\)/);
  assert.match(battleScene, /\.slice\(0, 7\)/);
  assert.match(battleScene, /studioPlantsByType/);
  assert.match(battleScene, /spawnStudioEnergy/);
  assert.match(battleScene, /fireThornProjectile/);
});


test("testing catalog is served directly from the Studio staging branch with proxied plant and projectile assets", () => {
  assert.match(assetsRoute, /catalog==="testing"/);
  assert.match(assetsRoute, /asset\.status==="testing"/);
  assert.match(assetsRoute, /api\/studio\/assets\?preview=/);
  assert.match(assetsRoute, /Cache-Control.*private, no-store/);
  assert.match(studioPage, /متاحة الآن للاختبار مباشرة داخل اللعبة/);
  assert.doesNotMatch(studioPage, /شغّل npm run studio:sync لمزامنتها/);
});

test("every registered asset can be opened for editing and metadata-only edits keep the current file", () => {
  assert.match(studioPage, /onClick=\{\(\)=>beginReplace\(a\)\}>تعديل<\/button>/);
  assert.match(studioPage, /required=\{!editing\}/);
  assert.match(studioPage, /if\(file\)form\.set\("file",file\)/);
  assert.match(assetsRoute, /const hasFile=Boolean\(file&&typeof file\.arrayBuffer/);
  assert.match(assetsRoute, /if\(!hasFile&&\(!replace\|\|!existing\)\)/);
  assert.match(assetsRoute, /path:hasFile\?"\/assets\/\+relative:existing\.path/);
  assert.match(assetsRoute, /if\(hasFile\)await githubPut/);
});
