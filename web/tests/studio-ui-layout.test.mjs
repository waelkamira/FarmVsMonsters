import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/studio/page.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/studio/studio.css", import.meta.url), "utf8");
const editor = readFileSync(new URL("../app/studio/ProjectileTrajectoryEditor.jsx", import.meta.url), "utf8");
const profile = readFileSync(new URL("../game/studio/plantProfiles.mjs", import.meta.url), "utf8");

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
});
