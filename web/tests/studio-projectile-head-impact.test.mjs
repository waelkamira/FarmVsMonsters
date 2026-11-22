import test from "node:test";
import assert from "node:assert/strict";
import { getProjectileHeadCorrection } from "../game/studio/projectileTrajectory.mjs";

test("Studio projectile path endpoint is corrected onto the monster head",()=>{
 const correctionAtStart=getProjectileHeadCorrection({progress:0,targetX:420,targetY:155,trajectoryEndX:360,trajectoryEndY:240});
 assert.deepEqual(correctionAtStart,{x:0,y:0});
 const correctionAtHalf=getProjectileHeadCorrection({progress:.5,targetX:420,targetY:155,trajectoryEndX:360,trajectoryEndY:240});
 assert.deepEqual(correctionAtHalf,{x:30,y:-42.5});
 const correctionAtEnd=getProjectileHeadCorrection({progress:1,targetX:420,targetY:155,trajectoryEndX:360,trajectoryEndY:240});
 assert.deepEqual({x:360+correctionAtEnd.x,y:240+correctionAtEnd.y},{x:420,y:155});
});
