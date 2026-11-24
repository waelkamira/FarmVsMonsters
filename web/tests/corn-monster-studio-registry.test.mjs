import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const registry = JSON.parse(readFileSync(new URL("../game/data/studioAssetRegistry.json", import.meta.url), "utf8"));
const encounters = JSON.parse(readFileSync(new URL("../game/data/stageEncounterConfig.json", import.meta.url), "utf8"));
const atlas = JSON.parse(readFileSync(new URL("../public/assets/plants/corn_monster.json", import.meta.url), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("../public/assets/asset-manifest.json", import.meta.url), "utf8"));

test("Corn Monster is registered as a Studio-testable monster with its 24-frame Phaser Atlas", () => {
  const matches = registry.assets.filter((asset) => asset.id === "corn-monster");
  assert.equal(matches.length, 1);
  const monster = matches[0];
  assert.equal(monster.type, "monster");
  assert.equal(monster.status, "testing");
  assert.equal(monster.path, "/assets/plants/corn_monster.png");
  assert.equal(monster.atlasMetadataPath, "/assets/plants/corn_monster.json");
  assert.equal(monster.sourceFormat, "phaser-atlas");
  assert.equal(monster.rows * monster.columns, 24);
  assert.equal(monster.monsterProfile.baseArchetype, "cave-brute");
  assert.equal(monster.monsterProfile.firstWave, 1);
  assert.equal(Object.keys(atlas.frames).length, 24);
  assert.deepEqual(Object.keys(monster.atlasClips).sort(), ["attack", "hurt", "idle"]);
});

test("Corn Monster is the guaranteed first spawn in stage 1 wave 1", () => {
  const stage = encounters.stages["1"];
  assert.equal(stage.monstersConfigured, true);
  const waveOne = stage.monsters.filter((entry) => entry.enabled !== false && entry.wave === 1);
  assert.equal(waveOne[0].id, "corn-monster");
  assert.equal(waveOne[0].count, 1);
  assert.equal(waveOne[0].firstSpawnDelayMs, 0);
  assert.equal(waveOne[1].id, "cave-brute");
});


test("Monster 01 is registered as a single-image Studio-testable monster", () => {
  const matches = registry.assets.filter((asset) => asset.id === "monster-01");
  assert.equal(matches.length, 1);
  const monster = matches[0];
  assert.equal(monster.type, "monster");
  assert.equal(monster.status, "testing");
  assert.equal(monster.path, "/assets/characters/monsters/01/01.png");
  assert.equal(monster.spriteSheet, false);
  assert.equal(monster.rows * monster.columns, 1);
  assert.equal(monster.monsterProfile.baseArchetype, "cave-brute");
  const manifestEntry = manifest.groups["characters/monsters"].find((asset) => asset.key === "characters-monsters-01-01");
  assert.ok(manifestEntry, "Monster 01 must exist in the shipped asset manifest");
  assert.equal(manifestEntry.url, monster.path);
});

test("Monster 01 is the first guaranteed spawn in stage 1 wave 1", () => {
  const stage = encounters.stages["1"];
  const waveOne = stage.monsters.filter((entry) => entry.enabled !== false && entry.wave === 1);
  assert.equal(waveOne[0].id, "monster-01");
  assert.equal(waveOne[0].count, 1);
  assert.equal(waveOne[0].firstSpawnDelayMs, 0);
  assert.equal(waveOne[1].id, "corn-monster");
  assert.equal(waveOne[2].id, "cave-brute");
});
