# Player Progress and Economy Security Audit

Date: 2026-11-15
Branch reviewed: `main`

## Current verified behavior

- `web/app/api/player/progress/route.js` authenticates the request using the player's Supabase access cookie.
- Its `PUT` handler accepts `unlockedStage`, `completedStages`, and `coins` from the browser, then upserts all three values into `player_progress` using the player's own access token.
- The RLS policies in `001_player_progress.sql` allow an authenticated player to update their own progress row.
- `playerAccount.mjs` merges local and cloud coin balances using `Math.max`, then sends that merged balance back to the same `PUT` endpoint.
- `BattleScene.js` awards `MONSTER_KILL_COIN_REWARD` in the browser, writes the result to local storage, and calls `syncPlayerProgress()` after a terminal game result.
- Migration `003_plant_catalog_and_purchases.sql` already contains a safer pattern for purchases: a database function locks the player's progress row, checks the server-owned catalog and balance, and records a ledger entry in the same transaction.

## Security conclusion

The current cloud coin balance is **not authoritative**. A signed-in browser can submit an arbitrary non-negative coin balance to the progress endpoint. Local storage is also player-controlled. Taking the maximum of local and cloud balances does not make the result trustworthy; it can propagate a modified local balance into the cloud.

The current browser also reports monster kills. The server cannot verify that a monster was actually defeated merely because the browser sends a reward request. Therefore, moving the existing per-kill reward into a database RPC that accepts a client-supplied kill count would not fix the vulnerability.

## Safe implementation boundary

Do not add a client-callable RPC that accepts a coin amount, kill count, or arbitrary reward total. Do not treat local storage as proof of earned currency.

A secure economy needs a server-verifiable game result. Viable approaches:

1. Move authoritative combat simulation and reward calculation to a trusted server; or
2. Have the server issue a short-lived, single-use signed game-session token and validate a server-verifiable completion record before crediting a fixed reward. The token must be bound to the user, stage, session, expiry, and one-time completion ID. Client-side event claims alone are not proof.

Once that trust boundary exists, one database transaction should:
- lock `player_progress` for the authenticated user;
- validate the session and completion ID, rejecting replay;
- verify the stage is the currently unlocked playable stage;
- insert a unique completion/reward ledger record;
- update completed stages, unlocked stage, and coin balance;
- return the authoritative balance and progression.

## Implemented in the repository

- Disabled the progress API `PUT` endpoint with HTTP 410; it no longer accepts client-supplied balances or stage progression.
- Added migration 004 to revoke direct client insert/update access to `player_progress`.
- Added `coins_verified` and `progress_verified`, both default false. Legacy cloud balances and stage progression are retained for audit but are not imported into local saves or used to authorize purchases.
- Blocked plant purchases unless both the progression and coin balance are verified. Existing balances are retained, not silently erased.
- Removed browser-side victory upload and removed local-to-cloud balance promotion.
- Cloud restore ignores all legacy stage and coin values unless the database explicitly marks progression as verified; it copies the coin balance only when the database separately marks coins verified.
- Kept guest play, local stage progression, and local coin saving active; account UI and setup documentation disclose the temporary cloud-sync pause.

## Remaining before cloud progression and currency can be re-enabled

- Apply migration 004 to the live Supabase project before deploying this source transition.
- Implement a trusted game-session and completion-verification boundary. A client-side victory event or kill report alone is not proof of a win.
- Add a server-authoritative, idempotent stage-completion operation that validates a one-time completion record, updates completed stages/unlocked stage, and grants a server-defined reward in one database transaction.
- Define how legacy unverified balances will be reconciled. Do not mark them verified or make them spendable based only on client/local-storage values.
- Add behavioral tests for forged balance writes, replayed completions, concurrent completion requests, cross-user access, and local/cloud reconciliation.
- Re-enable cloud progress writes only through those trusted operations; do not restore a generic client-write endpoint.

## Scope and limitations

This audit records source-level findings only. No database migration was applied to a live Supabase project, and no build, automated test suite, or browser session was run as part of this audit. A follow-up lockdown has now been implemented in the repository: migration `004_lock_unverified_player_progress.sql` revokes direct client writes, marks legacy coin balances unverified, and prevents spending from those balances. The progress API returns HTTP 410 for writes; the browser no longer uploads local progress or reports a win to the cloud. Local play and local saves remain available. This is a deliberate temporary loss of cloud write/sync functionality, not a completed secure reward system. Migration 004 has only been committed to the repository; it has **not** been applied to a live Supabase project. Cloud currency and progression must not be described as fully secure until the migration is applied and a server-verifiable game completion pipeline is implemented.


## Follow-up implementation status

The Stage 1 renderer and rules now consume a shared versioned combat contract at `web/game/rules/phaseOneCombatContract.mjs`. It centralizes the existing wave roster, plant/monster/dragon/farmer values, spawn pacing, and 8-coin ordinary-monster reward. A deterministic seeded PRNG foundation is also present at `web/game/rules/seededRandom.mjs`, with unit tests. These are preparatory refactors only: the live battle still runs in the browser and still uses Phaser randomness for gameplay choices. They do not yet make rewards server-authoritative or justify re-enabling cloud sync.



## Pure combat kernel progress
The first renderer-independent simulation module, `web/game/rules/combatSimulation.mjs`, is now used by the Phaser battle for plant placement, manual uproot/refund validation, energy pickup calculation, and HP damage resolution. This reduces duplicated client logic and creates reusable server-side rules, but does not yet establish authoritative sessions or server-verified wins. Movement, targeting, collisions, wave timing, random monster behavior, and victory conditions remain in the client.



Lane movement progress: monster local-X stepping (including blocker stop clamping) and projectile local-X advancement now use pure functions in `combatSimulation.mjs`. Collision geometry, bite reach calculation, target selection, and jump/burst timing remain in the Phaser scene.



Target selection has been extracted to pure functions for lane blockers, projectile hits, farmer melee, and dragon fireballs. The Phaser scene supplies current coordinates and dimensions; target decisions are reusable but still execute client-side. No server trust boundary has been enabled.
