import {resolveWaveSpawnStep} from "../game/rules/combatSimulation.mjs";
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
 assert.match(manager,/لا يحذفان الأصل من المكتبة/);
 assert.match(manager,/spawnIntervalMs/);
 assert.match(manager,/\/stage\/1\/select\?stage=\"\+stage/);
 assert.match(manager,/hpMultiplier/);
});

test("battle consumes configured monster counts, timings, strength and plant limits",()=>{
 const battle=read("game/scenes/BattleScene.js");
 assert.match(battle,/stage-encounter-config/);
 assert.match(battle,/new URLSearchParams\(window\.location\.search\)\.get\("stage"\)/);
 assert.match(battle,/stages\?\.\[String\(this\.stageNumber\)\]/);
 assert.match(battle,/this\.totalWaves = this\.stageWaveCount/);
 assert.match(battle,/this\.stageNumber === 1 && this\.wave === this\.totalWaves/);
 assert.match(battle,/if \(this\.stageNumber !== 1\) \{\s*this\.endGame\(true\)/);
 assert.match(battle,/getStageWaveSize/);
 assert.match(battle,/totalConfiguredMonsters/);
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
 assert.match(selection,/new URLSearchParams\(window\.location\.search\)\.get\("stage"\)/);
 assert.match(selection,/stages\?\.\[String\(activeStage\)\]/);
 assert.match(selection,/router\.push\("\/game\?stage=" \+ stageNumber\)/);
 assert.match(selection,/setStagePlantsConfigured\(configuredStage\?\.plantsConfigured === true\)/);
 assert.match(selection,/farmVsMonsters\.selectedPlants\.stage\.\" \+ activeStage/);
 assert.match(selection,/window\.localStorage\.setItem\("farmVsMonsters\.selectedPlants", savedSelection\)/);
 assert.match(selection,/selectedPlants\.length < minimumSeeds/);
});

test("configured first spawn delay is not overwritten and dragon waits for the configured final spawn",()=>{
 const battle=read("game/scenes/BattleScene.js");
 assert.match(battle,/const firstStageMonster = this\.getStageMonsterEntry\(0\);\s*this\.spawnTimer = this\.stageMonsterRosterConfigured && firstStageMonster \? Math\.max\(0, Number\(firstStageMonster\.firstSpawnDelayMs\) \|\| 0\) : PHASE_ONE_TIMING\.firstMonsterSpawnDelayMs;/);
 assert.doesNotMatch(battle,/this\.combatClockMs = 0;\s*this\.spawnTimer = PHASE_ONE_TIMING\.firstMonsterSpawnDelayMs;/);
 assert.match(battle,/this\.wave === this\.totalWaves && this\.spawnedThisWave === this\.waveSize\) this\.beginDragonEncounter\(\)/);
 assert.doesNotMatch(battle,/this\.wave === 5 && this\.spawnedThisWave === 2/);
});


test("non-story configured stages can finish without requiring the Stage 1 dragon rescue",()=>{
 const battle=read("game/scenes/BattleScene.js");
 assert.match(battle,/won = Boolean\(won && \(this\.stageNumber !== 1 \|\| this\.phaseOneStoryState === "complete"\)\)/);
 assert.doesNotMatch(battle,/if \(won && this\.stageNumber === 1\)/);
 assert.match(battle,/A local victory is a playtest result/);
});


test("configured stages support up to ten waves in the shared spawn simulation",()=>{
 const step=resolveWaveSpawnStep({wave:6,totalWaves:10,waveSize:2,spawnedThisWave:0,intermissionMs:0,spawnTimerMs:0,spawnIntervalMs:900,deltaMs:16});
 assert.equal(step.shouldSpawn,true);
 assert.equal(step.spawnedThisWave,1);
});

test("configured zero and per-entry first-spawn delays are honored",()=>{
 const battle=read("game/scenes/BattleScene.js");
 assert.match(battle,/this\.stageMonsterRosterConfigured && firstStageMonster \? Math\.max\(0, Number\(firstStageMonster\.firstSpawnDelayMs\) \|\| 0\)/);
 assert.match(battle,/nextEntry\.key !== spawnedEntry\?\.key/);
 assert.match(battle,/Math\.max\(0, Number\(nextEntry\.firstSpawnDelayMs\) \|\| 0\)/);
});


test("stage roster management shows real plant and monster artwork for library and configured entries",()=>{
 const manager=read("app/studio/StageRosterManager.jsx");
 assert.match(manager,/BUILTIN_IMAGES/);
 assert.match(manager,/previewUrl\|\|asset\?\.path/);
 assert.match(manager,/stage-roster-asset-grid/);
 assert.match(manager,/<AssetImage asset=\{asset\} kind=\{kind\}/);
 assert.match(manager,/assetById\.get\(entry\.id\)/);
 assert.match(manager,/\/assets\/characters\/monsters\/01\/01\.png/);
 assert.match(manager,/\/assets\/plants\/radish-level-1\.png/);
 const styles=read("app/studio/stage-roster.css");
 assert.match(styles,/\.stage-roster-image/);
 assert.match(styles,/\.stage-roster-asset-card\.is-selected/);
});

test("stage roster saves remain connected to the same runtime encounter API",()=>{
 const manager=read("app/studio/StageRosterManager.jsx");
 const battle=read("game/scenes/BattleScene.js");
 const selection=read("app/stage/1/select/page.js");
 assert.match(manager,/fetch\("\/api\/studio\/stage-encounters"/);
 assert.match(manager,/method:"PATCH"/);
 assert.match(battle,/this\.load\.json\("stage-encounter-config", "\/api\/studio\/stage-encounters"\)/);
 assert.match(selection,/fetch\("\/api\/studio\/stage-encounters"/);
});
