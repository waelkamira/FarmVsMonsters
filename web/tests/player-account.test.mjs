import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const accountPage = readFileSync(resolve(here, "../app/account/page.js"), "utf8");
const accountRoute = readFileSync(resolve(here, "../app/api/player/account/route.js"), "utf8");
const progressRoute = readFileSync(resolve(here, "../app/api/player/progress/route.js"), "utf8");
const migration = readFileSync(resolve(here, "../supabase/migrations/001_player_progress.sql"), "utf8");
const client = readFileSync(resolve(here, "../game/services/playerAccount.mjs"), "utf8");
const home = readFileSync(resolve(here, "../app/page.js"), "utf8");
const stages = readFileSync(resolve(here, "../app/stages/page.js"), "utf8");
const battle = readFileSync(resolve(here, "../game/scenes/BattleScene.js"), "utf8");
const styles = readFileSync(resolve(here, "../app/globals.css"), "utf8");

test("player account screen provides sign-in and account creation", () => {
  assert.match(accountPage, /signInPlayer/);
  assert.match(accountPage, /signUpPlayer/);
  assert.match(accountPage, /restoreOrInitializeCloudProgress/);
  assert.match(accountPage, /type="password"/);
  assert.match(home, /href="\/account"/);
  assert.match(stages, /href="\/account"/);
});

test("account sessions use HttpOnly cookies and never expose a service-role key", () => {
  assert.match(accountRoute, /httpOnly: true/);
  assert.match(accountRoute, /farm_player_access/);
  assert.match(accountRoute, /farm_player_refresh/);
  assert.doesNotMatch(accountRoute, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("cloud progress is isolated to the authenticated player with row-level security", () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(progressRoute, /authenticatedUser/);
  assert.match(progressRoute, /on_conflict=user_id/);
  assert.match(progressRoute, /unlocked_stage/);
  assert.match(progressRoute, /completed_stages/);
});

test("signing in restores remote progress and campaign victory syncs it back", () => {
  assert.match(client, /applyRemotePlayerProgress/);
  assert.match(client, /restoreOrInitializeCloudProgress/);
  assert.match(client, /Math\.max\(local\.unlockedStage/);
  assert.match(client, /cloudIsBehind/);
  assert.match(client, /syncPlayerProgress/);
  assert.match(battle, /syncPlayerProgress\(\)/);
});

test("menus and account controls use high-contrast text and visible focus states", () => {
  assert.match(styles, /--text-primary:\s*#fff9e9/i);
  assert.match(styles, /\.account-form input:focus/);
  assert.match(styles, /\.stage-lock-label[\s\S]*?background:#17100b/);
  assert.match(battle, /strokeThickness: 4, resolution: 2/);
});
