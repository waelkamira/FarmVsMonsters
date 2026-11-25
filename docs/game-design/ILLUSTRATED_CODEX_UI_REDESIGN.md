# Farm Vs Monsters — Illustrated Codex UI Redesign

## Approved visual direction

The two user-supplied reference boards define the target:
- Warm parchment inventory panels with carved timber frames and leafy accents.
- Stone-framed enemy bestiary with discovered cards and locked silhouettes.
- A parchment campaign tracker, achievements and utility rows.
- Consistent illustrated buttons, iconography and ornamental details.
- Arabic and English support with correct RTL/LTR layout.
- Responsive composition for desktop, tablet and mobile.

Use the existing Farm Vs Monsters character and plant assets wherever available. Do not replace established character art, alter sprite crops, or change battle animation timing as part of the UI redesign.

## Existing application architecture

- Next.js App Router and React render menus and information pages.
- Phaser 3 owns the live battle scene and its in-canvas HUD.
- Existing routes include the home page, campaign map, plant encyclopedia, monster encyclopedia, settings, help/how-to-play, account, battle and stage briefing pages.
- Existing catalog data is in `web/game/data/stageOnePlants.mjs` and `web/game/data/monsterRoster.mjs`.
- Campaign unlock state is read from `CAMPAIGN_PROGRESS_KEY`; currency uses the existing progression storage key.

## Implementation sequence

### Phase A — Shared visual foundation (started)
- Add `web/app/codex-theme.css` as the shared parchment/timber/stone/leaf theme.
- Import the theme globally from `web/app/layout.js`.
- Establish responsive grids, readable contrast, focus-visible styles inherited from the existing global sheet, and reduced-motion behavior.
- Keep Phaser's battle logic and asset dimensions untouched.

### Phase B — Main menu (first implementation)
- Rebuild the home page as a garden-adventure hub.
- Link to campaign map, plant inventory, enemy bestiary, options, field guide and account.
- Preserve guest play and account progress continuation.

### Phase C — Plant inventory and enemy bestiary
- Use existing catalog data and local character artwork.
- Display available, campaign-locked and not-yet-implemented entries as distinct states.
- Plant inventory must read actual campaign unlock state; it must not label every implemented prototype as owned.
- Bestiary must not claim an enemy has been encountered unless encounter tracking exists.

### Phase D — Campaign progress and utilities
- Refine world map, progress indicators, rewards and achievements.
- Keep planned content visibly distinct from playable content.
- Add real achievement tracking only when supported by persisted game events.

### Phase E — Battle UI and result screens
- Bring the Phaser HUD, pause menu, seed bank, victory and defeat overlays into the same visual language.
- Preserve game balance, sprite frame dimensions, projectile trajectories and animation timings.
- Keep touch controls and responsive canvas behavior in scope.

### Phase F — Verification
- Run the web test suite and production build.
- Inspect Arabic and English layouts at narrow phone, tablet and desktop widths.
- Verify every navigation destination and interactive control.
- Visually inspect the battle before and after the HUD pass.

## Current delivery boundary

The shared visual theme and first home-page redesign are committed. The plant inventory has also been connected to campaign unlock IDs so only owned plants appear in its available section. This is an initial implementation slice, not completion of all phases. No claim of successful local build or browser playtest is made until those checks are actually run.

