import test from "node:test";
import assert from "node:assert/strict";
import {createStudioPlantCombatProfile,STUDIO_PLANT_BEHAVIORS,validateStudioPlantCombatProfile} from "../game/studio/plantProfiles.mjs";

test("an attached projectile forces projectile combat mode",()=>{
  const profile=createStudioPlantCombatProfile({projectile:{id:"bamboo-level-1-projectile",path:"/assets/projectiles/plants/bamboo-level-1-projectile.png"},behavior:"blocker"});
  assert.equal(profile.mode,"projectile");
  assert.equal(profile.projectile.id,"bamboo-level-1-projectile");
});
test("plants without projectile assets require a supported non-projectile behavior",()=>{
  for(const behavior of Object.keys(STUDIO_PLANT_BEHAVIORS)){
    const profile=createStudioPlantCombatProfile({behavior});
    assert.equal(profile.mode,behavior);
    assert.equal(profile.projectile,null);
  }
  assert.equal(validateStudioPlantCombatProfile({behavior:"unknown"}).valid,false);
});
test("behavior settings are bounded to safe gameplay ranges",()=>{
  assert.equal(validateStudioPlantCombatProfile({behavior:"melee",hp:0}).valid,false);
  assert.equal(validateStudioPlantCombatProfile({behavior:"contact",cooldownMs:10}).valid,false);
  assert.equal(validateStudioPlantCombatProfile({behavior:"energy",energyIntervalMs:2000,energyAmount:20}).valid,true);
});
test("blocker and energy templates do not receive combat damage defaults",()=>{
  assert.equal(createStudioPlantCombatProfile({behavior:"blocker"}).damage,0);
  assert.equal(createStudioPlantCombatProfile({behavior:"energy"}).damage,0);
});
