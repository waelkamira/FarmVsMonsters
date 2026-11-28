import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getSpriteFrameRectangles } from "../game/studio/spriteSheetGrid.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const battle = read("../game/scenes/BattleScene.js");
const catalog = JSON.parse(read("../public/assets/studio-monster-catalog.json"));
const monster = catalog.monsters.find((entry) => entry.id === "01");

test("Monster 01 registers twelve independent cells and plays explicit frame names", () => {
  assert.equal(monster.spriteSheet, true);
  assert.equal(monster.frameCount, 12);
  assert.equal(monster.rows, 3);
  assert.equal(monster.columns, 4);

  const frames = getSpriteFrameRectangles(1080, 806, monster.rows, monster.columns);
  assert.equal(frames.length, 12);
  assert.deepEqual(frames[0], { index: 0, x: 0, y: 0, width: 270, height: 268 });
  assert.deepEqual(frames[11], { index: 11, x: 810, y: 537, width: 270, height: 269 });

  assert.match(battle, /registered\.cutX !== frame\.x \|\| registered\.cutY !== frame\.y/);
  assert.match(battle, /frame: String\(clip\.startFrame \+ index\)/);
  assert.match(battle, /key: monster\.textureKey/);
});

test("Monster 01 faces left while advancing toward the farmhouse", () => {
  // The authored artwork faces right, while monsters move toward decreasing lane X.
  // flipX=true is the shared Studio convention for mirroring authored artwork.
  assert.equal(monster.flipX, true);
  assert.match(battle, /monster01Sprite\.setFlipX\(Boolean\(studioMonster\.flipX\)\)/);
  assert.doesNotMatch(battle, /monster01Sprite\.setFlipX\(!studioMonster\.flipX\)/);
});
