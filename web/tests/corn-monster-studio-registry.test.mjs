import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildAtlasMetadata } from "../scripts/asset-atlas-metadata.mjs";

const registry = JSON.parse(readFileSync(new URL("../game/data/studioAssetRegistry.json", import.meta.url), "utf8"));
const encounters = JSON.parse(readFileSync(new URL("../game/data/stageEncounterConfig.json", import.meta.url), "utf8"));
const atlas = JSON.parse(readFileSync(new URL("../public/assets/plants/corn_monster.json", import.meta.url), "utf8"));

test("Corn Monster is catalogued as a plant and retains its 24-frame Phaser Atlas", () => {
  const matches = registry.assets.filter((asset) => asset.id === "corn-monster");
  assert.equal(matches.length, 1);
  const plant = matches[0];
  assert.equal(plant.type, "plant");
  assert.equal(plant.status, "draft");
  assert.equal(plant.path, "/assets/plants/corn_monster.png");
  assert.equal(plant.atlasMetadataPath, "/assets/plants/corn_monster.json");
  assert.equal(plant.sourceFormat, "phaser-atlas");
  assert.equal(plant.rows * plant.columns, 24);
  assert.equal(plant.frameCount, 24);
  assert.equal(plant.spriteSheet, true);
  assert.equal("monsterProfile" in plant, false);
  assert.equal(Object.keys(atlas.frames).length, 24);
  assert.deepEqual(Object.keys(plant.atlasClips).sort(), ["attack", "hurt", "idle"]);
  assert.deepEqual(plant.animationProfile.idle, { startFrame: 0, endFrame: 7, fps: 8, loop: true });
});

test("Corn Monster is never configured as a monster wave spawn", () => {
  const waveOne = encounters.stages["1"].monsters.filter((entry) => entry.enabled !== false && entry.wave === 1);
  assert.equal(waveOne.some((entry) => entry.id === "corn-monster"), false);
});

test("Phaser Atlas metadata parser derives Corn Monster clips and validates image bounds", () => {
  const metadata = buildAtlasMetadata("plants/corn_monster.png", atlas, { width: 3600, height: 150 });
  assert.equal(metadata.type, "spritesheet");
  assert.equal(metadata.spriteSheet, true);
  assert.equal(metadata.frameCount, 24);
  assert.equal(metadata.rows, 1);
  assert.equal(metadata.columns, 24);
  assert.deepEqual(metadata.frameConfig, { frameWidth: 150, frameHeight: 150, margin: 0, spacing: 0 });
  assert.equal(metadata.atlasMetadataPath, "/assets/plants/corn_monster.json");
  assert.deepEqual(metadata.atlasClips, {
    idle: { startFrame: 0, endFrame: 7 },
    attack: { startFrame: 8, endFrame: 17 },
    hurt: { startFrame: 18, endFrame: 23 }
  });
  assert.throws(
    () => buildAtlasMetadata("plants/corn_monster.png", atlas, { width: 1000, height: 150 }),
    /exceeds image bounds/
  );
});
