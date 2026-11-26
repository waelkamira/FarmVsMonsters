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
 assert.match(manager,/الإظهار والإخفاء والفتح والإغلاق هنا يخص المرحلة المحددة فقط/);
 assert.match(manager,/spawnIntervalMs/);
 assert.match(manager,/async function testStage\(\)/);
 assert.match(manager,/await persistConfig\(\);\s*router\.push\("\/stage\/1\/select\?stage="\+stage\+"&studioPlaytest=1"\)/);
 assert.match(manager,/disabled=\{busy\|\|loading\}/);
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
 assert.match(selection,/router\.push\("\/game\?stage=" \+ stageNumber \+ \(studioPlaytest \? "&studioPlaytest=1" : ""\)\)/);
 assert.match(selection,/setStagePlantsConfigured\(publishedStage\)/);
 assert.match(selection,/farmVsMonsters\.selectedPlants\.stage\.\" \+ activeStage/);
 assert.match(selection,/window\.localStorage\.setItem\("farmVsMonsters\.selectedPlants", savedSelection\)/);
 assert.match(selection,/selectedPlants\.length < minimumSeeds/);
});

test("configured first spawn delay is not overwritten and final wave has no boss trigger",()=>{
 const battle=read("game/scenes/BattleScene.js");
 assert.match(battle,/const firstStageMonster = this\.getStageMonsterEntry\(0\);\s*this\.spawnTimer = this\.stageMonsterRosterConfigured && firstStageMonster \? Math\.max\(0, Number\(firstStageMonster\.firstSpawnDelayMs\) \|\| 0\) : PHASE_ONE_TIMING\.firstMonsterSpawnDelayMs;/);
 assert.doesNotMatch(battle,/this\.combatClockMs = 0;\s*this\.spawnTimer = PHASE_ONE_TIMING\.firstMonsterSpawnDelayMs;/);
 assert.doesNotMatch(battle,/dragon|beginDragonEncounter/i);
 assert.doesNotMatch(battle,/this\.wave === 5 && this\.spawnedThisWave === 2/);
});


test("all configured stages can finish directly after their final wave",()=>{
 const battle=read("game/scenes/BattleScene.js");
 assert.match(battle,/won = Boolean\(won\)/);
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

test("Studio stage playtests bypass the campaign-only second seed picker",()=>{
 const gamePage=read("app/game/page.js");
 assert.match(gamePage,/const stageParam = new URLSearchParams\(locationSearch\)\.get\("stage"\)/);
 assert.match(gamePage,/const isStagePlaytest = stageParam !== null && Number\.isInteger\(Number\(stageParam\)\) && Number\(stageParam\) >= 1/);
 assert.match(gamePage,/useSyncExternalStore\(subscribeToLocation, getLocationSearchSnapshot/);
 assert.match(gamePage,/const showBattle = battleStarted \|\| \(isStagePlaytest && \(!studioPlaytestRequested \|\| authorizedStudioPlaytest\)\)/);
 assert.doesNotMatch(gamePage,/would overwrite Studio-selected plants/);
});

test("battle seed bank uses the configured stage roster instead of campaign unlocks",()=>{
 const battle=read("game/scenes/BattleScene.js");
 assert.match(battle,/const stageAllowedTypes = this\.stagePlantRosterConfigured && !this\.isStudioPlaytest/);
 assert.match(battle,/stageAllowedTypes\.has\(type\)/);
 assert.match(battle, /"hazelnut-level-1": "hazelnut"/);
 assert.match(battle,/const stageAllowedTypes = this\.stagePlantRosterConfigured && !this\.isStudioPlaytest/);
 assert.match(battle,/requestedLoadout\.filter\(\(type\) => availableTypes\.has\(type\)\)/);
 assert.match(battle,/if \(!this\.stagePlantRosterConfigured && !this\.isStudioPlaytest\) \{/);
});


test("Studio admin playtests bypass campaign locks and stage roster restrictions without changing normal play",()=>{
 const battle=read("game/scenes/BattleScene.js");
 const selection=read("app/stage/1/select/page.js");
 const manager=read("app/studio/StageRosterManager.jsx");
 assert.match(manager,/studioPlaytest=1/);
 assert.match(selection,/get\("studioPlaytest"\) === "1" && studioSession\?\.authenticated === true/);
 assert.match(selection,/fetch\("\/api\/studio\/session"/);
 assert.match(read("app/game/page.js"),/fetch\("\/api\/studio\/session"/);
 assert.match(read("app/game/page.js"),/blockStudioPlaytest/);
 assert.match(selection,/const publishedStage = configuredStage\?\.published === true && configuredStage\?\.plantsConfigured === true/);
 assert.match(selection,/const safeUnlocked = isStudioPlaytest/);
 assert.match(selection,/publishedStage\s*\? \[\.\.\.new Set\(stageUnlockedIds\)\]/);
 assert.match(selection,/entry\.unlocked !== false/);
 assert.match(selection,/entry\.visible !== false && entry\.enabled !== false/);
 assert.match(selection,/plant\.required && !studioPlaytest/);
 assert.match(selection,/studioPlaytest \? "&studioPlaytest=1" : ""/);
 assert.match(battle,/get\("studioPlaytest"\) === "1"/);
 assert.match(battle,/this\.stagePlantRosterConfigured && !this\.isStudioPlaytest/);
 assert.match(battle,/this\.isStudioPlaytest \|\| PLAYTEST_ALL_PLANTS \|\| unlocked\.has\(type\)/);
 assert.match(battle,/!this\.isStudioPlaytest && !PLAYTEST_ALL_PLANTS && !studioPlant/);
 assert.match(battle,/this\.stagePlantRosterConfigured && !this\.isStudioPlaytest && !stagePlantEntry/);
 assert.match(battle,/if \(!this\.stagePlantRosterConfigured && !this\.isStudioPlaytest\)/);
 assert.match(battle,/this\.isStudioPlaytest\s*\? \[\.\.\.new Set\(\[\.\.\.campaignUnlocked, \.\.\.ALL_PLAYTEST_PLANT_IDS/);
});

test("stage publication controls player-visible plants, per-stage unlocks and battlefield background",()=>{
 const api=read("app/api/studio/stage-encounters/route.js");
 const manager=read("app/studio/StageRosterManager.jsx");
 const selection=read("app/stage/1/select/page.js");
 const battle=read("game/scenes/BattleScene.js");
 assert.match(api,/visible:item\.visible!==false && item\.enabled!==false/);
 assert.match(api,/unlocked:item\.unlocked!==false/);
 assert.match(api,/published:raw\?\.published===true/);
 assert.match(api,/background=typeof raw\?\.background==="string"/);
 assert.match(api,/export async function GET\(req\)/);
 assert.match(api,/if\(authorized\(req\)\)/);
 assert.match(api,/filter\(\(\[,stage\]\)=>stage\.published===true\)/);
 assert.match(api,/plants:stage\.plants\.filter\(plant=>plant\.visible!==false&&plant\.enabled!==false\)/);
 assert.match(manager,/async function publishStage\(\)/);
 assert.match(manager,/published:true/);
 assert.match(manager,/published:false/);
 assert.match(manager,/حفظ كمسودة/);
 assert.match(manager,/نشر المرحلة للاعبين/);
 assert.match(manager,/إظهار للاعب/);
 assert.match(manager,/إبقاء النبتة مقفولة/);
 assert.match(manager,/خلفية المرحلة/);
 assert.match(selection,/configuredStage\?\.published === true/);
 assert.match(selection,/visibleStageEntries\.filter\(entry => entry\.unlocked !== false\)/);
 assert.match(selection,/This plant is locked for this stage/);
 assert.match(battle,/this\.stageEncounterConfig\?\.published === true \|\| this\.isStudioPlaytest/);
 assert.match(battle,/entry\.unlocked !== false/);
 assert.match(battle,/stage-background/);
 assert.match(battle,/backgroundKey/);
});
