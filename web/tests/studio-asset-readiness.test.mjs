import test from "node:test";
import assert from "node:assert/strict";
import { auditStudioAssetRegistry } from "../game/studio/assetReadiness.mjs";
import { createStudioPlantCombatProfile } from "../game/studio/plantProfiles.mjs";
import { createStudioAnimationProfile } from "../game/studio/animationProfiles.mjs";
import { createStudioMonsterProfile } from "../game/studio/monsterProfiles.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiSource = readFileSync(path.join(root, "app/api/studio/testing/route.js"), "utf8");
function validPlant(overrides = {}) {
  return {
    id: "thorn-plant", name: "Thorn Plant", type: "plant", status: "published",
    path: "/assets/plants/thorn-plant.png", rows: 3, columns: 3, spriteSheet: true,
    combat: createStudioPlantCombatProfile({
      behavior: "projectile",
      projectile: { id: "thorn-shot", filename: "thorn-shot.png", path: "/assets/projectiles/thorn-shot.png", managed: true }
    }),
    animationProfile: createStudioAnimationProfile(null, 9),
    ...overrides
  };
}
function validProjectile() {
  return { id: "thorn-shot", name: "Thorn Shot", type: "plantProjectile", status: "published", path: "/assets/projectiles/thorn-shot.png" };
}
function validMonster(overrides = {}) {
  return {
    id: "cave-scout", name: "Cave Scout", type: "monster", status: "published",
    path: "/assets/monsters/cave-scout.png", rows: 3, columns: 3, spriteSheet: true,
    monsterProfile: createStudioMonsterProfile(),
    animationProfile: createStudioAnimationProfile(null, 9),
    ...overrides
  };
}

test("reports a clean plant, managed projectile, and monster as runtime ready", () => {
  const report = auditStudioAssetRegistry([validPlant(), validProjectile(), validMonster()]);
  assert.equal(report.total, 3);
  assert.equal(report.ready, 3);
  assert.equal(report.blocked, 0);
  assert.equal(report.assets.find((asset) => asset.id === "thorn-plant").dependentCount, 0);
});
test("blocks a plant whose managed projectile is missing from the asset registry", () => {
  const report = auditStudioAssetRegistry([validPlant()]);
  const plant = report.assets[0];
  assert.equal(plant.readiness, "blocked");
  assert.ok(plant.errors.some((message) => message.includes("غير محلولة")));
});
test("blocks stale managed projectile paths and orphan projectile links", () => {
  const stalePlant = validPlant({
    combat: createStudioPlantCombatProfile({
      behavior: "projectile",
      projectile: { id: "thorn-shot", path: "/assets/projectiles/old-thorn-shot.png", managed: true }
    })
  });
  const orphanPlant = validPlant({
    combat: createStudioPlantCombatProfile({ behavior: "melee" })
  });
  orphanPlant.combat = { ...orphanPlant.combat, projectile: { id: "unused-shot", path: "/assets/projectiles/unused.png", managed: false } };
  const report = auditStudioAssetRegistry([stalePlant, validProjectile(), orphanPlant]);
  assert.equal(report.assets.find((asset) => asset.id === "thorn-plant").readiness, "blocked");
  assert.equal(report.assets.find((asset) => asset.id === "thorn-plant").errors.some((message) => message.includes("لا يطابق")), true);
  assert.equal(report.assets.find((asset) => asset.id === "thorn-plant").readiness, "blocked");
  assert.ok(report.assets.find((asset) => asset.id === "thorn-plant").errors.length > 0);
});
test("blocks invalid animation ranges and invalid monster profiles", () => {
  const plant = validPlant({ animationProfile: { idle: { startFrame: 0, endFrame: 12, fps: 6, loop: true } } });
  const monster = validMonster({ monsterProfile: { baseArchetype: "not-a-monster" } });
  const report = auditStudioAssetRegistry([plant, monster]);
  assert.equal(report.blocked, 2);
});
test("marks draft and testing assets as warnings and archived assets as excluded", () => {
  const draft = validProjectile();
  draft.id = "draft-shot"; draft.status = "draft";
  const testing = validProjectile();
  testing.id = "testing-shot"; testing.status = "testing";
  const archived = validProjectile();
  archived.id = "archived-shot"; archived.status = "archived";
  const report = auditStudioAssetRegistry([draft, testing, archived]);
  assert.equal(report.warning, 2);
  assert.equal(report.excluded, 1);
});
test("blocks duplicate identifiers and unsafe file paths", () => {
  const first = validProjectile();
  const second = { ...validProjectile(), path: "/assets/../private/file.png" };
  const report = auditStudioAssetRegistry([first, second]);
  assert.equal(report.blocked, 2);
  assert.ok(report.assets.every((asset) => asset.errors.some((message) => message.includes("المعرّف"))));
});
test("Testing Lab API is session-protected and labels its limited audit scope", () => {
  assert.match(apiSource, /verifyStudioSession/);
  assert.match(apiSource, /if \(!authorized\(req\)\)/);
  assert.match(apiSource, /auditStudioAssetRegistry/);
  assert.match(apiSource, /registry-and-runtime-contracts/);
  assert.match(apiSource, /لا يشغّل معركة Phaser/);
  assert.match(apiSource, /Cache-Control.*private, no-store/);
});
