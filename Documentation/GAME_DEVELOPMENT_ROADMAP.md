# Farm Vs Monsters — Master Development Roadmap

**Authority:** This document defines the detailed implementation checklist, screen flow, and acceptance criteria. The strategic product direction, ten success factors, full phase map, success metrics, and schedule are governed by [GLOBAL_GAME_SUCCESS_MASTER_PLAN.md](GLOBAL_GAME_SUCCESS_MASTER_PLAN.md). If details conflict, follow the master plan and the latest explicit user decisions.
**Runtime:** Next.js + React + JavaScript + Phaser 3 in `web/`.
**First target:** Windows PC browser. Mobile and packaged desktop are later delivery targets.
**Art direction:** Original hand-drawn 2D cartoon art only. The legacy Unity project remains a reference until equivalent systems are rebuilt and verified.

## Project rules

1. A feature is not complete because code was committed. It is complete only after it runs and passes its acceptance checks.
2. Keep the Radish as the only defensive plant in Phase 1; the Energy Mushroom is a resource producer and does not expand the defensive roster.
3. Plants stay rooted in their cells. Monsters move through lanes. The caveman plants and tends the farm.
4. The caveman cannot attack monsters while any living defensive plant remains. When the last defensive plant dies, emergency club combat becomes available. Planting a new defender immediately ends emergency combat.
5. Keep art assets, animation, gameplay rules, UI, and persistence separated. Never hide a gameplay bug with a visual workaround.
6. Every phase ends with a playable build, a checklist, and a tagged/recorded commit on `main`.

## Screen and game-state map

```text
BOOT
  -> MAIN MENU
       -> NEW GAME -> INTRO / READY -> BATTLE
       -> SETTINGS
       -> HOW TO PLAY
       -> CREDITS
BATTLE
  -> PAUSE OVERLAY -> RESUME / RESTART / SETTINGS / MAIN MENU
  -> VICTORY SCREEN -> PLAY AGAIN / MAIN MENU
  -> DEFEAT SCREEN  -> RETRY / MAIN MENU
```

### Required screens

- **Main menu:** game logo, Play, How to Play, Settings, Credits; show a clear loading/error state if required assets fail.
- **How to Play:** explain selecting either the Radish or Energy Mushroom card, choosing an empty cell, the caveman's planting trip, plant defense, collectible mushroom energy, monsters, and the farmhouse objective.
- **Battle HUD:** wave number/progress, energy, coins, selected plant, pause, audio controls, objective/short guidance, and clear feedback for invalid actions.
- **Pause:** freeze gameplay simulation (including movement, attacks, timers, spawns, and projectiles); offer Resume, Restart, Settings, Main Menu.
- **Victory:** explicit VICTORY title, completed wave count, elapsed time, defeated monsters, plants planted, energy collected/remaining, and Play Again / Main Menu.
- **Defeat:** explicit FARM LOST / DEFEAT title, cause of defeat, wave reached, elapsed time, defeated monsters, and Retry / Main Menu.
- **Settings:** independent music, effects, and projectile volume sliders (zero to 100), plus display/control settings when supported. Persist preferences.
- **Loading/error:** never leave a blank or frozen screen when an asset or scene fails; show a readable message and a retry/back action.

## End conditions (locked for the first playable version)

- The first playable campaign has **5 waves and 100 monsters total**, with this fixed first-pass distribution:

  | Wave | Monsters |
  | --- | ---: |
  | 1 | 10 |
  | 2 | 15 |
  | 3 | 20 |
  | 4 | 25 |
  | 5 | 30 |
  | **Total** | **100** |

- Wave counts are data-defined for Phase 1; do not generate an unbounded sixth wave.
- **Victory:** the player survives all five waves, all 100 monsters have spawned, and no living monsters remain after Wave 5. Only then show the Victory screen and its result summary.
- **Defeat:** the farmhouse/princess objective health reaches zero after monsters breach the defensive line. Show the Defeat screen immediately and stop battle simulation.
- Plant destruction alone is not defeat. If all defensive plants die, switch to caveman emergency club combat according to the gameplay rules.
- Restart/retry resets the entire battle state: wave, timers, enemies, plants, projectiles, energy, objective health, selection, animations, and result flags. It must not duplicate event listeners or leave old entities alive.
- Main Menu exits the battle scene cleanly. Returning to battle starts a fresh run unless a future explicit save/resume feature is added.

- Pause now runs in a dedicated Phaser `PauseScene` above the paused battle scene, so pause-menu input remains active while the simulation is frozen. Resume, Restart, Settings, Main Menu, and Escape/P resume controls are handled by the overlay scene. This replaces the earlier same-scene pause overlay; browser verification is still required.

- **Player coin wallet:** monster kills award 8 Coins. The browser build stores the validated wallet in versioned local storage (`farmVsMonsters.progression.v1`) so it survives page reloads and browser restarts. If storage is blocked or corrupt, battle remains playable and the wallet safely falls back to zero. This is local-device progress only; cloud/account synchronization is not implemented.

### Currency transaction groundwork\n\n- A pure `purchasePlant` rule now validates a plant identifier and an explicitly supplied positive integer price, rejects duplicate unlocks and insufficient balances, and returns the exact new balance/unlock list without mutating its inputs. No plant prices or additional roster entries are assumed. The shop UI and persistent unlock inventory remain pending the approved plant roster and prices.\n\n### Farmer sprite-sheet processing
- A gutter-aware extraction utility is available at `web/scripts/extract-farmer-frames.py`. It detects separated frames, writes individual 512×512 transparent PNGs, aligns the foot baseline, and produces a contact sheet plus JSON metadata without modifying the source.
- The utility and its regression tests are committed, but the revised source sheets have not yet been processed or visually approved. Do not replace runtime assets until each contact sheet has been reviewed.
- The extractor now supports an explicit shared scale: derive it from the idle sheet and pass the same value to every other action sheet. This prevents each animation from being independently resized and changing the farmer's apparent size.


## Phase 1 — Complete playable vertical slice

**Purpose:** prove one satisfying, complete game loop with one defender: the Radish, supported by the resource-only Energy Mushroom. Do not add a second defensive plant in this phase.

### Scope
- Main menu, How to Play, battle, pause, victory, defeat, settings, and clean scene transitions.
- Two complementary plants from the first campaign: Radish (lane defense) and Energy Mushroom (resource production).
- One 5-lane × 8-column battle grid, aligned to the approved battlefield art.
- Caveman controls and pathing: select Radish, click a valid empty cell, walk/run to it, plant, and return to the original position/facing.
- Consistent farmer scale, foot anchor, correct depth behind the planted object, and clean idle/walk/run/plant/return/club/hurt/death states where used.
- Radish remains fixed in its cell, has readable idle/hurt/death behavior, and automatically fires its own projectile/attack.
- Three Phase 1 monster archetypes (Cave-brute, Dust-skitter, Stonehide) with lane-aware movement, distinct durability/speed/attack profiles, plant eating/attacking, hurt flash, death disappearance, and farmhouse breach.
- Health/damage/death rules for the Radish, monster, and farmhouse/princess objective.
- Emergency mode: club combat is enabled only after the last living defender dies; it is disabled as soon as a new defender is planted.
- Starting energy, correct cost deduction at successful planting, and the complete Energy Mushroom loop: timed production, visible collectible energy, click-to-collect, collection feedback, and the energy cap.
- Five waves with increasing but readable pressure, wave transition, spawn completion, and final-wave completion.
- Audio controls and basic sound feedback for planting, attacks, hits, eating, collection/feedback, victory, and defeat.
- Functional result screens and full restart/menu behavior.

### Phase 1 acceptance gate — every item required
- [ ] A clean browser load reaches the Main Menu without console/runtime errors.
- [ ] New Game opens a fresh battle and the 5×8 grid aligns with the art.
- [ ] Radish and Energy Mushroom selection and empty-cell validation work; occupied cells cannot be planted.
- [ ] Mushroom energy pickups expire after 12 seconds, collect no more than the available energy capacity, and are counted accurately in the result summary.
- [ ] The caveman physically travels to the chosen cell, plants there, and returns to the exact saved position and facing.
- [ ] Planting animation bends and recovers; no squash, shrink, jump, foot sliding, or wrong depth.
- [ ] Radish remains rooted and attacks automatically with correct targeting and projectile behavior.
- [ ] Monster follows the correct lane, stops to attack a defender, resumes after it is destroyed, and reaches the objective if the lane is clear.
- [ ] Monster hurt is a visible flash; death removes it cleanly.
- [ ] The last-defender transition enables club combat; planting a new defender disables it immediately.
- [ ] Energy never becomes negative and is deducted only when planting succeeds.
- [ ] Pause truly freezes all battle simulation; Resume continues without timer jumps.
- [ ] Five waves progress correctly; no premature victory while monsters remain.
- [ ] Objective health reaching zero triggers Defeat exactly once.
- [ ] Clearing the final wave triggers Victory exactly once.
- [ ] Victory and Defeat show correct results; Play Again/Retry fully resets; Main Menu exits cleanly.
- [ ] Audio sliders change actual volume continuously and persist after reload.
- [ ] Desktop browser build succeeds; the full start-to-result loop is manually played at least three times (victory, defeat, restart).
- [ ] No blocking console errors, stuck animations, duplicate spawns, frozen enemies, or input locks.

**Exit rule:** Phase 1 is complete only when all acceptance items pass in a real browser. Artwork can be improved later, but placeholder/final art must be readable enough to verify gameplay. A GitHub commit alone does not close the phase.

## Phase 2 — Core gameplay polish and resource economy

- Tune Radish health, attack cadence, projectile speed/damage, Mushroom cost/production/collection, Cave-brute/Dust-skitter/Stonehide health/speed/damage, wave pacing, starting energy, and objective health.
- Expand the resource loop with clear production timing, pickup feedback, collection animation, sound, and anti-duplication safeguards.
- Add clear feedback for insufficient energy, successful collection, cooldowns, and unavailable cells.
- Add satisfying plant/monster hit reactions, eating sounds, projectile impacts, death timing, and readable combat effects.
- Add a structured wave configuration/data file instead of hard-coded wave values.
- Add a post-wave summary and a preparation window between waves, with clear start/continue behavior.
- Exit gate: resource loop is exploitable neither by duplication nor by timing glitches; all values are tunable from data.

## Phase 3 — Plant roster and plant-specific identity

- Add plants one at a time, each with its own role, cost, health, attack behavior, projectile/effect, animations, sound, and UI card.
- Candidate roles: energy producer, fast shooter, heavy damage, area damage, slowing/support, defensive blocker. Final roster and names are approved separately before implementation.
- Add plant selection, cooldowns, placement rules, upgrade/replace/remove rules, and clear feedback.
- Do not give every plant the same generic projectile or attack animation.
- Exit gate: every plant can be selected, planted, damaged, destroyed, and used in a complete battle without breaking lane/depth sorting.

## Phase 4 — Monster roster and encounter design

- Add archetypes incrementally: baseline walker, fast runner, armored/tough monster, special ability monster, and boss.
- Each archetype has distinct health, speed, damage, attack cadence, target behavior, animation, hit response, and death behavior.
- Add boss health presentation, telegraphed attacks, phases, and rewards.
- Exit gate: every monster is readable, counterable, lane-correct, and balanced against available plants.

## Phase 5 — Campaign, progression, rewards, and persistence

- Build a level/campaign map, unlock sequence, difficulty curve, wave definitions, boss milestones, and replay access.
- Add persistent earned rewards, currency, plant unlocks/upgrades, and progression rules. Avoid pay-to-win assumptions in the core prototype.
- Save settings and progression safely; handle corrupted/missing save data with a recoverable default.
- Add player profile only if required by the chosen release model; do not block the offline single-player loop on account creation.
- Exit gate: progress survives reload, unlocks are deterministic, and no reward can be duplicated by retrying or refreshing.

## Phase 6 — Complete user experience and platform support

- Finish all menus, transitions, tutorials, pause/settings, sound, accessibility/readability options, and localization structure.
- Add responsive layouts and touch controls for phones/tablets after desktop gameplay is stable.
- Add packaged desktop support only after browser behavior is reliable.
- Verify keyboard, mouse, touch, resolution changes, safe areas, and performance on target devices.
- Exit gate: all supported devices can complete the campaign with usable controls and no blocked UI.

## Phase 7 — Quality, balance, and release candidate

- Automated checks for deterministic game rules, wave completion, resource accounting, objective damage, restart cleanup, and save/load.
- Manual playthrough matrix: victory, defeat, pause/resume, restart during action, menu exit, no defenders/emergency combat, multiple defenders, all plant/enemy matchups.
- Performance profiling, memory cleanup, asset loading, audio lifecycle, accessibility/readability, and browser compatibility.
- Final art pass: clean alpha, precise crop, no stray pixels or baked unwanted shadows, consistent frame dimensions, stable pivots/feet, and reviewed animation order.
- Add credits, privacy/legal pages if online services or analytics are introduced, and release notes.
- Exit gate: release candidate passes the full test matrix and has no known blocker or data-loss issue.

## Phase 8 — Release and live support

- Publish the approved build, version it, keep a recoverable previous release, and document known issues.
- Monitor crashes/feedback only with an explicit privacy-conscious telemetry decision.
- Plan balance patches, new content, seasonal events, and optional monetization only after the core game is enjoyable and stable.
- Every update goes through a regression checklist before release.

## Current status at roadmap creation

- The browser rebuild and core battle scene exist in `web/`.
- Phase 1 now exposes both Radish and Energy Mushroom cards. The Mushroom produces a full 15-energy collectible every 12 seconds even when the energy bank is full; the player must click each pickup before its 12-second expiry, and the 300-energy cap is applied at collection. Mushrooms are resource plants, not defensive plants, and do not block emergency club combat. Browser verification is still required.
- Farmer frame-count validation was added on 2026-11-14.
- The Phase 1 wave schedule is now fixed in code at 10 / 15 / 20 / 25 / 30 monsters (100 total); the sixth-wave loop has been removed.
- Phase 1 currently includes three monster archetypes: Cave-brute, Dust-skitter, and Stonehide. Stonehide braces while eating, reducing incoming damage; it is intended to require layered defense rather than a single Radish.
- The battle HUD now tracks total campaign defeats out of 100 and the current wave's defeats out of that wave's target; the per-wave counter resets only when the previous wave is fully cleared.
- Final-wave completion now triggers a Victory result only after all scheduled monsters have spawned and no living monsters remain. Victory and Defeat result panels include run summaries and replay/menu actions.
- Monsters that breach the farm now stop at the home boundary and damage farmhouse health on their attack cadence; defeat occurs only when home health reaches zero.
- A dedicated `PauseScene` provides Resume, Restart, Settings, and Main Menu, with Escape/P resume shortcuts. Pause stops the background-music timer and suspends the Web Audio context; resume restores the audio context and soundtrack. The pause action is guarded against duplicate launches, and resume ignores stale/invalid requests. Runtime input/audio behavior still requires browser verification.
- The main menu now links to New Game, How to Play, Settings, and Credits; the Credits page lists the current technology stack and leaves unconfirmed contributor/art credits explicitly pending. The field guide documents planting, monster lanes, farmhouse health, emergency combat, and controls. The settings page edits the three persisted audio volume keys used by BattleScene.
- Phaser startup now has an explicit loading state, a readable initialization error with retry and main-menu recovery, and a ready-state transition. The browser build and end-to-end manual playthrough have not yet been verified in this development session.
- The farmer walk animation now requests the four frames present in the 2×2 walk sheet instead of eight nonexistent frames. Planting also has a safe return-to-start fallback when the farmer animation artwork is unavailable, so missing animation assets do not strand the planting flow.
- The planting lifecycle now locks the caveman through travel, planting animation, and return travel. New planting requests, manual movement, and emergency club attacks cannot overlap an active planting/return action; game-over also cancels pending planting callbacks. Browser verification is still required.
- Audio resume no longer triggers the opening soundtrack note twice after a suspended Web Audio context resumes.
- Monsters now treat only living Radishes as defensive blockers; resource Mushrooms do not stop, delay, or redirect a monster lane. A farmhouse defeat also aborts the remainder of the current simulation frame immediately. Pending Mushroom pickups and their expiry timers are cleared when a victory or defeat result opens.
- The Phase 1 resource loop starts with 150 energy, costs 35 for a Radish and 50 for a Mushroom, awards 8 coins per defeated monster, and produces a full 15-energy collectible per Mushroom every 12 seconds; the 300-energy cap is applied only when the pickup is collected. Radish health is 160; the baseline Cave-brute deals 16 damage every 1.15 seconds, while Stonehide deals 23 every 1.45 seconds and reduces incoming damage while braced. Runtime balance still requires playtesting.
- Therefore **Phase 1 remains IN PROGRESS**. Next: verify the Radish and Mushroom battle loops, all three monster archetypes, wave/result flow, objective breach/health behavior, pause/audio lifecycle, screen transitions, production build, and victory/defeat/restart playthrough matrix.

## Work order from here

1. Finish farmer asset/frame audit and verify the farmer planting/return sequence in browser.
2. Verify Radish defense, Mushroom production/collection, and monster/objective damage.
3. Implement and test wave 1–5 completion and exact victory/defeat conditions.
4. Verify Pause/Resume audio suspension, then test Main Menu, How to Play, Settings persistence, and reliable restart/menu transitions.
5. Verify the loading, ready, asset-fallback, and initialization-error states in a real browser.
6. Run production build and three complete browser playthroughs.
7. Close Phase 1 with a recorded checklist and release tag; only then begin Phase 2.

## Automated Phase 1 regression coverage

The core Phase 1 rules are now centralized in `web/game/rules/phaseOneRules.mjs` and imported by `BattleScene`, so balancing constants and pure gameplay decisions are not duplicated between the game and tests.

The Node.js test suite in `web/tests/phase-one-rules.test.mjs` covers:
- Exact five-wave schedule, strict wave growth, and the 100-monster total.
- Starting energy, plant costs/health, Mushroom production interval and pickup lifetime.
- Energy collection at the 300 cap, including full, negative, and out-of-range inputs.\n- Plant purchase transaction validation, exact coin deduction, duplicate-unlock protection, and missing/invalid-price rejection.
- Radish-only defensive counting and the resource-only Mushroom rule.
- Cave-brute, Dust-skitter, and Stonehide composition by wave.
- Stonehide bracing damage reduction.
- Plant placement validation before charging energy.
- Idempotent monster defeat rewards and defeat counters.
- Wave-clear and final-victory gates.
- Pause, game-over, and retry guard contracts.
- Alignment between the game rules, player guide, and this roadmap.

Run from `web/` with `npm test`. GitHub Actions is configured to run the suite, lint, and the production build. The current GitHub-hosted workflow attempts are failing before a runner starts (no steps or logs are exposed), so CI is not yet a passing verification signal. The extracted pure rules module has separately passed a local Node.js 22 test run; the complete repository suite and production build still require a functioning runner.

