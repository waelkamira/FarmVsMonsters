import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(resolve(root,path),"utf8");

test("stage release review matches the dark olive and gold Studio visual system",()=>{
 const css=read("app/studio/stages/review/review.css");
 const page=read("app/studio/stages/review/StageReleaseReviewClient.jsx");
 assert.match(css,/--sr-ink:#f5e8c9/);
 assert.match(css,/--sr-muted:#c4b58f/);
 assert.match(css,/--sr-gold:#e8bd65/);
 assert.match(css,/background:radial-gradient[\s\S]*linear-gradient\(145deg,#17140d,#241b12 58%,#14130d\)/);
 assert.match(css,/\.sr-detail-grid/);
 assert.match(css,/\.sr-asset-card/);
 assert.match(page,/<main className="stage-review"/);
 assert.match(page,/sr-asset-card/);
 assert.match(page,/sr-overview/);
});

test("stage review report resolves configured assets against real Studio catalogs",()=>{
 const page=read("app/studio/stages/review/StageReleaseReviewClient.jsx");
 const api=read("app/api/studio/stage-release/route.js");
 assert.match(api,/studio-plant-catalog\.json/);
 assert.match(api,/studio-monster-catalog\.json/);
 assert.match(api,/plantCatalog:\{version:plantCatalog\.version/);
 assert.match(api,/monsterCatalog:\{version:monsterCatalog\.version/);
 assert.match(api,/catalogCoverage/);
 assert.match(page,/new Map\(\(data\?\.plantCatalog\?\.plants\|\|\[\]\)\.flatMap/);
 assert.match(page,/new Map\(\(data\?\.monsterCatalog\?\.monsters\|\|\[\]\)\.flatMap/);
 assert.match(page,/meta\.combat/);
 assert.match(page,/meta\.animationProfile/);
 assert.match(page,/meta\.effects/);
 assert.match(page,/spawnIntervalMs/);
 assert.match(page,/attackIntervalMultiplier/);
 assert.match(api,/reportGeneratedAt:new Date\(\)\.toISOString\(\)/);
 assert.match(page,/data\.reportGeneratedAt/);
});

test("stage release review keeps the playtest and explicit release confirmations",()=>{
 const page=read("app/studio/stages/review/StageReleaseReviewClient.jsx");
 assert.match(page,/لا تضغط زر النشر إلا بعد حفظ التعديلات ولعب المرحلة بنفسك/);
 assert.match(page,/أؤكد|لقد لعبت المرحلة بنفسي/);
 assert.match(page,/راجعت كل البيانات والتغييرات أعلاه/);
 assert.match(page,/confirmedTested:tested,confirmedReport:reviewed,expectedReleaseSha:data\?\.releaseSha/);
});
