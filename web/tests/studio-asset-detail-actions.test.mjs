import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const detail = readFileSync(new URL("../app/studio/assets/[id]/page.js", import.meta.url), "utf8");
const studio = readFileSync(new URL("../app/studio/page.js", import.meta.url), "utf8");

test("asset details expose the same primary lifecycle actions for plants and monsters", () => {
  assert.match(detail, /href=\{"\/studio\?edit=" \+ encodeURIComponent\(asset\.id\)\}/);
  assert.match(detail, /runAssetAction\("prepare-test"\)/);
  assert.match(detail, /runAssetAction\("publish"\)/);
  assert.match(detail, /runAssetAction\("archive"\)/);
  assert.match(detail, /runAssetAction\("restore"\)/);
  assert.match(detail, /إدارة وحوش المراحل/);
  assert.match(detail, /إدارة نباتات المراحل/);
});

test("asset lifecycle actions call the authenticated Studio API and refresh the selected asset", () => {
  assert.match(detail, /fetch\("\/api\/studio\/assets",\s*\{[\s\S]*method: "PATCH"/);
  assert.match(detail, /credentials: "same-origin"/);
  assert.match(detail, /setAssets\(nextAssets\)/);
  assert.match(detail, /setAsset\(nextAsset\)/);
});

test("asset detail edit action opens the existing Studio edit workflow", () => {
  assert.match(studio, /new URLSearchParams\(window\.location\.search\)\.get\("edit"\)/);
  assert.match(studio, /beginReplace\(target\)/);
  assert.match(studio, /editRequestHandled\.current=true/);
});

test("asset detail stage-management links resolve to the dedicated plant and monster roster pages", () => {
  const monsterRoute = readFileSync(new URL("../app/studio/stages/monsters/page.js", import.meta.url), "utf8");
  const plantRoute = readFileSync(new URL("../app/studio/stages/plants/page.js", import.meta.url), "utf8");
  const rosterManager = readFileSync(new URL("../app/studio/StageRosterManager.jsx", import.meta.url), "utf8");
  assert.match(detail, /asset\.type === "monster" \? "\/studio\/stages\/monsters" : "\/studio\/stages\/plants"/);
  assert.match(monsterRoute, /StageRosterManager kind="monster"/);
  assert.match(plantRoute, /StageRosterManager kind="plant"/);
  assert.match(rosterManager, /\[selectedId,setSelectedId\][\s\S]*\[quantity,setQuantity\]=useState\(1\)/);
  assert.match(rosterManager, /count:Math\.min\(500,x\.count\+quantity\)/);
});
