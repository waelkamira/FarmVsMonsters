import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/monsters/page.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/game-glass-theme.css", import.meta.url), "utf8");

test("monster bestiary uses its dedicated compact glass-codex layout", () => {
  assert.match(page, /className="monster-codex"/);
  assert.match(page, /monster-codex-grid/);
  assert.match(page, /monster-entry/);
  assert.match(styles, /\.monster-codex\{/);
  assert.match(styles, /\.monster-entry\{/);
  assert.match(styles, /\.monster-future-grid\{/);
});

test("monster discovery remains backed by the existing persistent discovery rules", () => {
  assert.match(page, /loadDiscoveredMonsterIds\(window\.localStorage\)/);
  assert.match(page, /subscribeToBrowserStorage/);
  assert.match(page, /discoveredIds\.includes\(monster\.id\)/);
  assert.match(page, /STAGE_ONE_MONSTERS\.map/);
});

test("future monster placeholders remain non-playable catalog entries", () => {
  assert.match(page, /FUTURE_MONSTERS\.map/);
  assert.match(page, /not playable|not active enemies/i);
  assert.doesNotMatch(page, /unlockMonster|purchaseMonster|spawnMonster/);
});

test("bestiary keeps navigation to plant codex and seed selection", () => {
  assert.match(page, /href="\/plants"/);
  assert.match(page, /href="\/stage\/1\/select"/);
});
