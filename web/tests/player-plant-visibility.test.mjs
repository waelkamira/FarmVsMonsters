import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { STAGE_ONE_PLANTS } from "../game/data/stageOnePlants.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, "../app/plants/page.js"), "utf8");

test("player-facing plant encyclopedia filters out every unimplemented concept", () => {
  const available = STAGE_ONE_PLANTS.filter((plant) => plant.implemented === true);
  const planned = STAGE_ONE_PLANTS.filter((plant) => plant.implemented !== true);
  assert.ok(available.length > 0);
  assert.ok(planned.length > 0);
  assert.match(page, /STAGE_ONE_PLANTS\\.filter\\(\\(plant\\) => plant\\.implemented === true\\)/);
  assert.match(page, /activePlants\\.map\\(\\(plant\\) =>/);
  assert.doesNotMatch(page, /STAGE_ONE_PLANTS\\.map\\(\\(plant\\) =>/);
  for (const plant of planned) assert.equal(available.some((item) => item.id === plant.id), false, plant.id);
});

test("player encyclopedia copy no longer advertises planned plants as visible or selectable", () => {
  assert.doesNotMatch(page, /IN DEVELOPMENT|VISIBLE · IN DEVELOPMENT|قيد التطوير تظهر|جميع النباتات ظاهرة الآن/);
  assert.match(page, /completed plants that are available for battle/i);
});
