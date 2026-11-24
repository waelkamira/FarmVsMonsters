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

test("Studio supports safe duplication for every registered asset type",()=>{
  assert.match(studioPage,/async function cloneAsset\(asset\)/);
  assert.match(studioPage,/onClick=\{\(\)=>cloneAsset\(a\)\}/);
  assert.match(assetsRoute,/operation==="clone"/);
  assert.match(assetsRoute,/cloneStudioAsset\(asset,newId,body\.newName\)/);
});

test("Studio exposes archive and restore actions for every asset type",()=>{
  assert.match(studioPage,/a\.status==="archived"[\s\S]*?transitionAsset\(a,"restore"\)/);
  assert.match(studioPage,/a\.status==="draft"[\s\S]*?transitionAsset\(a,"archive"\)/);
  assert.match(assetsRoute,/registry\.assets\.findIndex\(asset=>asset\.id===id\)/);
});

test("Studio supports previewing uploaded and existing audio assets",()=>{
  assert.match(studioPage,/audioPreviewUrl/);
  assert.match(studioPage,/<audio controls preload="metadata"/);
  assert.match(studioPage,/studio-audio-preview/);
});

test("Studio dashboard summarizes assets by type and lifecycle status",()=>{
  assert.match(studioPage,/assets\.filter\(a=>a\.type==="plant"\)/);
  assert.match(studioPage,/assets\.filter\(a=>a\.type==="monster"\)/);
  for(const status of ["draft","testing","approved","published","archived"])assert.ok(studioPage.includes(`a.status==="${status}"`));
});

test("Studio asset library supports search and type/status filtering",()=>{
  assert.match(studioPage,/assetSearch/);
  assert.match(studioPage,/assetTypeFilter/);
  assert.match(studioPage,/assetStatusFilter/);
  assert.match(studioPage,/filteredAssets\.map/);
});

test("Studio can preview a selected Sprite Sheet row with adjustable playback speed",()=>{
  assert.match(studioPage,/animationRow/);
  assert.match(studioPage,/animationFps/);
  assert.match(studioPage,/animationPlaying/);
  assert.match(studioPage,/animationFps/);
  assert.match(studioPage,/setAnimationPlaying\(value=>!value\)/);
  assert.match(studioPage,/studio-sprite-play/);
  assert.match(studioPage,/steps\(\$\{columns\}\)/);
});

test("Studio provides a live size preview for the selected or edited plant",()=>{
  assert.match(studioPage,/editingAsset\?\.previewUrl/);
  assert.match(studioPage,/studio-live-preview-stage/);
  assert.match(studioPage,/sprite&&\(previewUrl\|\|editingAsset\?\.previewUrl/);
  assert.match(studioPage,/معاينة حركة Sprite Sheet/);
  assert.match(studioPage,/scale\(\$\{type==="plant"\?plantSizePercent\/100:1\}\)/);
  assert.match(studioPage,/setEditingAsset\(asset\)/);
});

test("Studio exposes plant size and applies it in the Phaser runtime",()=>{
  assert.match(studioPage,/plantSizePercent/);
  assert.match(studioPage,/حجم النبتة/);
  assert.match(assetsRoute,/sizePercent/);
  assert.match(battleScene,/studioPlant\.combat\?\.sizePercent/);
});

test("campaign plant unlocks are respected and the active loadout remains capped at six",()=>{
  assert.match(selector,/nextPlants\.map\(\(plant\) => plant\.id\)/);
  assert.match(selector,/MAX_SEEDS = 6/);
  assert.match(battleScene,/const PLAYTEST_ALL_PLANTS = false/);
  assert.match(battleScene,/normalizeSeedLoadout\(preferredLoadout/);
});

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
  assert.match(assetsRoute, /githubPutImmutable\("web\/public"\+asset\.path/);
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
  assert.match(battleScene, /normalizeSeedLoadout\(preferredLoadout/);
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
  assert.match(studioPage, /onClick=\{\(\)=>beginReplace\(a\)\}[^>]*>تعديل<\/button>/);
  assert.match(studioPage, /required=\{!editing\}/);
  assert.match(studioPage, /if\(file\)form\.set\("file",file\)/);
  assert.match(assetsRoute, /const hasFile=Boolean\(file&&typeof file\.arrayBuffer/);
  assert.match(assetsRoute, /if\(!hasFile&&\(!replace\|\|!existing\)\)/);
  assert.match(assetsRoute, /path:hasFile\?"\/assets\/"\+relative:existing\.path/);
  assert.match(assetsRoute, /if\(hasFile\)await githubPutImmutable/);
});

test("Studio exposes editable projectile controls with per-field Arabic explanations",()=>{
  for(const field of ["projectileSpeed","projectileHeight","projectileEffectColor","projectileRotation"]){
    assert.ok(studioPage.includes(field));
  }
  for(const label of ["سرعة القذيفة","ارتفاع مسار القذيفة","لون تأثير القذيفة","زاوية دوران القذيفة"]){
    assert.ok(studioPage.includes(label));
  }
  assert.match(studioPage,/studio-field-help/);
  assert.match(assetsRoute,/projectileHeight/);
  assert.match(assetsRoute,/projectileEffectColor/);
  assert.match(assetsRoute,/projectileRotation/);
  assert.match(battleScene,/projectileHeight/);
  assert.match(battleScene,/projectileEffectColor/);
  assert.match(battleScene,/projectileRotation/);
});

test("published Studio plants are included in the default seven-slot loadout",()=>{
  assert.match(selector,/defaultStudioPlants = studioPlants\.map/);
  assert.match(selector,/const availableIds = new Set\(nextPlants\.map\(\(plant\) => plant\.id\)\)/);
  assert.match(selector,/STARTER_LOADOUT\.filter\(\(id\) => availableIds\.has\(id\)\)/);
  assert.match(selector,/defaultStudioPlants\.filter\(\(id\) => availableIds\.has\(id\)\)/);
  assert.match(selector,/MAX_SEEDS = 7/);
});

test("Studio persists validated idle and attack animation profiles into Phaser runtime",()=>{
  assert.match(studioPage,/animationProfile:JSON\.stringify\(animationProfile\)/);
  assert.match(studioPage,/studio-animation-profile-editor/);
  assert.match(studioPage,/أول إطار للهجوم/);
  assert.match(assetsRoute,/createStudioAnimationProfile/);
  assert.match(assetsRoute,/config\.spriteSheet&&\(type==="plant"\|\|type==="monster"\)/);
  assert.match(assetsRoute,/animationProfile:asset\.animationProfile/);
  assert.match(battleScene,/createStudioAnimationProfile\(plant\.animationProfile,\s*frameCount\)/);
  assert.match(battleScene,/clip\.fps/);
  assert.match(battleScene,/studioPlant\.id \+ "-idle"/);
  assert.match(battleScene,/\["attack", plant\.animationProfile\.attack\]/);
  assert.match(battleScene,/plant\.studioPlant\.animationProfile\?\.idle\?\.startFrame/);
});

test("Studio imports plant assets from grouped manifests and preserves named Phaser Atlas animation metadata",()=>{
  assert.match(assetsRoute,/Object\.entries\(source\.groups\|\|\{\}\)/);
  assert.match(assetsRoute,/source\.animationProfile/);
  assert.match(assetsRoute,/source\.atlasMetadataPath/);
  assert.match(assetsRoute,/source\.atlasClips/);
});
