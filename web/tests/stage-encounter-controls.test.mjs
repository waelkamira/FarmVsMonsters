import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(resolve(root,path),"utf8");

test("Studio exposes dedicated stage monster and plant management screens",()=>{
 const studio=read("app/studio/page.js");
 assert.match(studio,/\/studio\/stages\/monsters/);
 assert.match(studio,/\/studio\/stages\/plants/);
 assert.match(read("app/studio/stages/monsters/page.js"),/kind="monster"/);
 assert.match(read("app/studio/stages/plants/page.js"),/kind="plant"/);
});

test("stage roster controls default to one and keep hiding separate from asset deletion",()=>{
 const manager=read("app/studio/StageRosterManager.jsx");
 assert.match(manager,/quantity,setQuantity\]=useState\(1\)/);
 assert.match(manager,/count:quantity/);
 assert.match(manager,/enabled:!entry\.enabled/);
 assert.match(manager,/لا يتم حذف أي ملف أو أصل/);
 assert.match(manager,/spawnIntervalMs/);
 assert.match(manager,/hpMultiplier/);
});

test("battle consumes configured monster counts, timings, strength and plant limits",()=>{
 const battle=read("game/scenes/BattleScene.js");
 assert.match(battle,/stage-encounter-config/);
 assert.match(battle,/getStageWaveSize/);
 assert.match(battle,/spawnIntervalMs:\s*this\.getStageMonsterEntry/);
 assert.match(battle,/stageEntry\.hpMultiplier/);
 assert.match(battle,/stageEntry\.speedMultiplier/);
 assert.match(battle,/stagePlantRosterConfigured/);
 assert.match(battle,/stagePlantEntry\.count/);
});

test("stage seed selection respects only enabled plants for a configured stage",()=>{
 const selection=read("app/stage/1/select/page.js");
 assert.match(selection,/plantsConfigured/);
 assert.match(selection,/entry\.enabled !== false/);
});
