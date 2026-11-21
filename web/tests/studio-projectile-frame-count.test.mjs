import test from "node:test";
import assert from "node:assert/strict";
import { createStudioPlantCombatProfile } from "../game/studio/plantProfiles.mjs";

const baseProjectile = {
  id: "test-seed",
  path: "/assets/projectiles/plants/test-seed.png",
  filename: "test-seed.png"
};

test("legacy attached projectiles default to a single frame", () => {
  const profile = createStudioPlantCombatProfile({
    behavior: "projectile",
    projectile: baseProjectile
  });

  assert.deepEqual(
    {
      frameCount: profile.projectile.frameCount,
      rows: profile.projectile.rows,
      columns: profile.projectile.columns
    },
    { frameCount: 1, rows: 1, columns: 1 }
  );
});

test("preserves a valid nine-frame projectile grid", () => {
  const profile = createStudioPlantCombatProfile({
    behavior: "projectile",
    projectile: { ...baseProjectile, frameCount: 9, rows: 3, columns: 3 }
  });

  assert.equal(profile.projectile.frameCount, 9);
  assert.equal(profile.projectile.rows, 3);
  assert.equal(profile.projectile.columns, 3);
});

test("accepts the maximum supported 24-frame projectile grid", () => {
  const profile = createStudioPlantCombatProfile({
    behavior: "projectile",
    projectile: { ...baseProjectile, frameCount: 24, rows: 4, columns: 6 }
  });

  assert.equal(profile.projectile.frameCount, 24);
  assert.equal(profile.projectile.rows * profile.projectile.columns, 24);
});

test("rejects projectile grids whose rows and columns do not match frame count", () => {
  assert.throws(
    () => createStudioPlantCombatProfile({
      behavior: "projectile",
      projectile: { ...baseProjectile, frameCount: 9, rows: 2, columns: 4 }
    }),
    /frame count must match/
  );
});

test("rejects projectile frame counts outside the 1–24 range", () => {
  for (const frameCount of [0, 25]) {
    assert.throws(
      () => createStudioPlantCombatProfile({
        behavior: "projectile",
        projectile: { ...baseProjectile, frameCount, rows: 1, columns: frameCount }
      }),
      /frame count must match/
    );
  }
});
