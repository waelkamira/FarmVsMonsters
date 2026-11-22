import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/studio/page.js", import.meta.url), "utf8");

test("Studio warns before refresh or tab close when form changes are unsaved", () => {
  assert.match(source, /\[hasUnsavedChanges,setHasUnsavedChanges\]=useState\(false\)/);
  assert.match(source, /window\.addEventListener\("beforeunload",handleBeforeUnload\)/);
  assert.match(source, /event\.returnValue=""/);
  assert.match(source, /onChange=\{\(\)=>setHasUnsavedChanges\(true\)\}/);
});

test("Studio guards in-app navigation and offers an explicit discard confirmation", () => {
  assert.match(source, /onClickCapture=\{guardStudioNavigation\}/);
  assert.match(source, /لديك تعديلات غير محفوظة\. هل تريد مغادرة الصفحة وفقد هذه التعديلات؟/);
  assert.match(source, /event\.preventDefault\(\);event\.stopPropagation\(\)/);
});

test("custom rig and trajectory editors also mark programmatic edits as dirty", () => {
  assert.match(source, /onChange=\{profile=>\{setRigProfile\(profile\);setHasUnsavedChanges\(true\);\}\}/);
  assert.match(source, /setPoints=\{value=>\{setProjectilePathPoints\(value\);setHasUnsavedChanges\(true\);\}\}/);
});

test("successful save and cancel clear the unsaved-change guard", () => {
  assert.match(source, /setHasUnsavedChanges\(false\);const successText=wasReplacing/);
  assert.match(source, /function cancelEdit\(\)\{setHasUnsavedChanges\(false\)/);
});
