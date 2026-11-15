import test from "node:test";
import assert from "node:assert/strict";
import { CAMPAIGN_WORLDS, MISSIONS_PER_WORLD } from "../game/data/campaignWorlds.mjs";

test("campaign map defines eleven distinct original worlds", () => {
  assert.equal(CAMPAIGN_WORLDS.length, 11);
  const ids = CAMPAIGN_WORLDS.map((world) => world.id);
  assert.equal(new Set(ids).size, 11);
  for (const world of CAMPAIGN_WORLDS) {
    assert.ok(world.id);
    assert.ok(world.name);
    assert.ok(world.ar);
    assert.ok(world.theme);
    assert.ok(world.icon);
    assert.ok(world.description);
    assert.ok(world.descriptionAr);
  }
});

test("each campaign world reserves exactly ten mission slots", () => {
  assert.equal(MISSIONS_PER_WORLD, 10);
  assert.equal(CAMPAIGN_WORLDS.length * MISSIONS_PER_WORLD, 110);
});

test("only the first region maps to the currently implemented stage", () => {
  assert.equal(CAMPAIGN_WORLDS[0].currentStage, 1);
  assert.equal(CAMPAIGN_WORLDS.slice(1).some((world) => world.currentStage === 1), false);
});
