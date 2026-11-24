import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const selectionPage = readFileSync(new URL("../app/stage/1/select/page.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("pre-battle seed cards use the first frame of every current plant sprite sheet", () => {
  for (const plantId of ["radish", "pineapple", "hazelnut", "mango", "snow-thrower", "electric-mushroom"]) {
    assert.ok(selectionPage.includes('"'+plantId+'"'), `missing sprite-sheet card mapping for ${plantId}`);
  }
  assert.match(selectionPage, /plant\.id === "radish" \? "302 \/ 359" : "1 \/ 1"/);
});

test("single-image plants are not routed through the sprite-sheet crop", () => {
  assert.doesNotMatch(selectionPage, /"mushroom"\s*,\s*"pumpkin"[^\]]*is-sprite-sheet/);
  assert.match(selectionPage, /plant\.spriteSheet && Number\(plant\.frameCount\)>1/);
  assert.match(selectionPage, /<img src=\{plant\.image\} alt="" \/>/);
});

test("sprite-sheet card viewport is clipped to the top-left frame", () => {
  assert.match(styles, /\.seed-select-art\.is-sprite-sheet\s*\{[^}]*overflow:hidden;[^}]*aspect-ratio:1 \/ 1/s);
  assert.match(styles, /\.seed-select-art\.is-sprite-sheet img\s*\{[^}]*width:300%;[^}]*height:300%;[^}]*object-position:0 0;/s);
});

test("seed cards crop the top-left first frame and retain full images for one-frame plants", () => {
  assert.match(selectionPage, /backgroundPosition:"left top"/);
  assert.ok(selectionPage.includes('backgroundSize:(Math.max(1,Number(plant.columns)||1)*100)+"% "+(Math.max(1,Number(plant.rows)||1)*100)+"%"'));
  assert.match(selectionPage, /frameCount: Number\(plant\.frameCount\)\|\|/);
  assert.match(selectionPage, /spriteSheet: true, rows: 3, columns: 3, frameCount: 9/);
});
