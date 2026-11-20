import test from "node:test";
import assert from "node:assert/strict";
import {createStudioPlantCombatProfile,STUDIO_PLANT_BEHAVIORS,validateStudioPlantCombatProfile} from "../game/studio/plantProfiles.mjs";

test("manual behavior selection remains authoritative when a projectile file is attached",()=>{
  const projectile={id:"bamboo-level-1-projectile",path:"/assets/projectiles/plants/bamboo-level-1-projectile.png"};
  const profile=createStudioPlantCombatProfile({projectile,behavior:"blocker"});
  assert.equal(profile.mode,"blocker");
  assert.equal(profile.projectile,null);
});

test("projectile behavior requires an explicitly selected mode and linked projectile",()=>{
  const projectile={id:"bamboo-level-1-projectile",path:"/assets/projectiles/plants/bamboo-level-1-projectile.png"};
  assert.equal(validateStudioPlantCombatProfile({behavior:"projectile"}).valid,false);
  const profile=createStudioPlantCombatProfile({behavior:"projectile",projectile});
  assert.equal(profile.mode,"projectile");
  assert.equal(profile.projectile.id,projectile.id);
  assert.equal(profile.projectile.path,projectile.path);
});

test("plants without projectile assets retain each supported manually selected behavior",()=>{
  for(const behavior of Object.keys(STUDIO_PLANT_BEHAVIORS).filter((value)=>value!=="projectile")){
    const profile=createStudioPlantCombatProfile({behavior});
    assert.equal(profile.mode,behavior);
    assert.equal(profile.projectile,null);
  }
  assert.equal(validateStudioPlantCombatProfile({behavior:"unknown"}).valid,false);
});

test("behavior settings are bounded to safe gameplay ranges",()=>{
  assert.equal(validateStudioPlantCombatProfile({behavior:"melee",hp:0}).valid,false);
  assert.equal(validateStudioPlantCombatProfile({behavior:"contact",cooldownMs:10}).valid,false);
  assert.equal(validateStudioPlantCombatProfile({behavior:"melee",damage:0}).valid,false);
  assert.equal(validateStudioPlantCombatProfile({behavior:"energy",energyIntervalMs:2000,energyAmount:20}).valid,true);
});

test("blocker and energy templates do not receive combat damage defaults",()=>{
  assert.equal(createStudioPlantCombatProfile({behavior:"blocker"}).damage,0);
  assert.equal(createStudioPlantCombatProfile({behavior:"energy"}).damage,0);
});
