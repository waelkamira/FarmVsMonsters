import test from "node:test";
import assert from "node:assert/strict";
import { getProjectileTrajectoryOffset, normalizeProjectilePathPoints } from "../game/studio/projectileTrajectory.mjs";
import { createStudioPlantCombatProfile } from "../game/studio/plantProfiles.mjs";

test("freeform trajectory passes through every authored waypoint",()=>{
 const points=[{progress:0,x:0,y:0},{progress:.3,x:70,y:180},{progress:.72,x:-90,y:260},{progress:1,x:0,y:0}];
 for(const point of points){
  const result=getProjectileTrajectoryOffset({type:"custom",progress:point.progress,points});
  assert.equal(result.x,point.x);
  assert.ok(Math.abs(result.y-point.y)<1e-9);
 }
});

test("freeform trajectory remains smooth with uneven waypoint spacing",()=>{
 const points=normalizeProjectilePathPoints([{progress:0,x:0,y:0},{progress:.2,x:80,y:150},{progress:.9,x:180,y:40},{progress:1,x:0,y:0}]);
 const before=getProjectileTrajectoryOffset({progress:.2-1e-5,points});
 const at=getProjectileTrajectoryOffset({progress:.2,points});
 const after=getProjectileTrajectoryOffset({progress:.2+1e-5,points});
 assert.ok(Math.abs(before.x-at.x)<.02);
 assert.ok(Math.abs(after.x-at.x)<.02);
});

test("waypoint validation requires start, end, unique progress and bounded offsets",()=>{
 assert.throws(()=>normalizeProjectilePathPoints([{progress:0,x:0,y:0},{progress:.4,x:0,y:0}]),/start at 0 and end at 1/);
 assert.throws(()=>normalizeProjectilePathPoints([{progress:0,x:0,y:0},{progress:.5,x:1200,y:0},{progress:1,x:0,y:0}]),/Invalid projectile path/);
 assert.throws(()=>normalizeProjectilePathPoints([{progress:0,x:0,y:0},{progress:.5,x:1,y:1},{progress:.5,x:2,y:2},{progress:1,x:0,y:0}]),/distinct progress/);
});

test("studio plant combat profile persists custom path and draggable launch position",()=>{
 const profile=createStudioPlantCombatProfile({
  behavior:"projectile",
  projectile:{id:"seed",path:"/assets/seed.png",frameCount:1,rows:1,columns:1},
  projectileTrajectoryType:"custom",
  projectilePathPoints:[{progress:0,x:0,y:0},{progress:.45,x:55,y:170},{progress:1,x:0,y:0}],
  projectileLaunchOffsetX:125,
  projectileLaunchOffsetY:-95,
  projectileHeight:-40
 });
 assert.deepEqual(profile.projectilePathPoints,[{progress:0,x:0,y:0},{progress:.45,x:55,y:170},{progress:1,x:0,y:0}]);
 assert.equal(profile.projectileLaunchOffsetX,125);
 assert.equal(profile.projectileLaunchOffsetY,-95);
 assert.equal(profile.projectileHeight,-40);
});
