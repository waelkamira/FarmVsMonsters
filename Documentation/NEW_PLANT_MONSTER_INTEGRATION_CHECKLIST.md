# New Plant & Monster Integration Standard

This document is the mandatory, repeatable workflow for every new plant or monster added to FarmVsMonsters. Follow it from the uploaded artwork through in-game behavior and validation. Do not mark a character complete just because its image appears in the UI.

## 0. Intake and scope

1. The user supplies the character's 9-frame sprite sheet (normally a 3×3 grid) and identifies whether it is a plant or monster, its name, and intended role.
2. Inspect the actual image file before editing anything:
   - Read its real pixel width and height, color mode, alpha channel, and visible bounds.
   - Confirm that it contains exactly nine intended frames arranged in a 3×3 grid. If the layout is ambiguous, uneven, padded, or not actually 3×3, stop and clarify rather than guessing.
   - Check whether cells contain transparent padding, stray pixels, shadows, or artwork touching cell boundaries.
   - Calculate each cell boundary from the source dimensions (including remainder pixels); never assume a fixed source size or blindly use width/3 rounded down.
3. Preserve the original uploaded source asset. Do not overwrite it. Record the source dimensions, grid layout, frame order, and any crop/trim decisions.
4. Identify the existing closest working character implementation and reuse its established Phaser pipeline. For plants, inspect Mango and the current plant placement/attack implementations. For monsters, inspect the closest working monster movement, attack, damage, and death implementation.
5. Confirm the target branch and current repository state before editing. Keep the work isolated on a feature branch/PR; do not commit unrelated user changes or merge without validation.

## 1. Asset preparation and Phaser registration

1. Use the project's existing asset naming convention and place the source in the correct public asset directory (plants or monsters).
2. Derive frame rectangles from the inspected source dimensions. Account for remainder pixels so all nine frames are covered exactly once with no gaps, overlap, or out-of-bounds rectangles.
3. Prefer the existing Phaser runtime spritesheet/frame-registration helper (for example, Mango's `registerThreeByThreeSheet`) when it fits the source. This normally registers nine Phaser frames from the original sheet; it does not require exporting nine separate PNG files.
4. Only create separately cropped image files if the existing pipeline or the artwork genuinely requires it. If cropping is needed, preserve transparency and use the measured frame bounds; verify all nine outputs visually.
5. Register stable texture/frame keys and a clear animation key. Verify frame order 0 through 8, frame rate, repeat behavior, and whether the animation should play once or loop.
6. Choose the correct static presentation frame (usually a clean idle/first frame) for seed cards, board placement, previews, and other UI. Do not show an attack/reaction frame as the resting icon.
7. Check the result at actual game display size and at enlarged size. Look for clipped leaves/limbs, seams, inconsistent scale, accidental background pixels, and frame-to-frame jumps.

## 2. Add a plant — complete gameplay path

A plant is not integrated until every applicable item below works:

1. **Identity and catalog**
   - Add a unique stable plant ID, display name, description, asset path, category/role, and balanced playtest stats to the canonical plant data/catalog.
   - Mark availability/implementation flags consistently with the project's existing conventions.
   - Register the plant in every relevant stage/collection/seed-bank catalog and phase-one contract that enumerates playable plants.
2. **Combat configuration**
   - Add the plant's combat config using the same structure as existing plants: cost, health, attack values, cooldowns, range, projectile/effect identifiers, and any special behavior.
   - Register the config in every lookup/dispatch map used by gameplay. In particular, inspect `requestPlant()` and its `plantConfigs` lookup in `BattleScene.js`; a plant can appear in the seed bank and be selectable yet still be rejected during placement if its config is missing there.
   - Check any placement eligibility, refund, event-type, target, projectile, and attack dispatch registries.
3. **Selection and planting**
   - Wire the seed card click/selection state and selected-plant hint.
   - Trace the complete path: seed card → `plantSelected()` → board cell click → `requestPlant()` → config/cost validation → placement/movement flow → final cell placement → plant view creation.
   - Confirm valid cells accept the plant, invalid/occupied cells reject it correctly, and insufficient energy shows the expected feedback.
   - Confirm energy is deducted exactly once on successful placement and refunded correctly if the placement/movement is cancelled or fails. No free placement, double charge, or lost energy.
   - Verify the plant remains in the correct cell and is represented in the board/game state, not only as a decorative sprite.
4. **Animation and attacks**
   - Use the static frame for idle/board rendering and the nine frames for the intended action (attack, cast, or other authored animation).
   - Trigger the action at the correct gameplay moment; synchronize anticipation/wind-up, projectile spawn, impact, cooldown, and return to idle.
   - Ensure the animation cannot get stuck, restart every frame, or play while the plant is inactive/dead.
5. **Visual effects and feedback**
   - Reuse the existing VFX registry/engine and existing event lifecycle. Add a character-specific palette only where needed.
   - Match projectile, trail, charge, impact, and hit feedback to the character's identity without overpowering the sprite or obscuring gameplay.
   - Keep monster hit feedback restrained and localized to the outer silhouette when that is the approved visual rule. Do not introduce an oversized death explosion or replace an approved death presentation without explicit direction.
6. **UI coverage**
   - Check seed bank, selected card, inactive/locked preview, board cell, plant info/collection, and any upgrade/evolution UI that references the plant.
   - Ensure names, costs, icons, and availability all come from the correct canonical data.

## 3. Add a monster — complete gameplay path

A monster is not integrated until every applicable item below works:

1. **Identity and spawn data**
   - Add a unique stable monster ID, display name, asset path, stats, stage/wave eligibility, and spawn configuration using the existing monster data conventions.
   - Register it in all stage/wave spawn pools, encounter tables, and any monster type/event registries.
2. **Texture, animation, and movement**
   - Register all nine frames and define the correct idle, walk/run, attack, hit, and death presentation using the project's existing animation architecture. If the supplied sheet only depicts one action, do not pretend it contains other animations; reuse compatible existing behavior or request the missing artwork.
   - Verify scale, facing direction, origin/body bounds, collision/hitbox, movement speed, and lane/grid alignment.
   - Confirm the monster moves toward the correct target and stops at the intended plant/defense instead of walking through it or passing it.
3. **Combat and lifecycle**
   - Wire target selection, attack range, attack timing, damage, health, death, cleanup, rewards, and wave completion.
   - Confirm plants can target and damage the new monster, and that the monster can attack the correct plant/target.
   - Verify hit reactions do not interrupt core movement/combat state, and death cleanup happens once with no lingering hitboxes, sprites, or timers.
4. **Visual feedback**
   - Add only the required projectile/impact/hit/death effects to the existing VFX registry.
   - Preserve the established restrained hit-edge glow and approved death presentation unless the user explicitly requests a change.

## 4. Shared evolution, progression, and UI integration

1. If the character supports levels/evolution, add its progression profile, stage/level mappings, visual variants, and unlock/upgrade rules to the canonical systems.
2. Ensure evolution changes the actual gameplay data and displayed character consistently; avoid UI-only upgrades.
3. Check collection, seed bank, encyclopedia/info panels, stage selection, rewards, and all other places that enumerate plants or monsters.
4. Use the shared animation/visual profile system where appropriate. Do not create a parallel animation or VFX system for one character.

## 5. Regression tests and validation

Add focused tests for the new character. Tests should cover behavior and wiring, not merely search for its ID in source text.

### Required plant checks
- Source asset exists and is a valid image; measured dimensions and nine frame rectangles are correct and in bounds.
- Phaser texture/frame registration and animation keys are correct; all intended frames are reachable in order.
- Catalog, seed bank, UI selection, combat config, placement config lookup, and stage/phase registration are connected.
- Successful placement creates the real plant on the board and charges energy exactly once.
- Invalid placement, insufficient energy, cancellation, and refund paths behave correctly.
- Plant attack triggers the intended animation, projectile/VFX, damage, cooldown, and return to idle.

### Required monster checks
- Source asset and all nine frame rectangles are valid; texture/animation registration is correct.
- Spawn catalog/wave configuration includes the monster.
- Movement, lane alignment, collision, target acquisition, and stopping at defenses work.
- Monster attack, damage received, hit reaction, death, cleanup, and reward/wave progression work.

### Required shared checks
- No duplicate IDs, missing asset paths, missing configuration-map entries, or unregistered event/effect identifiers.
- Existing characters still behave correctly; preserve approved assets and animations (including the approved 7-frame hyena-run1 crop).
- Run the relevant focused tests, then from `web/` run:
  ```powershell
  npm test
  npm run lint
  npm run build
  ```
- Resolve failures caused by the change. Report unrelated/pre-existing failures separately; never claim a command passed unless it was actually run and its result was observed.
- Perform a browser playtest in Chrome: inspect the character at UI size and on the board; exercise the entire plant placement or monster spawn/combat lifecycle; verify animation timing, hit feedback, VFX, energy/damage, and cleanup.
- Capture or describe any remaining visual/behavioral issue and fix it before declaring the work complete.

## 6. Pull request and completion gate

1. Keep each character integration reviewable and scoped. Include asset measurements, frame mapping, changed registries/configs, test results, and browser-playtest evidence in the PR description.
2. Do not merge merely because the PR is mergeable or CI has started. Require passing relevant tests, lint, build, and browser gameplay review.
3. If CI fails, inspect the actual job logs and identify the cause. If logs are unavailable, state that validation is blocked; do not assume the failure is harmless.
4. Completion means the character is selectable/spawnable, appears correctly in the world, performs its intended behavior, interacts correctly with other entities, and passes the required validation.
5. Before finishing, provide a concise checklist of what was implemented, what was tested, what remains blocked, and the PR/commit reference.

## 7. Mandatory pre-flight checklist for every new upload

- [ ] Confirm character type: plant or monster, plus intended gameplay role.
- [ ] Inspect actual image dimensions, alpha, grid, frame order, and cell boundaries.
- [ ] Confirm exactly nine frames in a 3×3 layout; clarify if not.
- [ ] Preserve original source and record measurements.
- [ ] Reuse the closest working character's Phaser implementation.
- [ ] Register all nine frames and the correct animation; select a clean static UI frame.
- [ ] Add canonical data, combat/spawn configuration, and every required registry/map.
- [ ] Wire the complete gameplay lifecycle (planting or spawning through action, damage, and cleanup).
- [ ] Integrate UI, progression, and VFX where applicable.
- [ ] Add focused regression tests for the actual behavior and integration paths.
- [ ] Run tests, lint, build, and Chrome playtest; report only observed results.
- [ ] Keep the PR unmerged until all completion gates pass.

**Non-negotiable lesson:** never stop at adding an asset or catalog entry. Trace every character from source image to runtime registration, canonical data, configuration lookup, gameplay lifecycle, UI, effects, and verified in-game behavior. The Electric Mushroom placement regression demonstrated why the `requestPlant()` config map and the full placement path must always be checked.
