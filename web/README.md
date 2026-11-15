# Farm Vs Monsters — Web prototype

This is the 2D browser-game implementation using Next.js, React, JavaScript, and Phaser 3. The older Unity implementation remains in the repository as a legacy reference; the active web prototype is 2D and does not require Unity.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000.

## Current prototype controls

- Click the RADISH card, then click an empty soil cell: the caveman walks there and plants the radish.
- WASD or arrow keys: move the caveman.
- Space: emergency club attack only after all planted defensive plants have been destroyed.
- The radish stays rooted and fires thorns at monsters in its lane.

## Gameplay invariants

- Plants remain fixed in their planting cells. They can breathe/idle and animate their own attacks, but never walk or chase.
- Monsters enter from the right and move left toward the farmhouse.
- The caveman plants defenders and cannot attack while at least one defensive plant is alive.
- When the last plant dies, emergency club combat becomes available. Planting a new defender ends the emergency state.
- The farmhouse is the protected objective at the left end of the field.

## Art assets

- Battlefield background target: `public/assets/backgrounds/farm-battlefield.png`
- Character and effect sprites: `public/assets/sprites/`
- The background must contain environment art only. Phaser draws the grid, plants, caveman, monsters, projectiles, HUD, and effects independently.
- See `../Documentation/PHASER_FARM_BACKGROUND_INTEGRATION.md` for the integration contract.

The current scene still uses temporary Phaser-drawn shapes for the battlefield and characters. The generated background and approved original sprite sheets will be integrated as they are supplied.


## Player accounts and cloud progress

1. Create a Supabase project.
2. Copy `web/.env.example` to `web/.env.local` and fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY` from Project Settings -> API.
3. Run `web/supabase/migrations/001_player_progress.sql` in the Supabase SQL Editor.
4. In Supabase Authentication -> Providers, enable Google and add the Google OAuth Client ID and Client Secret. In Google Cloud Console, create an OAuth 2.0 Web Client and add this exact Supabase callback URL to its Authorized redirect URIs: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
5. In Supabase Authentication -> URL Configuration, set the local and production Site URLs. Add these Redirect URLs to the allow list: `http://localhost:3000/api/player/account/google/callback**` and `https://YOUR_GAME_DOMAIN/api/player/account/google/callback**` (the callback carries a short-lived CSRF state query parameter). Add any other real deployment callback URLs you use.
6. Run `web/supabase/migrations/002_player_data.sql` after migration 001. It creates player profiles, settings, achievements, and inventory tables with row-level security, and automatically creates/updates profiles for email and Google identities.
7. Run `web/supabase/migrations/003_plant_catalog_and_purchases.sql`. It creates the Stage 1 plant catalogue, a private coin transaction history, and an atomic `purchase_player_plant` database function. Planned plants are deliberately marked unavailable and not purchasable until their artwork and battle behavior are implemented and approved.
8. Run `web/supabase/migrations/004_lock_unverified_player_progress.sql`. This revokes direct client writes to cloud progress and marks all existing coin balances unverified. The old balance is retained for audit but cannot be spent until a trusted reward system verifies it. Cloud progress writes are intentionally paused; local play and local saves continue.
9. Restart the Next.js server. The Google button uses a server-side PKCE flow; access and refresh tokens remain in HttpOnly cookies. No Google client secret or Supabase service-role key belongs in the web app environment.

The web app uses Supabase Auth through server routes. Access and refresh tokens are stored in HttpOnly cookies; the Supabase service-role key is never used in the browser. Row-level security limits each player to their own progress row. Cloud progress writes are currently disabled because browser-reported victories and balances are not trustworthy. Local browser progress continues to work. Existing cloud coin balances are marked unverified by migration 004 and are not spendable until a trusted server-verifiable reward flow is deployed. Apply migration 004 before deploying this read-only transition.


## Player database tables

The migrations provision these player-owned records:

- `player_progress`: unlocked stages, completed stages, saved coin balance, and whether that balance has been verified by a trusted reward pipeline.
- `player_profiles`: display name, avatar, and sign-in provider.
- `player_settings`: per-player settings stored as JSON.
- `player_achievements`: uniquely awarded achievements.
- `player_inventory`: owned unlocks and collectibles.
- `stage_one_plant_catalog`: authoritative plant metadata, availability, stage requirement, and coin price.
- `player_coin_transactions`: auditable coin debits and rewards.

Plant purchases are designed to run through the database function `purchase_player_plant(plant_key)`. It reads the approved price from the database catalogue, locks the player's progress row, checks stage access and ownership, debits the balance, records the transaction, and grants the inventory item in one database transaction. Do not call it with a client-supplied price.

The Stage 1 catalogue currently contains two implemented plants and eight planned plants. All planned plants remain unavailable and non-purchasable until their final art and gameplay behavior are integrated.


## Stage 1 plant artwork drop locations

When the plant illustrations are ready, add transparent PNG files under `web/public/assets/plants/` using these exact names:

- `radish.png`
- `energy-mushroom.png`
- `pea-shooter.png`
- `thorn-wall.png`
- `sunflower.png`
- `ice-bloom.png`
- `double-radish.png`
- `pumpkin-guard.png`
- `explosive-berry.png`
- `fire-pepper.png`

The game data already reserves these asset paths. The two starter plants remain playable; the other eight stay locked until their images and gameplay implementations are integrated.
