import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/game/page.js", import.meta.url), "utf8");

test("stage seed picker uses only visible plants assigned to the selected stage", () => {
  assert.match(page, /fetch\("\/api\/studio\/stage-encounters"/);
  assert.match(page, /fetch\("\/assets\/studio-plant-catalog\.json"/);
  assert.match(page, /setStageAssetRecords\(Array\.isArray\(assets\?\.plants\) \? assets\.plants : \[\]\)/);
  assert.match(page, /stageEncounter\?\.plantsConfigured === true/);
  assert.match(page, /filter\(\(entry\) => entry\.enabled !== false && entry\.visible !== false\)/);
  assert.match(page, /PLANT_PACKETS\.filter\(\(plant\) => stagePlantIds\.includes\(plant\.id\)\)/);
  assert.match(page, /stageAssetRecords\.find\(\(item\) => item\.id === entry\.id\)/);
  assert.doesNotMatch(page, /fetch\("\/api\/studio\/assets"/);
});

test("stage seed picker treats every added plant as unlocked unless explicitly locked", () => {
  assert.match(page, /stagePlantEntries\.filter\(\(entry\) => entry\.unlocked !== false\)/);
  assert.match(page, /const isUnlocked = selectionUnlocked\.includes\(plant\.id\)/);
  assert.match(page, /!isUnlocked \? "🔒" : isSelected \? "✓" : "\+"/);
  assert.match(page, /Locked in stage settings/);
});

test("stage loadout selection does not force starter plants over Studio lock settings", () => {
  assert.match(page, /function normalizeStageSeedLoadout\(selectedIds, unlockedIds\)/);
  assert.ok(page.includes("stageRosterConfigured") && page.includes("normalizeStageSeedLoadout(activeSelected, selectionUnlocked)"));
  assert.match(page, /farmVsMonsters\.selectedPlants\.stage\./);
});


test("seed picker does not render fallback or stale list before stage roster resolves", () => {
  assert.match(page, /\{!stageEncounterReady \? <p>\{arabic \? "جارٍ تحميل نباتات المرحلة…"/);
  assert.doesNotMatch(page, /stageRosterConfigured && !stageEncounterReady \?/);
});
