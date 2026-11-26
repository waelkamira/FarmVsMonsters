import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/plants/page.js", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/plant-codex-v2.css", import.meta.url), "utf8");

test("plant encyclopedia uses the new compact glass-card composition", () => {
  assert.match(page, /className="plant-v2-grid"/);
  assert.match(page, /className="plant-v2-card"/);
  assert.match(page, /className="plant-v2-art"/);
  assert.match(styles, /\.plant-v2-grid\{grid-template-columns:repeat\(5/);
  assert.match(styles, /\.plant-v2-card\{/);
  assert.match(styles, /backdrop-filter:blur\(17px\)/);
});

test("dedicated plant codex stylesheet is loaded by the app layout", () => {
  assert.match(layout, /plant-codex-v2\.css/);
});

test("plant catalog retains implemented roster, artwork, energy, stats, and navigation", () => {
  assert.match(page, /STAGE_ONE_PLANTS\.filter\(\(plant\) => plant\.implemented === true\)/);
  assert.match(page, /<CatalogThumb id=\{plant\.id\}/);
  assert.match(page, /plant\.energyCost/);
  assert.match(page, /plant\.statsAr : plant\.stats/);
  assert.match(page, /href="\/monsters"/);
  assert.match(page, /href="\/stage\/1\/select"/);
});
