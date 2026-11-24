import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const registry = JSON.parse(readFileSync(new URL("../game/data/studioAssetRegistry.json", import.meta.url), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("../public/assets/asset-manifest.json", import.meta.url), "utf8"));
const atlas = JSON.parse(readFileSync(new URL("../public/assets/plants/corn_monster.json", import.meta.url), "utf8"));

test("Corn Monster is registered in Studio as an editable draft with its Phaser Atlas metadata", () => {
  const matches = registry.assets.filter((asset) => asset.id === "corn-monster");
  assert.equal(matches.length, 1);
  const plant = matches[0];
  assert.equal(plant.type, "plant");
  assert.equal(plant.status, "draft");
  assert.equal(plant.path, "/assets/plants/corn_monster.png");
  assert.equal(plant.atlasMetadataPath, "/assets/plants/corn_monster.json");
  assert.equal(plant.sourceFormat, "phaser-atlas");
  assert.equal(plant.rows * plant.columns, 24);
  assert.deepEqual(
    Object.keys(plant.atlasClips).sort(),
    ["attack", "hurt", "idle"]
  );
  assert.equal(Object.keys(atlas.frames).length, 24);
  const plantManifest = manifest.groups.plants.find((asset) => asset.key === "corn-monster");
  assert.ok(plantManifest, "Corn Monster artwork must remain discoverable in the asset manifest");
  assert.equal(plantManifest.atlasMetadataPath, "/assets/plants/corn_monster.json");
});
