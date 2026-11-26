import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getStageMonsterReferences,validateStageMonsterReferences} from "../game/studio/stageMonsterReferences.mjs";

const stages = {
  version: 1,
  stages: {
    "1": {monsters: [{key:"builtin",id:"monster-01",wave:1,enabled:true}]},
    "2": {monsters: [{key:"custom-a",id:"forest-brute",wave:3,enabled:true},{key:"custom-b",id:"forest-brute",wave:4,enabled:false}]}
  }
};

test("stage monster validation accepts the built-in Monster 01 and registered active Studio monsters",()=>{
  const assets=[{id:"forest-brute",type:"monster",status:"draft"}];
  assert.deepEqual(validateStageMonsterReferences(stages,assets),[]);
});

test("stage monster validation rejects missing and archived monsters, including disabled entries",()=>{
  const invalid={version:1,stages:{
    "4":{monsters:[
      {id:"deleted-monster",wave:2,enabled:true},
      {id:"archived-monster",wave:3,enabled:false}
    ]}
  }};
  const issues=validateStageMonsterReferences(invalid,[{id:"archived-monster",type:"monster",status:"archived"}]);
  assert.deepEqual(issues.map(item=>[item.stageId,item.wave,item.id,item.enabled]),[
    ["4",2,"deleted-monster",true],
    ["4",3,"archived-monster",false]
  ]);
});

test("monster deletion dependency lookup finds every stage and wave even when a reference is disabled",()=>{
  const references=getStageMonsterReferences(stages,"FOREST-BRUTE");
  assert.deepEqual(references.map(item=>[item.stageId,item.wave,item.enabled]),[
    ["2",3,true],
    ["2",4,false]
  ]);
});

test("Studio stage save validates references and asset deletion checks stage dependencies in both storage modes",()=>{
  const stageRoute=readFileSync(new URL("../app/api/studio/stage-encounters/route.js",import.meta.url),"utf8");
  const assetRoute=readFileSync(new URL("../app/api/studio/assets/route.js",import.meta.url),"utf8");
  assert.match(stageRoute,/validateStageMonsterReferences\(config,await readMonsterAssets\(driver\)\)/);
  assert.match(stageRoute,/status:409/);
  assert.equal((assetRoute.match(/stageReferenceConflict\(id,/g)||[]).length,2);
  assert.match(assetRoute,/getStageMonsterReferences\(config,id\)/);
  assert.match(assetRoute,/asset\.type==="monster"/);
});
