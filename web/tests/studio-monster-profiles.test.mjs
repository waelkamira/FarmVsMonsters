import test from "node:test";
import assert from "node:assert/strict";
import { createStudioMonsterProfile, resolveStudioMonsterRuntimeProfile, selectWeightedStudioMonster } from "../game/studio/monsterProfiles.mjs";

test("creates a safe default monster profile with custom spawning disabled", () => {
  const profile = createStudioMonsterProfile();
  assert.equal(profile.baseArchetype, "cave-brute");
  assert.equal(profile.spawnWeight, 0);
  assert.equal(profile.firstWave, 1);
});
test("validates base archetype and every tunable range", () => {
  assert.throws(() => createStudioMonsterProfile({ baseArchetype: "unknown" }), /supported base monster/);
  assert.throws(() => createStudioMonsterProfile({ hpMultiplier: 4.1 }), /hpMultiplier/);
  assert.throws(() => createStudioMonsterProfile({ spawnWeight: -1 }), /spawnWeight/);\n  assert.throws(() => createStudioMonsterProfile({ spawnWeight: 1.5 }), /whole number/);
  assert.throws(() => createStudioMonsterProfile({ firstWave: 11 }), /firstWave/);
});
test("applies custom combat multipliers without mutating the base profile", () => {
  const base = { hp: 100, speed: 20, plantDamage: 10, attackIntervalMs: 1000, widthScale: 1, heightScale: 1 };
  const custom = createStudioMonsterProfile({ hpMultiplier: 1.5, speedMultiplier: 0.8, damageMultiplier: 2, attackIntervalMultiplier: 1.2, widthScale: 1.3, heightScale: 1.1 });
  const result = resolveStudioMonsterRuntimeProfile(base, custom);
  assert.equal(result.hp, 150);
  assert.equal(result.speed, 16);
  assert.equal(result.plantDamage, 20);
  assert.equal(result.attackIntervalMs, 1200);
  assert.equal(result.widthScale, 1.3);
  assert.equal(base.hp, 100);
});
test("weighted spawn selection respects first wave and zero-weight disabled monsters", () => {
  const monsters = [
    { id: "early", monsterProfile: createStudioMonsterProfile({ spawnWeight: 2, firstWave: 1 }) },
    { id: "late", monsterProfile: createStudioMonsterProfile({ spawnWeight: 8, firstWave: 4 }) },
    { id: "disabled", monsterProfile: createStudioMonsterProfile({ spawnWeight: 0 }) }
  ];
  assert.equal(selectWeightedStudioMonster(monsters, 2, () => 1).id, "early");
  assert.equal(selectWeightedStudioMonster(monsters, 4, () => 3).id, "late");
  assert.equal(selectWeightedStudioMonster(monsters, 1, () => 1).id, "early");
  assert.equal(selectWeightedStudioMonster(monsters, 0, () => 1), null);
});
