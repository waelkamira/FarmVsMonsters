import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { STAGE_ONE_PLANTS } from "../game/data/stageOnePlants.mjs";
import { PLANT_PROJECTILE_DESIGNS } from "../game/data/projectileDesigns.mjs";


const here = dirname(fileURLToPath(import.meta.url));
const publicRoot = resolve(here, "../public");
const catalogThumb = readFileSync(resolve(here, "../app/components/CatalogThumb.js"), "utf8");
const battleScene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const storyAssets = JSON.parse(readFileSync(resolve(here, "../game/data/phase-one-story-assets.json"), "utf8"));
const assetManifest = JSON.parse(readFileSync(resolve(here, "../public/assets/asset-manifest.json"), "utf8"));
const assetAudit = JSON.parse(readFileSync(resolve(here, "../public/assets/asset-audit.json"), "utf8"));

function publicAssetExists(path) {
  return existsSync(resolve(publicRoot, path.replace(/^\//, "")));
}

test("every plant runtime asset path exists and unimplemented concepts keep only planned paths", () => {
  for (const plant of STAGE_ONE_PLANTS) {
    if (plant.assetPath) assert.ok(publicAssetExists(plant.assetPath), plant.id + " runtime art must exist");
  }
  const planned = STAGE_ONE_PLANTS.filter((plant) => !plant.implemented && plant.plannedAssetPath);
  assert.ok(planned.length >= 7);
  for (const plant of planned) {
    assert.equal(plant.assetPath, null, plant.id + " must not expose a missing runtime assetPath");
    assert.equal(publicAssetExists(plant.plannedAssetPath), false, plant.id + " art remains a future design target");
  }
});

test("planned plant encyclopedia thumbnails use committed local SVG artwork", () => {
  const plannedIds = ["pea-shooter", "thorn-wall", "sunflower", "ice-bloom", "double-radish", "explosive-berry"];
  for (const id of plannedIds) {
    const iconPath = "/assets/plant-icons/" + id + ".svg";
    assert.ok(publicAssetExists(iconPath), "missing committed catalogue icon: " + iconPath);
    const mappingLine = catalogThumb.split("\n").find((line) => line.includes(iconPath));
    assert.ok(mappingLine && mappingLine.includes(id), "missing CatalogThumb mapping for " + id);
  }
  assert.doesNotMatch(catalogThumb, /plant-icons\/fire-pepper\.svg/);
  assert.match(catalogThumb, /"fire-pepper": \["1fad1", "Hot pepper"\]/);
});

test("projectile design contracts separate available files from planned future art", () => {
  for (const [plantId, design] of Object.entries(PLANT_PROJECTILE_DESIGNS)) {
    if (design.assetPath) assert.ok(publicAssetExists(design.assetPath), plantId + " projectile runtime art must exist");
    if (design.sourcePlant) assert.ok(publicAssetExists(design.sourcePlant), plantId + " source plant art must exist");
    if (design.plannedAssetPath) {
      assert.equal(design.assetPath, null);
      assert.equal(publicAssetExists(design.plannedAssetPath), false);
    }
    if (design.plannedSourcePlant) {
      assert.equal(design.sourcePlant, null);
      assert.equal(publicAssetExists(design.plannedSourcePlant), false);
    }
  }
  assert.equal(PLANT_PROJECTILE_DESIGNS.pineapple.implemented, true);
  assert.ok(publicAssetExists(PLANT_PROJECTILE_DESIGNS.pineapple.assetPath));
});

test("missing Phase 1 story art remains documented but is not requested by the Phaser loader", () => {
  assert.equal(storyAssets.runtimeEnabled, false);
  const preload = battleScene.slice(battleScene.indexOf("  preload() {"), battleScene.indexOf("  create() {"));
  for (const asset of storyAssets.assets) {
    assert.equal(asset.runtimeEnabled, false);
    assert.equal(asset.status, "awaiting-art");
    assert.equal(publicAssetExists(asset.path), false);
    assert.equal(preload.includes(asset.path), false);
  }
});


test("committed asset manifest contains no missing public files", () => {
  assert.equal(assetManifest.assetCount, assetManifest.assets.length);
  assert.equal(assetAudit.assetCount, assetManifest.assetCount);
  assert.equal(assetAudit.totalBytes, assetManifest.totalBytes);
  const manifestUrls = new Set(assetManifest.assets.map((asset) => asset.url));
  for (const asset of assetManifest.assets) {
    assert.ok(publicAssetExists(asset.url), "manifest points to missing public asset: " + asset.url);
  }
  for (const group of Object.values(assetManifest.groups)) {
    for (const asset of group) assert.ok(manifestUrls.has(asset.url), "group contains an asset missing from the canonical manifest: " + asset.url);
  }
});
