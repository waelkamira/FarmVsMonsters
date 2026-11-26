import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { getAccountTabForKey } from "../app/account/accountTabs.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(resolve(here, "../app/account/page.js"), "utf8");

test("account tabs follow horizontal keyboard direction in English and Arabic", () => {
  assert.equal(getAccountTabForKey("signin", "ArrowRight", "en"), "signup");
  assert.equal(getAccountTabForKey("signup", "ArrowLeft", "en"), "signin");
  assert.equal(getAccountTabForKey("signin", "ArrowLeft", "ar"), "signup");
  assert.equal(getAccountTabForKey("signup", "ArrowRight", "ar"), "signin");
});

test("account tabs support Home and End and ignore unrelated keys", () => {
  assert.equal(getAccountTabForKey("signup", "Home", "en"), "signin");
  assert.equal(getAccountTabForKey("signin", "End", "ar"), "signup");
  assert.equal(getAccountTabForKey("signin", "Enter", "en"), null);
  assert.equal(getAccountTabForKey("unknown", "ArrowLeft", "en"), "signup");
});

test("account tab markup exposes selected state, panel relationships and roving tab stop", () => {
  assert.match(page, /role="tablist"[^>]*onKeyDown=\{handleTabKeyDown\}/);
  assert.equal((page.match(/role="tab"/g) || []).length, 2);
  assert.match(page, /aria-selected=\{mode === "signin"\}/);
  assert.match(page, /aria-selected=\{mode === "signup"\}/);
  assert.equal((page.match(/aria-controls="account-auth-panel"/g) || []).length, 2);
  assert.match(page, /role="tabpanel"[^>]*aria-labelledby=\{mode === "signin" \? "account-signin-tab" : "account-signup-tab"\}/);
  assert.match(page, /tabIndex=\{mode === "signin" \? 0 : -1\}/);
  assert.match(page, /tabIndex=\{mode === "signup" \? 0 : -1\}/);
});

test("keyboard tab changes move focus to the newly selected tab", () => {
  assert.match(page, /keyboardTabFocus\.current = true/);
  assert.match(page, /activeTab\?\.focus\(\)/);
  assert.match(page, /const nextMode = getAccountTabForKey\(mode, event\.key, locale\)/);
});
