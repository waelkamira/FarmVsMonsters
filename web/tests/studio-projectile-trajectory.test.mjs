import test from "node:test";
import assert from "node:assert/strict";
import { getProjectileTrajectoryOffset } from "../game/studio/projectileTrajectory.mjs";

test("straight trajectory has no visual offset",()=>{
 assert.deepEqual(getProjectileTrajectoryOffset({type:"straight",progress:.5,height:90,curveX:80,curveY:120}),{x:0,y:0});
});
test("arc reaches configured height at midpoint and zero at endpoints",()=>{
 assert.equal(getProjectileTrajectoryOffset({type:"arc",progress:0,height:100}).y,0);
 assert.equal(getProjectileTrajectoryOffset({type:"arc",progress:.5,height:100}).y,100);
 assert.ok(Math.abs(getProjectileTrajectoryOffset({type:"arc",progress:1,height:100}).y)<1e-9);
});
test("sine path crosses baseline at midpoint and endpoints",()=>{
 assert.ok(Math.abs(getProjectileTrajectoryOffset({type:"sine",progress:.5,height:80}).y)<1e-9);
 assert.ok(Math.abs(getProjectileTrajectoryOffset({type:"sine",progress:.25,height:80}).y-80)<1e-9);
});
test("bezier offsets use quadratic midpoint weighting",()=>{
 assert.deepEqual(getProjectileTrajectoryOffset({type:"bezier",progress:.5,curveX:120,curveY:200}),{x:60,y:100});
});
test("progress is clamped to the path endpoints",()=>{
 assert.deepEqual(getProjectileTrajectoryOffset({type:"bezier",progress:-2,curveX:120,curveY:200}),{x:0,y:0});
 assert.deepEqual(getProjectileTrajectoryOffset({type:"bezier",progress:3,curveX:120,curveY:200}),{x:0,y:0});
});

import { createStudioPlantCombatProfile } from "../game/studio/plantProfiles.mjs";

test("plant combat profile persists trajectory and launch tuning",()=>{
 const profile=createStudioPlantCombatProfile({
  behavior:"projectile",
  projectile:{id:"seed",path:"/assets/seed.png",frameCount:1,rows:1,columns:1},
  projectileTrajectoryType:"bezier",
  projectileCurveX:75,
  projectileCurveY:180,
  projectileLaunchOffsetX:24,
  projectileLaunchOffsetY:-42
 });
 assert.equal(profile.projectileTrajectoryType,"bezier");
 assert.equal(profile.projectileCurveX,75);
 assert.equal(profile.projectileCurveY,180);
 assert.equal(profile.projectileLaunchOffsetX,24);
 assert.equal(profile.projectileLaunchOffsetY,-42);
});

test("plant combat profile rejects unsupported trajectory types",()=>{
 assert.throws(()=>createStudioPlantCombatProfile({
  behavior:"projectile",
  projectile:{id:"seed",path:"/assets/seed.png"},
  projectileTrajectoryType:"teleport"
 }),/trajectory type/);
});
