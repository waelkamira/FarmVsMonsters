import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
