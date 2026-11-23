import test from "node:test";
import assert from "node:assert/strict";
import { createStudioPlantCombatProfile } from "../game/studio/plantProfiles.mjs";

test("stores all projectile tuning values on projectile plant profiles", () => {
  const profile = createStudioPlantCombatProfile({
    behavior: "projectile",
    projectile: {
      id: "test-plant-projectile",
      path: "/assets/projectiles/plants/test-plant-projectile.png",
      filename: "test-plant-projectile.png"
    },
    projectileSpeed: 640,
    projectileHeight: 125,
    projectileEffectColor: "#35a8ef",
    projectileRotation: 90
  });

  assert.equal(profile.mode, "projectile");
  assert.equal(profile.projectileSpeed, 640);
  assert.equal(profile.projectileHeight, 125);
  assert.equal(profile.projectileEffectColor, "#35a8ef");
  assert.equal(profile.projectileRotation, 90);
});

test("retains projectile tuning values without attaching a projectile to other behaviors", () => {
  const profile = createStudioPlantCombatProfile({
    behavior: "melee",
    projectileSpeed: 520,
    projectileHeight: 75,
    projectileEffectColor: "#aabbcc",
    projectileRotation: 180
  });

  assert.equal(profile.mode, "melee");
  assert.equal(profile.projectile, null);
  assert.equal(profile.projectileSpeed, 520);
  assert.equal(profile.projectileHeight, 75);
  assert.equal(profile.projectileEffectColor, "#aabbcc");
  assert.equal(profile.projectileRotation, 180);
});

test("accepts and preserves negative projectile rotation", () => {
  const profile = createStudioPlantCombatProfile({
    behavior: "melee",
    projectileRotation: -45
  });
  assert.equal(profile.projectileRotation, -45);
});

test("rejects invalid projectile tuning values", () => {
  assert.throws(
    () => createStudioPlantCombatProfile({ behavior: "melee", projectileSpeed: 59 }),
    /projectileSpeed/
  );
  assert.throws(
    () => createStudioPlantCombatProfile({ behavior: "melee", projectileHeight: 301 }),
    /projectileHeight/
  );
  assert.throws(
    () => createStudioPlantCombatProfile({ behavior: "melee", projectileEffectColor: "orange" }),
    /projectileEffectColor/
  );
  assert.throws(
    () => createStudioPlantCombatProfile({ behavior: "melee", projectileRotation: 361 }),
    /projectileRotation/
  );
  assert.throws(
    () => createStudioPlantCombatProfile({ behavior: "melee", projectileRotation: -361 }),
    /projectileRotation/
  );
});
