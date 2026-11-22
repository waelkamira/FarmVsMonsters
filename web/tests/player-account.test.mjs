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
  assert.match(accountPage, /Continue as Guest/);
  assert.match(home, /getPlayerSession\(\)/);
  assert.match(home, /restoreOrInitializeCloudProgress\(\)/);
  assert.match(stages, /loadUnlockedStage\(window\.localStorage\)/);
});

test("account sessions use HttpOnly cookies and never expose a service-role key", () => {
  assert.match(accountRoute, /httpOnly: true/);
  assert.match(accountRoute, /farm_player_access/);
  assert.match(accountRoute, /farm_player_refresh/);
  assert.doesNotMatch(accountRoute, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("cloud progress is read-only for clients until trusted game results exist", () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(progressRoute, /authenticatedUser/);
  assert.match(progressRoute, /unlocked_stage/);
  assert.match(progressRoute, /completed_stages/);
  assert.match(progressRoute, /coins_verified/);
  assert.match(progressRoute, /progress_verified/);
  assert.match(progressRoute, /status: 410/);
  assert.doesNotMatch(progressRoute, /resolution=merge-duplicates/);
});

test("local saves remain active and client balances are never uploaded to cloud", () => {
  const lockdown = readFileSync(resolve(here, "../supabase/migrations/004_lock_unverified_player_progress.sql"), "utf8");
  assert.match(lockdown, /revoke insert, update on public\.player_progress from anon, authenticated/i);
  assert.match(lockdown, /coins_verified boolean not null default false/i);
  assert.match(lockdown, /progress_verified boolean not null default false/i);
  assert.match(lockdown, /COIN_BALANCE_NOT_VERIFIED/);
  assert.match(client, /restoreOrInitializeCloudProgress/);
  assert.match(client, /progress_verified !== true/);
  assert.match(client, /cloud-progress-unverified/);
  assert.match(client, /coins_verified === true/);
  assert.match(client, /never import those unverified values/);
  assert.match(client, /coins_verified === true/);
  assert.doesNotMatch(client, /saveCloudProgress/);
  assert.doesNotMatch(battle, /syncPlayerProgress/);
});

test("menus and account controls use high-contrast text and visible focus states", () => {
  assert.match(styles, /--text-primary:\s*#fff9e9/i);
  assert.match(styles, /\.account-form input:focus/);
  assert.match(styles, /\.stage-lock-label[\s\S]*?background:#17100b/);
  assert.match(battle, /strokeThickness: 4, resolution: 2/);
});


test("playing as a guest never requires authentication and keeps local progress", () => {
  assert.match(home, /router\.push\("\/game"\)/);
  assert.match(home, /catch \{/);
  assert.match(accountPage, /Continue as Guest/);
  assert.match(accountPage, /اللعب كضيف/);
  assert.match(client, /export function readLocalPlayerProgress/);
  assert.match(battle, /saveCoins\(window\.localStorage/);
  assert.match(accountRoute, /cloudAvailable: false/);
});

test("Google OAuth uses server-side PKCE and protects the callback with state", async () => {
  const start = readFileSync(resolve(here, "../app/api/player/account/google/route.js"), "utf8");
  const callback = readFileSync(resolve(here, "../app/api/player/account/google/callback/route.js"), "utf8");
  assert.match(accountPage, /Continue with Google|المتابعة باستخدام Google/);
  assert.match(start, /code_challenge_method/);
  assert.match(start, /httpOnly: true/);
  assert.match(callback, /timingSafeEqual/);
  assert.match(callback, /grant_type=pkce/);
  assert.match(callback, /farm_player_access/);
});

test("player data migration provisions private profile, settings, achievement and inventory tables", () => {
  const dataMigration = readFileSync(resolve(here, "../supabase/migrations/002_player_data.sql"), "utf8");
  for (const table of ["player_profiles", "player_settings", "player_achievements", "player_inventory"]) {
    assert.match(dataMigration, new RegExp("create table if not exists public\\." + table));
  }
  assert.match(dataMigration, /enable row level security/i);
  assert.match(dataMigration, /auth\.uid\(\) = user_id/);
  assert.match(dataMigration, /on_auth_user_created_player_profile/);
});


test("Google OAuth CSRF state is preserved in the app callback URL, not sent as Supabase authorize state", async () => {
  const start = readFileSync(resolve(here, "../app/api/player/account/google/route.js"), "utf8");
  assert.match(start, /callback\.searchParams\.set\("state", state\)/);
  assert.match(start, /redirect_to/);
  assert.doesNotMatch(start, /authorizeUrl\.searchParams\.set\("state"/);
});

test("plant catalog includes implemented starters and a locked upcoming roster", () => {
  const catalog = readFileSync(resolve(here, "../game/data/stageOnePlants.mjs"), "utf8");
  for (const id of ["radish", "energy-mushroom", "pea-shooter", "thorn-wall", "sunflower", "ice-bloom", "double-radish", "pumpkin-guard", "explosive-berry", "snow-thrower", "pineapple", "hazelnut", "mango", "electric-mushroom"]) {
    assert.match(catalog, new RegExp('id: "' + id + '"'));
  }
  assert.match(catalog, /implemented: true/);
  assert.match(catalog, /purchasable: false/);
  assert.match(catalog, /coinPrice: 300/);
});

test("plant purchase migration uses database-owned prices and an atomic transaction", () => {
  const migration = readFileSync(resolve(here, "../supabase/migrations/003_plant_catalog_and_purchases.sql"), "utf8");
  assert.match(migration, /create table if not exists public\.stage_one_plant_catalog/i);
  assert.match(migration, /create table if not exists public\.player_coin_transactions/i);
  assert.match(migration, /create or replace function public\.purchase_player_plant/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /v_plant\.coin_price/i);
  assert.match(migration, /PLANT_NOT_AVAILABLE_FOR_PURCHASE/);
  assert.match(migration, /grant execute on function public\.purchase_player_plant\(text\) to authenticated/i);
});
