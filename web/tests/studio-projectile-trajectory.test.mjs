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
