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

test("seed selection and Phaser runtime load both published and local testing catalogs", () => {
  assert.match(selector, /studio-plant-catalog\.json/);
  assert.match(selector, /studio-test\/plant-catalog\.json/);
  assert.match(battleScene, /studio-plant-catalog\.json/);
  assert.match(battleScene, /studio-test\/plant-catalog\.json/);
  assert.match(battleScene, /studioPlantsByType/);
  assert.match(battleScene, /spawnStudioEnergy/);
  assert.match(battleScene, /fireThornProjectile/);
});
