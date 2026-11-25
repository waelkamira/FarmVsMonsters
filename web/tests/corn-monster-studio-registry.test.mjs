import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildAtlasMetadata } from "../scripts/asset-atlas-metadata.mjs";

const registry = JSON.parse(readFileSync(new URL("../game/data/studioAssetRegistry.json", import.meta.url), "utf8"));
const encounters = JSON.parse(readFileSync(new URL("../game/data/stageEncounterConfig.json", import.meta.url), "utf8"));
const atlas = JSON.parse(readFileSync(new URL("../public/assets/plants/corn_monster.json", import.meta.url), "utf8"));

test("Corn Monster is registered as a Studio-testable plant with its 24-frame Phaser Atlas", () => {
  const plant = registry.assets.find((asset) => asset.id === "corn-monster");
  assert.ok(plant);
  assert.equal(plant.type, "plant");
  assert.equal(plant.status, "draft");
  assert.equal(plant.path, "/assets/plants/corn_monster.png");
  assert.equal(plant.atlasMetadataPath, "/assets/plants/corn_monster.json");
  assert.equal(plant.sourceFormat, "phaser-atlas");
  assert.equal(plant.rows * plant.columns, 24);
  assert.equal(plant.frameCount, 24);
  assert.equal(plant.spriteSheet, true);
  assert.equal(plant.monsterProfile, undefined);
  assert.equal(Object.keys(atlas.frames).length, 24);
  assert.deepEqual(Object.keys(plant.atlasClips).sort(), ["attack", "hurt", "idle"]);
});

test("Corn Monster belongs to the plant roster and never appears in a monster wave", () => {
  const stage = encounters.stages["1"];
  assert.ok(stage.plants.some((entry) => entry.id === "corn-monster" && entry.enabled));
  assert.ok(stage.monsters.every((entry) => entry.id !== "corn-monster"));
});

test("the committed Corn Monster Atlas resolves to the exact 24-frame horizontal grid", () => {
  const metadata = buildAtlasMetadata("plants/corn_monster.png", atlas, { width: 3600, height: 150 });
  assert.equal(metadata.type, "spritesheet");
  assert.equal(metadata.frameCount, 24);
  assert.equal(metadata.rows, 1);
  assert.equal(metadata.columns, 24);
  assert.deepEqual(metadata.frameConfig, { frameWidth: 150, frameHeight: 150, margin: 0, spacing: 0 });
  assert.deepEqual(metadata.atlasClips, {
    idle: { startFrame: 0, endFrame: 7 },
    attack: { startFrame: 8, endFrame: 17 },
    hurt: { startFrame: 18, endFrame: 23 }
  });
});
