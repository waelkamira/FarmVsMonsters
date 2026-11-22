import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/api/studio/assets/route.js", import.meta.url), "utf8");

test("publishing an Auto-Rig manifest requires the quality validator readiness gate", () => {
  assert.match(source, /analyzeAutoRigQuality/);
  assert.match(source, /if\(asset\.rigBuildManifest\)/);
  assert.match(source, /!quality\.valid\|\|!quality\.readyForAnimation/);
  assert.match(source, /status:409/);
  assert.match(source, /فحص الجودة ومراجعة جميع الأجزاء/);
});
