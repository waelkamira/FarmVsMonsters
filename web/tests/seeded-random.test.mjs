import test from "node:test";
import assert from "node:assert/strict";
import { createSeededRandom, normalizeSimulationSeed } from "../game/rules/seededRandom.mjs";

test("same simulation seed produces the same integer and float sequence", () => {
  const first = createSeededRandom(123456789);
  const second = createSeededRandom(123456789);
  const firstSequence = Array.from({ length: 32 }, () => [
    first.nextUint32(),
    first.nextFloat(),
    first.nextInt(0, 4)
  ]);
  const secondSequence = Array.from({ length: 32 }, () => [
    second.nextUint32(),
    second.nextFloat(),
    second.nextInt(0, 4)
  ]);
  assert.deepEqual(firstSequence, secondSequence);
});

test("different seeds produce different sequences and zero seed is normalized", () => {
  const first = createSeededRandom(1);
  const second = createSeededRandom(2);
  assert.notDeepEqual(
    Array.from({ length: 8 }, () => first.nextUint32()),
    Array.from({ length: 8 }, () => second.nextUint32())
  );
  assert.equal(normalizeSimulationSeed(0), 0x6d2b79f5);
  assert.deepEqual(
    Array.from({ length: 8 }, () => createSeededRandom(0).nextUint32()),
    Array.from({ length: 8 }, () => createSeededRandom(0).nextUint32())
  );
});

test("integer sampling stays inside inclusive bounds and rejects invalid ranges", () => {
  const random = createSeededRandom(987654321);
  for (let index = 0; index < 1000; index += 1) {
    const value = random.nextInt(2, 6);
    assert.ok(value >= 2 && value <= 6);
  }
  assert.throws(() => random.nextInt(4, 3), /INVALID_RANDOM_INTEGER_RANGE/);
  assert.throws(() => random.nextInt(0, Number.MAX_SAFE_INTEGER), /RANDOM_INTEGER_RANGE_TOO_WIDE/);
});

test("simulation seeds must be unsigned 32-bit safe integers", () => {
  for (const seed of [-1, 1.5, NaN, Infinity, 0x1_0000_0000, "12"]) {
    assert.throws(() => normalizeSimulationSeed(seed), /INVALID_SIMULATION_SEED/);
  }
});
