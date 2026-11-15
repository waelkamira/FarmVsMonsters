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

## Required follow-up before enabling cloud currency

- Replace the insecure progress `PUT` path with separate server-authoritative progression and reward operations.
- Restrict direct client updates to `player_progress.coins`; only trusted database functions may change the balance.
- Add a unique idempotency key for each stage completion and reward event.
- Change cloud restore so it never promotes local coins into the authoritative cloud balance.
- Keep local-only play available, but clearly distinguish its local balance from a verified account balance until sync is supported.
- Add tests for forged balances, replayed completions, concurrent reward requests, cross-user access, and cloud/local conflict handling.

## Scope and limitations

This audit records source-level findings only. No database migration was applied to a live Supabase project, and no build, automated test suite, or browser session was run as part of this audit. A follow-up lockdown has now been implemented in the repository: migration `004_lock_unverified_player_progress.sql` revokes direct client writes, marks legacy coin balances unverified, and prevents spending from those balances. The progress API returns HTTP 410 for writes; the browser no longer uploads local progress or reports a win to the cloud. Local play and local saves remain available. This is a deliberate temporary loss of cloud write/sync functionality, not a completed secure reward system. Migration 004 has only been committed to the repository; it has **not** been applied to a live Supabase project. Cloud currency and progression must not be described as fully secure until the migration is applied and a server-verifiable game completion pipeline is implemented.
