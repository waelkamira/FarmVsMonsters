import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveSpriteThumbnailGrid } from "../game/studio/spriteSheetGrid.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const thumbnail = read("../app/components/SpriteThumbnail.jsx");
const catalog = read("../app/components/CatalogThumb.js");
const game = read("../app/game/page.js");
const detail = read("../app/studio/assets/[id]/page.js");
const studio = read("../app/studio/page.js");
const roster = read("../app/studio/StageRosterManager.jsx");
const battle = read("../game/scenes/BattleScene.js");
const styles = read("../app/globals.css");

test("shared thumbnail renderer crops multi-frame sheets to frame zero and preserves one-frame images", () => {
  assert.match(thumbnail, /if \(!isSpriteSheet\) return <img/);
  assert.match(thumbnail, /backgroundPosition: "left top"/);
  assert.match(thumbnail, /backgroundSize: `\$\{grid\.columns \* 100\}% \$\{grid\.rows \* 100\}%`/);
  assert.deepEqual(resolveSpriteThumbnailGrid(9, 3, 3), { rows: 3, columns: 3 });
  assert.deepEqual(resolveSpriteThumbnailGrid(1, 1, 1), { rows: 1, columns: 1 });
  assert.deepEqual(resolveSpriteThumbnailGrid(81, 9, 9), { rows: 9, columns: 9 });
});

test("plant encyclopedia maps every current built-in plant sheet to its real art and first frame", () => {
  for (const id of ["radish", "mango", "pineapple", "hazelnut", "snow-thrower", "electric-mushroom"]) {
    assert.ok(catalog.includes(`"${id}"`), `missing catalog thumbnail mapping for ${id}`);
  }
  assert.match(catalog, /<SpriteThumbnail src=\{localIcon\} rows=\{3\} columns=\{3\} frameCount=\{9\}/);
  assert.doesNotMatch(styles, /catalog-thumb-sprite-sheet/);
});

test("pre-battle seed packet cards use first-frame thumbnails for all built-in sheets", () => {
  for (const id of ["radish", "pineapple", "hazelnut", "mango", "snow-thrower", "electric-mushroom"]) {
    assert.match(game, new RegExp(`id: "${id}".{0,180}frameCount: 9`));
  }
  assert.match(game, /<SpriteThumbnail src=\{plant\.image\}/);
  assert.match(styles, /\.seed-choice-art-media\.is-sprite-sheet\s*\{[^}]*background-repeat:no-repeat;[^}]*background-position:left top;/s);
});

test("Studio asset detail uses first-frame thumbnails without changing the animated editing preview", () => {
  assert.match(detail, /<SpriteThumbnail src=\{mediaUrl\}/);
  assert.match(detail, /asset\.type !== "audio" && asset\.spriteSheet === true && mediaFrameCount > 1/);
  assert.match(studio, /studio-live-preview-sprite/);
  assert.match(studio, /setAnimationPlaying/);
  assert.match(roster, /stage-roster-first-frame/);
  assert.match(roster, /backgroundPosition:"left top"/);
});

test("battlefield Radish cells register the actual sheet grid before selecting frame zero", () => {
  assert.match(battle, /registerThreeByThreeSheet\("radish-level-1"\)/);
  assert.match(battle, /getFrame\("radish-level-1", 0\)/);
  assert.match(battle, /add\.sprite\(0, -displayHeight \/ 2 \+ 2, "radish-level-1", 0\)/);
  assert.match(battle, /drawCatalogPlant\(type, x, y, row = 2\)/);
  assert.match(battle, /this\.textures\.getFrame\(texture, \["pineapple", "hazelnut", "mango", "snow-thrower", "electric-mushroom"\]\.includes\(type\) \? "0" : undefined\)/);
});
