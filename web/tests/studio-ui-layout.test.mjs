import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/studio/page.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
const editor = readFileSync(new URL("../app/studio/ProjectileTrajectoryEditor.jsx", import.meta.url), "utf8");
const profile = readFileSync(new URL("../game/studio/plantProfiles.mjs", import.meta.url), "utf8");
const assetDetails = readFileSync(new URL("../app/studio/assets/[id]/page.js", import.meta.url), "utf8");

test("Studio asset library is five viewport-heights tall and scrolls its own list", () => {
  assert.match(page, /className="studio-panel studio-library-panel"/);
  assert.match(css, /\.studio-library-panel\{height:500vh;height:500svh;min-height:2500px;max-height:none/);
  assert.match(css, /\.studio-library-panel>\.studio-list\{flex:1;min-height:0;max-height:none;overflow-y:auto/);
  assert.doesNotMatch(css, /\.studio-list\{[^}]*max-height:320px/);
});

test("Studio projectile rotation accepts signed degrees and persists negative values", () => {
  assert.match(editor, /دوران القذيفة \(درجة\)<input[^>]*min="-360" max="360"/);
  assert.match(editor, /clamp\(rotation,-360,360\)/);
  assert.match(profile, /projectileRotation: \[-360, 360\]/);
});


test("Studio animation preview defaults to all frames and supports selecting one row", () => {
  assert.match(page, /\[animationRow,setAnimationRow\]=useState\(0\)/);
  assert.match(page, /const totalFrames=animationRow===0\?rows\*columns:columns/);
  assert.match(page, /const previewFrameCount=animationRow===0\?rows\*columns:columns/);
  assert.match(page, /const previewRowIndex=animationRow===0\?Math\.floor\(safePreviewFrame\/columns\):safeAnimationRow-1/);
  assert.match(page, /صف الحركة \(0 = كل الصفوف\)<input type="number" min="0"/);
  assert.match(page, /القيمة 0 تعرض جميع إطارات Sprite Sheet بالتتابع/);
  assert.match(page, /function cancelEdit\(\)\{setAnimationRow\(0\);setAnimationPlaying\(false\);/);
});

test("Studio defines a per-plant and per-monster animation speed multiplier", () => {
  assert.match(page, /مضاعف سرعة الأنيميشن/);
  assert.match(page, /speedMultiplier:1,idle:/);
  assert.match(page, /animationProfile\.speedMultiplier\?\?editingAsset\?\.animationProfile\?\.speedMultiplier\?\?1/);
  assert.match(page, /const previewFps=animationFps\*Number\(animationProfile\.speedMultiplier/);
  assert.match(page, /1000\/previewFps/);
  assert.match(assetDetails, /asset\.animationProfile\.speedMultiplier \?\? 1/);
});

test("Studio animation preview supports precise previous and next frame stepping", () => {
  assert.match(page, /function stepPreviewFrame\(direction\)\{setAnimationPlaying\(false\);setPreviewFrameColumn\(current=>\(current\+direction\+previewFrameCount\)%previewFrameCount\);\}/);
  assert.match(page, /aria-label="الإطار السابق" onClick=\{\(\)=>stepPreviewFrame\(-1\)\}/);
  assert.match(page, /aria-label="الإطار التالي" onClick=\{\(\)=>stepPreviewFrame\(1\)\}/);
  assert.match(page, /الإطار \{safePreviewFrame\+1\} من \{previewFrameCount\}/);
  assert.match(css, /\.studio-frame-navigation\{display:flex/);
});

test("Studio plant and monster previews can toggle horizontal character direction", () => {
  assert.match(page, /\[plantPreviewFlipped,setPlantPreviewFlipped\]=useState\(false\)/);
  assert.match(page, /scaleX\(\$\{plantPreviewFlipped\?-1:1\}\) scale\(\$\{type==="plant"\?plantSizePercent\/100:1\}\)/);
  assert.match(page, /\(type==="plant"\|\|type==="monster"\)&&<div className="studio-direction-controls"><button type="button" aria-pressed=\{plantPreviewFlipped\} onClick=\{\(\)=>setPlantPreviewFlipped\(current=>!current\)\}>Flip Character Direction<\/button><\/div>/);
  assert.match(css, /\.studio-direction-controls button\{/);
});

test("Studio shows the same test and publish action controls for new plant and monster assets", () => {
  assert.match(page, /data-asset-type=\{a\.type\} data-asset-status=\{a\.status\}/);
  assert.match(page, /\(a\.type===\"plant\"\|\|a\.type===\"monster\"\)&&<>/);
  assert.match(page, /data-testid=\"studio-prepare-test\" disabled=\{!authenticated\|\|busy\|\|a\.status!==\"draft\"\}/);
  assert.match(page, /data-testid=\"studio-publish\" disabled=\{!authenticated\|\|busy\|\|a\.status!==\"testing\"\}/);
  assert.match(page, /اختبار الوحش داخل اللعبة/);
  assert.match(page, /الأصل متاح الآن للاختبار مباشرة داخل اللعبة/);
  assert.match(css, /\.studio-list \.studio-asset-row>\.studio-asset-actions\{display:flex!important;visibility:visible!important/);
});
