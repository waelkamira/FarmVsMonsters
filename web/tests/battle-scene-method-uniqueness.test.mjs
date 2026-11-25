import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");

test("BattleScene declares each class method exactly once", () => {
  const names = [...source.matchAll(/^  ([A-Za-z_$][\w$]*)\([^;]*\)\s*\{/gm)].map((match) => match[1]);
  const counts = new Map();
  for (const name of names) counts.set(name, (counts.get(name) || 0) + 1);
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([name]) => name);
  assert.deepEqual(duplicates, []);
});

test("Studio energy pickups retain one event-recording implementation", () => {
  assert.equal((source.match(/^  spawnStudioEnergy\(plant, amount\) \{/gm) || []).length, 1);
  assert.match(source, /spawnMushroomEnergy\(plant\) \{/);
});
