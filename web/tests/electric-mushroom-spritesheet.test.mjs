import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { STAGE_ONE_PLANTS } from "../game/data/stageOnePlants.mjs";
import { PHASE_ONE_PLANTS } from "../game/rules/phaseOneCombatContract.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const scene = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const artwork = readFileSync(resolve(here, "../public/assets/plants/Electric-mushroom-level-1.png"));

test("Electric Mushroom artwork is a complete 3x3 sheet with dimension-derived frame bounds", () => {
  assert.equal(artwork.toString("ascii", 1, 4), "PNG");
  const width = artwork.readUInt32BE(16);
  const height = artwork.readUInt32BE(20);
  assert.equal(width, 512);
  assert.equal(height, 512);

  const frames = Array.from({ length: 9 }, (_, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = Math.floor((column * width) / 3);
    const y = Math.floor((row * height) / 3);
    const nextX = Math.floor(((column + 1) * width) / 3);
    const nextY = Math.floor(((row + 1) * height) / 3);
    return { x, y, width: nextX - x, height: nextY - y };
  });

  assert.deepEqual(frames.slice(0, 3).map((frame) => frame.width), [170, 171, 171]);
  assert.deepEqual(frames.slice(0, 3).map((frame) => frame.height), [170, 170, 170]);
  assert.equal(frames[8].x + frames[8].width, width);
  assert.equal(frames[8].y + frames[8].height, height);
  assert.equal(new Set(frames.map((frame) => `${frame.x}:${frame.y}`)).size, 9);
});

test("Electric Mushroom is registered and played as a nine-frame plant animation like Mango", () => {
  const plant = STAGE_ONE_PLANTS.find((entry) => entry.id === "electric-mushroom");
  assert.ok(plant?.implemented);
  assert.equal(plant.assetPath, "/assets/plants/Electric-mushroom-level-1.png");
  assert.equal(plant.energyCost, PHASE_ONE_PLANTS["electric-mushroom"].plantingEnergyCost);

  assert.match(scene, /registerThreeByThreeSheet\("mango-level-1"\)/);
  assert.match(scene, /registerThreeByThreeSheet\("electric-mushroom-level-1"\)/);
  assert.match(scene, /generateFrameNumbers\("electric-mushroom-level-1", \{ start: 0, end: 8 \}\)/);
  assert.match(scene, /this\.textures\.getFrame\(texture, \["pineapple", "hazelnut", "mango", "snow-thrower", "electric-mushroom"\]\.includes\(type\) \? "0" : undefined\)/);
  assert.match(scene, /"electric-mushroomThrowSprite"/);
  assert.match(scene, /"electric-mushroom-level-1"\]\.includes\(imageKey\)/);
  assert.match(scene, /"snow-thrower", "electric-mushroom"\]\.includes\(plant\.type\)/);
});
