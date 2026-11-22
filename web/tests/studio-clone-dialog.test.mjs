import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Studio asset cloning uses an accessible in-app dialog instead of native prompts", async () => {
  const source = await readFile(new URL("../app/studio/page.js", import.meta.url), "utf8");
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /cloneIdInputRef/);
  assert.match(source, /event\.key==="Escape"/);
  assert.doesNotMatch(source, /window\.prompt\(/);
});
