import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const studioPage = readFileSync(path.join(root, "app/studio/page.js"), "utf8");
const assetsRoute = readFileSync(path.join(root, "app/api/studio/assets/route.js"), "utf8");
const battleScene = readFileSync(path.join(root, "game/scenes/BattleScene.js"), "utf8");
const detailsPage = readFileSync(path.join(root, "app/studio/assets/[id]/page.js"), "utf8");

test("Studio monster profile controls and lifecycle are connected to the asset API", () => {
  assert.match(studioPage, /studio-monster-settings/);
  assert.match(studioPage, /حركة التنقل/);
  assert.match(studioPage, /monsterProfile:JSON\.stringify\(monsterProfile\)/);
  assert.match(studioPage, /اختبار الوحش داخل اللعبة/);
  assert.match(studioPage, /نشر الوحش الآن/);
  assert.match(assetsRoute, /createStudioMonsterProfile/);
  assert.match(assetsRoute, /catalog==="testing-monsters"/);
  assert.match(assetsRoute, /PUBLISHED_MONSTER_CATALOG_PATH/);
  assert.match(assetsRoute, /Publish monster:/);
  assert.match(assetsRoute, /operation!=="publish"/);
  assert.match(assetsRoute, /resolveStudioReleaseAsset\(existing/);
  assert.match(assetsRoute, /asset\.releaseRequest\?\.state==="open"/);
  assert.match(assetsRoute, /monsterProfile:asset\.monsterProfile/);
});

test("Phaser loads Studio monster catalogs and uses saved profiles for real wave spawns", () => {
  assert.match(battleScene, /studio-published-monster-catalog/);
  assert.match(battleScene, /studio-test-monster-catalog/);
  assert.match(battleScene, /selectWeightedStudioMonster/);
  assert.match(battleScene, /resolveStudioMonsterRuntimeProfile/);
  assert.match(battleScene, /customMonsterTexture/);
  assert.match(battleScene, /\["move", monster\.animationProfile\.move\]/);
  assert.match(battleScene, /const animationKey = "studio-monster-" \+ monster\.id \+ "-" \+ clipName/);
  assert.match(battleScene, /studioMonster,/);
});

test("Unified asset details show the monster combat and animation profiles", () => {
  assert.match(detailsPage, /asset\.monsterProfile/);
  assert.match(detailsPage, /asset\.type === "monster"/);
  assert.match(detailsPage, /asset\.animationProfile/);
});
