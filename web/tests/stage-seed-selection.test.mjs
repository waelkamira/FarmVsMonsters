import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/game/page.js", import.meta.url), "utf8");

test("stage seed picker uses only visible plants assigned to the selected stage", () => {
  assert.match(page, /fetch\("\/api\/studio\/stage-encounters"/);
  assert.match(page, /stageEncounter\?\.plantsConfigured === true/);
  assert.match(page, /filter\(\(entry\) => entry\.enabled !== false && entry\.visible !== false\)/);
  assert.match(page, /PLANT_PACKETS\.filter\(\(plant\) => stagePlantIds\.includes\(plant\.id\)\)/);
});

test("stage seed picker treats every added plant as unlocked unless explicitly locked", () => {
  assert.match(page, /stagePlantEntries\.filter\(\(entry\) => entry\.unlocked !== false\)/);
  assert.match(page, /const isUnlocked = selectionUnlocked\.includes\(plant\.id\)/);
  assert.match(page, /!isUnlocked \? "🔒" : isSelected \? "✓" : "\+"/);
  assert.match(page, /Locked in stage settings/);
});

test("stage loadout selection does not force starter plants over Studio lock settings", () => {
  assert.match(page, /function normalizeStageSeedLoadout\(selectedIds, unlockedIds\)/);
  assert.match(page, /stageRosterConfigured\s*\? normalizeStageSeedLoadout\(activeSelected, selectionUnlocked\)/);
  assert.match(page, /farmVsMonsters\.selectedPlants\.stage\./);
});
