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

test("persists whether a projectile is a managed library asset or an embedded file",()=>{
  const base={id:"shot",path:"/assets/projectiles/shot.png"};
  assert.equal(createStudioPlantCombatProfile({behavior:"projectile",projectile:{...base,managed:true}}).projectile.managed,true);
  assert.equal(createStudioPlantCombatProfile({behavior:"projectile",projectile:{...base,managed:false}}).projectile.managed,false);
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

test("plant size is validated and retained as a percentage",()=>{
  const profile=createStudioPlantCombatProfile({behavior:"melee",sizePercent:135});
  assert.equal(profile.sizePercent,135);
  assert.equal(createStudioPlantCombatProfile({behavior:"melee"}).sizePercent,100);
  assert.equal(validateStudioPlantCombatProfile({behavior:"melee",sizePercent:24}).valid,false);
  assert.equal(validateStudioPlantCombatProfile({behavior:"melee",sizePercent:201}).valid,false);
});

test("blocker and energy templates do not receive combat damage defaults",()=>{
  assert.equal(createStudioPlantCombatProfile({behavior:"blocker"}).damage,0);
  assert.equal(createStudioPlantCombatProfile({behavior:"energy"}).damage,0);
});

test("projectile arc, effect color, and rotation settings are validated and retained",()=>{
  const projectile={id:"bamboo-throwing-projectile",path:"/assets/projectiles/plants/bamboo-throwing.png"};
  const profile=createStudioPlantCombatProfile({
    behavior:"projectile",projectile,projectileSpeed:420,projectileHeight:95,
    projectileEffectColor:"#32aaff",projectileRotation:135
  });
  assert.equal(profile.projectileSpeed,420);
  assert.equal(profile.projectileHeight,95);
  assert.equal(profile.projectileEffectColor,"#32aaff");
  assert.equal(profile.projectileRotation,135);
  assert.equal(validateStudioPlantCombatProfile({behavior:"projectile",projectile,projectileHeight:301}).valid,false);
  assert.equal(validateStudioPlantCombatProfile({behavior:"projectile",projectile,projectileRotation:-1}).valid,true);\n  assert.equal(validateStudioPlantCombatProfile({behavior:"projectile",projectile,projectileRotation:-361}).valid,false);
  assert.equal(validateStudioPlantCombatProfile({behavior:"projectile",projectile,projectileEffectColor:"red"}).valid,false);
});
