# Farm Vs Monsters — Master Development Roadmap

**Authority:** This document defines the phase gates, feature ownership, screen flow, and acceptance criteria for the rebuilt 2D browser game.
**Runtime:** Next.js + React + JavaScript + Phaser 3 in `web/`.
**First target:** Windows PC browser. Mobile and packaged desktop are later delivery targets.
**Art direction:** Original hand-drawn 2D cartoon art only. The legacy Unity project remains a reference until equivalent systems are rebuilt and verified.

## Project rules

1. A feature is not complete because code was committed. It is complete only after it runs and passes its acceptance checks.
2. Do not expand the plant roster before the single-radish gameplay loop is enjoyable and stable.
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
- **How to Play:** explain selecting the Radish card, choosing an empty cell, the caveman's planting trip, plant defense, energy, monsters, and the farmhouse objective.
- **Battle HUD:** wave number/progress, energy, selected plant, pause, audio controls, objective/short guidance, and clear feedback for invalid actions.
- **Pause:** freeze gameplay simulation (including movement, attacks, timers, spawns, and projectiles); offer Resume, Restart, Settings, Main Menu.
- **Victory:** explicit VICTORY title, completed wave count, elapsed time, defeated monsters, plants planted, energy collected/remaining, and Play Again / Main Menu.
- **Defeat:** explicit FARM LOST / DEFEAT title, cause of defeat, wave reached, elapsed time, defeated monsters, and Retry / Main Menu.
- **Settings:** independent music, effects, and projectile volume sliders (zero to 100), plus display/control settings when supported. Persist preferences.
- **Loading/error:** never leave a blank or frozen screen when an asset or scene fails; show a readable message and a retry/back action.

## End conditions (locked for the first playable version)

- The first playable campaign has **5 waves and 61 monsters total**, with this fixed first-pass distribution:

  | Wave | Monsters |
  | --- | ---: |
  | 1 | 5 |
  | 2 | 8 |
  | 3 | 12 |
  | 4 | 16 |
  | 5 | 20 |
  | **Total** | **61** |

- Wave counts are data-defined for Phase 1; do not generate an unbounded sixth wave.
- **Victory:** the player survives all five waves, all 61 monsters have spawned, and no living monsters remain after Wave 5. Only then show the Victory screen and its result summary.
- **Defeat:** the farmhouse/princess objective health reaches zero after monsters breach the defensive line. Show the Defeat screen immediately and stop battle simulation.
- Plant destruction alone is not defeat. If all defensive plants die, switch to caveman emergency club combat according to the gameplay rules.
- Restart/retry resets the entire battle state: wave, timers, enemies, plants, projectiles, energy, objective health, selection, animations, and result flags. It must not duplicate event listeners or leave old entities alive.
- Main Menu exits the battle scene cleanly. Returning to battle starts a fresh run unless a future explicit save/resume feature is added.

- Pause now runs in a dedicated Phaser `PauseScene` above the paused battle scene, so pause-menu input remains active while the simulation is frozen. Resume, Restart, Settings, Main Menu, and Escape/P resume controls are handled by the overlay scene. This replaces the earlier same-scene pause overlay; browser verification is still required.\n\n## Phase 1 — Complete playable vertical slice

**Purpose:** prove one satisfying, complete game loop with one defender: the Radish. Do not add a second defensive plant in this phase.

### Scope
- Main menu, How to Play, battle, pause, victory, defeat, settings, and clean scene transitions.
- One 5-lane × 8-column battle grid, aligned to the approved battlefield art.
- Caveman controls and pathing: select Radish, click a valid empty cell, walk/run to it, plant, and return to the original position/facing.
- Consistent farmer scale, foot anchor, correct depth behind the planted object, and clean idle/walk/run/plant/return/club/hurt/death states where used.
- Radish remains fixed in its cell, has readable idle/hurt/death behavior, and automatically fires its own projectile/attack.
- One baseline slow monster type with lane-aware movement, plant eating/attacking, hurt flash, death disappearance, and farmhouse breach.
- Health/damage/death rules for the Radish, monster, and farmhouse/princess objective.
- Emergency mode: club combat is enabled only after the last living defender dies; it is disabled as soon as a new defender is planted.
- A simple, balanced starting-energy rule and correct cost deduction at successful planting. Do not introduce another defensive plant just to test the Radish.
- Five waves with increasing but readable pressure, wave transition, spawn completion, and final-wave completion.
- Audio controls and basic sound feedback for planting, attacks, hits, eating, collection/feedback, victory, and defeat.
- Functional result screens and full restart/menu behavior.

### Phase 1 acceptance gate — every item required
- [ ] A clean browser load reaches the Main Menu without console/runtime errors.
- [ ] New Game opens a fresh battle and the 5×8 grid aligns with the art.
- [ ] Radish selection and empty-cell validation work; occupied cells cannot be planted.
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

- Tune Radish health, attack cadence, projectile speed/damage, monster health/speed, wave pacing, starting energy, and objective health.
- Add the energy-producing Mushroom as a distinct plant only after Phase 1 Radish behavior is approved. Its production, generated energy pickup, collection input, animation, sound, and UI counter must work as one loop.
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
- Add earned rewards, currency, plant unlocks/upgrades, and progression rules. Avoid pay-to-win assumptions in the core prototype.
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
- The code contains planting, radish/energy-mushroom logic, monsters, wave progression, audio controls, and farmer animation calibration, but feature presence is not proof of correct runtime behavior.
- Farmer frame-count validation was added on 2026-11-14.
- The Phase 1 wave schedule is now fixed in code at 5 / 8 / 12 / 16 / 20 monsters (61 total); the sixth-wave loop has been removed.
- Final-wave completion now triggers a Victory result only after all scheduled monsters have spawned and no living monsters remain. Victory and Defeat result panels include run summaries and replay/menu actions.
- Monsters that breach the farm now stop at the home boundary and damage farmhouse health on their attack cadence; defeat occurs only when home health reaches zero.
- A dedicated `PauseScene` provides Resume, Restart, Settings, and Main Menu, with Escape/P resume shortcuts. Pause stops the background-music timer and suspends the Web Audio context; resume restores the audio context and soundtrack. The pause action is guarded against duplicate launches, and resume ignores stale/invalid requests. Runtime input/audio behavior still requires browser verification.\n- The main menu now links to New Game, How to Play, and Settings. The field guide documents planting, monster lanes, farmhouse health, emergency combat, and controls. The settings page edits the three persisted audio volume keys used by BattleScene.
- Browser build and end-to-end manual playthrough have not yet been verified in this development session.
- Therefore **Phase 1 remains IN PROGRESS**. Next: verify the wave/result flow in a real browser, validate objective breach/health behavior, finish the remaining screen flow, run the build, and complete the victory/defeat/restart playthrough matrix.

## Work order from here

1. Finish farmer asset/frame audit and verify the farmer planting/return sequence in browser.
2. Verify Radish-only battle loop and monster/objective damage.
3. Implement and test wave 1–5 completion and exact victory/defeat conditions.
4. Verify Pause/Resume audio suspension, then test Main Menu, How to Play, Settings persistence, and reliable restart/menu transitions.
5. Run production build and three complete browser playthroughs.
6. Close Phase 1 with a recorded checklist and release tag; only then begin Phase 2.
