import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/studio/page.js", import.meta.url), "utf8");

test("Studio Rig Library filters rigged and unrigged assets through the existing registry", () => {
  assert.match(page, /rigLibraryFilter/);
  assert.match(page, /value="rigged"/);
  assert.match(page, /value="unrigged"/);
  assert.match(page, /asset\.rigProfile\?\.bones/);
  assert.match(page, /rigBuildManifest\?\.parts/);
});

test("Rig Library search includes part roles, bone names, and attachment names", () => {
  assert.match(page, /part\.role/);
  assert.match(page, /bone\.name/);
  assert.match(page, /bone\.id/);
  assert.match(page, /attachment\.name/);
  assert.match(page, /attachment\.id/);
  assert.match(page, /مكتبة الأصول والهياكل/);
});
