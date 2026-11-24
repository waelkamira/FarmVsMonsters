import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const registry = JSON.parse(readFileSync(new URL("../game/data/studioAssetRegistry.json", import.meta.url), "utf8"));
const encounters = JSON.parse(readFileSync(new URL("../game/data/stageEncounterConfig.json", import.meta.url), "utf8"));
const atlas = JSON.parse(readFileSync(new URL("../public/assets/plants/corn_monster.json", import.meta.url), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("../public/assets/asset-manifest.json", import.meta.url), "utf8"));

test("Corn Monster is registered as a Studio-testable plant with its 24-frame Phaser Atlas", () => {
  const matches = registry.assets.filter((asset) => asset.id === "corn-monster");
  assert.equal(matches.length, 1);
  const plant = matches[0];
  assert.equal(plant.type, "plant");
  assert.equal(plant.status, "testing");
  assert.equal(plant.path, "/assets/plants/corn_monster.png");
  assert.equal(plant.atlasMetadataPath, "/assets/plants/corn_monster.json");
  assert.equal(plant.sourceFormat, "phaser-atlas");
  assert.equal(plant.rows * plant.columns, 24);
  assert.equal(plant.monsterProfile, undefined);
  assert.equal(Object.keys(atlas.frames).length, 24);
  assert.deepEqual(Object.keys(plant.atlasClips).sort(), ["attack", "hurt", "idle"]);
});

test("Monster 01 is the guaranteed first spawn in stage 1 wave 1", () => {
  const stage = encounters.stages["1"];
  assert.equal(stage.monstersConfigured, true);
  const waveOne = stage.monsters.filter((entry) => entry.enabled !== false && entry.wave === 1);
  assert.equal(waveOne[0].id, "01");
  assert.equal(waveOne[0].count, 1);
  assert.equal(waveOne[0].firstSpawnDelayMs, 0);
  assert.equal(waveOne[1].id, "cave-brute");
});


test("Monster 01 is registered as a testing monster using its shipped 3x4 artwork", () => {
  const monster = registry.assets.find((asset) => asset.id === "01");
  assert.ok(monster);
  assert.equal(monster.type, "monster");
  assert.equal(monster.status, "testing");
  assert.equal(monster.path, "/assets/characters/monsters/01/01.png");
  assert.equal(monster.spriteSheet, true);
  assert.equal(monster.rows, 3);
  assert.equal(monster.columns, 4);
  assert.equal(monster.frameCount, 12);
  assert.equal(monster.monsterProfile.baseArchetype, "cave-brute");
  const manifestEntry = manifest.groups["characters/monsters"].find((asset) => asset.key === "characters-monsters-01-01");
  assert.ok(manifestEntry);
  assert.equal(manifestEntry.url, monster.path);
});
