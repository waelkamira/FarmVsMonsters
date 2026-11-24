import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  getBrowserStorage,
  readBrowserLocale,
  readStorageValue,
  writeStorageValue
} from "../game/services/browserStorage.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const criticalFiles = [
  "../game/scenes/BattleScene.js",
  "../game/scenes/PauseScene.js",
  "../app/settings/page.js",
  "../app/LocaleProvider.jsx",
  "../app/page.js",
  "../app/stages/page.js"
];

test("browser storage adapter tolerates a missing host and a blocked storage getter", () => {
  assert.equal(getBrowserStorage(null), null);
  assert.equal(getBrowserStorage({}), null);
  const blockedHost = Object.defineProperty({}, "localStorage", {
    get() { throw new Error("SecurityError"); }
  });
  assert.equal(getBrowserStorage(blockedHost), null);
  assert.equal(readStorageValue(blockedHost, "key", "fallback"), "fallback");
  assert.equal(writeStorageValue(blockedHost, "key", "value"), false);
});

test("storage reads return the fallback for missing keys and throwing getItem calls", () => {
  const missing = { localStorage: { getItem: () => null } };
  const throwing = { localStorage: { getItem() { throw new Error("blocked"); } } };
  assert.equal(readStorageValue(missing, "key", "fallback"), "fallback");
  assert.equal(readStorageValue(throwing, "key", "fallback"), "fallback");
});

test("storage writes stringify values and report blocked writes without throwing", () => {
  const values = new Map();
  const host = { localStorage: {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value)
  } };
  assert.equal(writeStorageValue(host, "volume", 65), true);
  assert.equal(readStorageValue(host, "volume"), "65");
  assert.equal(writeStorageValue({ localStorage: { setItem() { throw new Error("quota"); } } }, "volume", 0), false);
});

test("browser locale accepts only the supported Arabic and English values", () => {
  assert.equal(readBrowserLocale({ localStorage: { getItem: () => "en" } }), "en");
  assert.equal(readBrowserLocale({ localStorage: { getItem: () => "ar" } }), "ar");
  assert.equal(readBrowserLocale({ localStorage: { getItem: () => "fr" } }), "ar");
  assert.equal(readBrowserLocale(null), "ar");
});

test("game and settings entry points never access localStorage without the safe adapter", () => {
  for (const relativePath of criticalFiles) {
    const source = readFileSync(resolve(here, relativePath), "utf8");
    assert.doesNotMatch(source, /window\.localStorage/, relativePath);
  }
  const battle = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
  const pause = readFileSync(resolve(here, "../game/scenes/PauseScene.js"), "utf8");
  assert.match(battle, /loadSavedCoins\(getBrowserStorage\(window\)\)/);
  assert.match(battle, /unlockNextStage\(getBrowserStorage\(window\), 1\)/);
  assert.match(pause, /readBrowserLocale\(/);
  assert.match(pause, /writeStorageValue\(/);
});
