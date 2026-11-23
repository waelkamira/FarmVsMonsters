import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolvePlantPlacement } from "../game/rules/combatSimulation.mjs";

const atlas = JSON.parse(readFileSync(new URL("../public/assets/plants/corn_monster.json", import.meta.url), "utf8"));
const battleScene = readFileSync(new URL("../game/scenes/BattleScene.js", import.meta.url), "utf8");

test("Corn Monster can be placed through the real combat placement rules", () => {
  const result = resolvePlantPlacement({
    energy: 100,
    plants: [],
    type: "corn-monster",
    col: 2,
    row: 1,
    columns: 8,
    rows: 5
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, "PLANT_PLACED");
  assert.equal(result.energy, 30);
  assert.equal(result.plant.type, "corn-monster");
  assert.equal(result.plant.hp, 140);
});

test("Corn Monster Atlas contains the expected named clips and valid 150px frames", () => {
  const frames = Object.entries(atlas.frames || {});
  assert.equal(frames.length, 24);
  for (const [clip, expectedCount] of [["idle", 8], ["attack", 10], ["hurt", 6]]) {
    const names = frames.map(([name]) => name).filter((name) => name.startsWith(clip + "_"));
    assert.equal(names.length, expectedCount, clip + " frame count");
    for (const name of names) {
      const frame = atlas.frames[name].frame;
      assert.deepEqual([frame.w, frame.h], [150, 150], name + " dimensions");
      assert.ok(frame.x >= 0 && frame.y >= 0, name + " non-negative origin");
    }
  }
});

test("BattleScene registers Corn Monster as a selectable shooter with its own attack and kernel visual", () => {
  assert.match(battleScene, /this\.load\.atlas\("corn-monster", "\/assets\/plants\/corn_monster\.png", "\/assets\/plants\/corn_monster\.json"\)/);
  assert.match(battleScene, /this\.anims\.generateFrameNames\("corn-monster"/);
  assert.match(battleScene, /type: "corn-monster", title: "CORN MONSTER"/);
  assert.match(battleScene, /sprite\.play\("corn-monster-attack"\)/);
  assert.match(battleScene, /frame\?\.textureFrame !== "attack_06"/);
  assert.match(battleScene, /const kernel = this\.add\.ellipse/);
  assert.match(battleScene, /plantType: plant\.type/);
  assert.match(battleScene, /"corn-monster": CORN_MONSTER_CONFIG/);
  assert.match(battleScene, /!\["radish", "mushroom", "pumpkin", "pineapple", "hazelnut", "mango", "snow-thrower", "electric-mushroom", "corn-monster"\]\.includes\(type\)/);
});
