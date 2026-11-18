# FARM VS MONSTERS — Godot 4 Android Offline Migration Plan

**Decision:** Approved by the project owner on 2026-11-18. Godot 4.x is the sole target engine for the new game runtime. The first release target is Android, fully playable offline.
**Working branch:** `migration/godot4-android`
**Legacy source:** The current Next.js + Phaser 3 implementation in `web/` and the older Unity project are reference implementations only. Keep both intact until their relevant rules, assets, and behaviours have been audited and successfully rebuilt in Godot.
**Game format:** Original 2D hand-drawn cartoon lane-defense adventure; landscape mobile presentation; offline single-player.

## 1. Non-negotiable product decisions

- Godot 4.x with GDScript for the new runtime. Do not add Phaser or Next.js as runtime dependencies to the Android game.
- Android-first, single-player, no account requirement, no network dependency, and no internet permission unless a future owner-approved feature truly requires it.
- Landscape orientation. UI must adapt to supported Android aspect ratios and safe areas.
- Preserve the approved 2D art direction and original character identities. Do not replace reviewed character artwork with permanent procedural placeholders.
- Preserve the canonical gameplay rules and story arc documented in `NEW_GAMEPLAY_RULES_2D.md` and the campaign master plan, except where a later explicit owner decision supersedes them.
- Keep the old Phaser and Unity projects as read-only migration references until Godot parity is demonstrated. Do not delete or destructively rewrite them during migration.
- A phase is complete only when its Godot build runs and passes its acceptance checklist. A commit by itself is not proof of completion.

## 2. Technical baseline

- **Engine:** latest stable Godot 4.x release selected at project bootstrap; pin the exact version in the project documentation and CI/build notes.
- **Language:** typed GDScript for gameplay, UI, save system, and tools.
- **Rendering:** begin with Godot's Compatibility renderer for broad Android GPU coverage; validate on representative low-, mid-, and high-range devices before locking the minimum device profile.
- **Design resolution:** landscape 16:9 reference canvas with stretch configured for 2D; all critical HUD controls must remain inside safe areas and scale cleanly on wider/taller screens.
- **Scene architecture:** small scenes with clear ownership (Boot, MainMenu, StageIntro, Battle, Pause, Victory, Defeat, Settings, HowToPlay, Credits). Keep gameplay simulation separate from presentation and UI.
- **Data architecture:** resources or versioned data files for plant, monster, wave, boss, stage, and balance definitions. Avoid scattering balance values across scene scripts.
- **Persistence:** local `user://` save data with schema version, validation, safe defaults, and backup/atomic-write strategy. Save wallet, unlocked stages/plants, campaign progress, and settings. Corrupt or missing saves must never prevent a new game.
- **Offline guarantee:** all required assets, fonts, audio, and content ship in the APK. No remote fonts, remote asset URLs, analytics, login, ads, or network calls in the offline release.
- **Input:** touch-first placement and collection, with mouse input retained for editor/testing where practical. Buttons need comfortable touch targets and clear feedback.
- **Performance:** pool frequently spawned projectiles/pickups where profiling justifies it; avoid premature optimization. Profile on physical Android devices, not only the editor.

## 3. Migration strategy

This is a controlled rebuild, not a one-shot rewrite. First inventory the current implementations and assets, then establish a minimal Godot project, then port one complete playable vertical slice. Translate renderer-independent JavaScript rules into typed GDScript and test them against the source rules. Reuse approved image/audio files where licensing and source quality permit; rebuild animation import settings and scene integration in Godot rather than copying Phaser-specific code.

The current Phaser rules provide useful reference values, including a 5-lane × 8-column field, initial energy 150 (cap 300), five first-stage waves (3 / 5 / 6 / 7 / 9 ordinary monsters), and the current Stage 1 plant/monster/boss balance. These are migration inputs, not permission to silently freeze temporary playtest values: compare the full source contract and current design documents before implementing each system.

## 4. Delivery phases and acceptance gates

### Phase 0 — Repository and asset audit
- Inventory the root repository, legacy Unity project, Phaser scenes/rules/data, tests, documentation, and all art/audio assets.
- Identify canonical versions of every rule and flag conflicts, temporary values, missing art, and unverified sprite sheets.
- Produce a source-to-Godot migration matrix: source path, destination scene/script/resource, dependencies, and verification method.
- Record the exact Godot 4.x version and Android export toolchain.
- **Gate:** audit report and migration matrix committed; no legacy files deleted or modified.

### Phase 1 — Godot foundation
- Add a clean Godot project in a dedicated `godot/` directory.
- Configure landscape display, stretch, renderer, input actions, theme/fonts, application identity, and Android export presets.
- Create Boot and MainMenu scenes, a reusable screen-transition approach, logging/error states, and a basic automated test harness for pure gameplay rules.
- Add an asset manifest and consistent resource naming.
- **Gate:** project opens in the pinned Godot version, exports a debug APK, installs on a physical Android device, launches offline, and displays the main menu without network access.

### Phase 2 — First playable combat slice
- Build the 5-lane × 8-column board and reliable touch selection/planting.
- Implement farmer pathing and planting interaction; plants remain rooted in cells.
- Implement Radish defense and Energy Mushroom resource production.
- Implement one baseline monster lane movement, plant targeting/eating, projectile collision, health, damage, and defeat.
- Implement energy spending/collection and a minimal wave controller.
- **Gate:** player can start a battle, plant, defend a lane, collect energy, defeat a monster, lose a plant, and reach a clear win/loss test state without crashes or softlocks.

### Phase 3 — Phase 1 gameplay parity
- Port all five waves and the three ordinary monster archetypes; verify wave counts and progression.
- Port plant-specific rules, pickups, coins, damage, farmer emergency club mode, and all relevant combat transitions.
- Implement the Stage 1 dragon encounter, telegraphed attacks, automatic farmer slingshot behaviour, and farmhouse health.
- Enforce the rule that the farmer does not attack while any defensive plant lives; emergency club combat begins only when the final defender dies and ends immediately when a new defender is planted.
- **Gate:** deterministic rule tests match the approved source contract; a complete Stage 1 can be played from start to victory/defeat with no missing state transitions.

### Phase 4 — Complete game flow and persistence
- Implement Main Menu, How to Play, Stage Intro, Battle HUD, Pause, Settings, Victory, Defeat, results, rescue/reunion, reward, and next-stage flow.
- Ensure pause freezes every gameplay timer and entity; restart resets the entire run; main-menu exit cleans up the battle.
- Implement versioned offline saves for settings, coins, unlocks, and campaign progress.
- Test save migration, invalid/corrupt data recovery, interrupted writes, and fresh-install behaviour.
- **Gate:** full Stage 1 story loop works offline across app restarts; no account or network is required; save data remains valid after forced app termination.

### Phase 5 — Art, animation, audio, and polish
- Import only approved original assets and sprite sheets; document frame dimensions, spacing, anchors, scale, animation speed, and filtering.
- Preserve farmer and plant identity, correct ground baselines, depth ordering, and non-overlapping animation frames.
- Add final battlefield art, UI art, feedback, audio, and accessibility/readability improvements.
- **Gate:** visual review on target phone sizes; no clipped or overlapping sprites, missing resources, placeholder character art, or unreadable touch controls.

### Phase 6 — Android release hardening
- Test on physical devices across agreed minimum/target Android versions and GPU tiers.
- Validate install, first launch, offline cold launch, background/resume, audio focus, safe areas, screen sleep behaviour, pause/resume, storage, and APK/AAB signing.
- Profile memory, load time, frame pacing, battery/thermal behaviour, and long sessions.
- Verify the exported package has no unnecessary network permissions or runtime calls.
- **Gate:** release checklist passes on physical devices; produce a signed release artifact only after the owner supplies/approves signing credentials and store identity.

### Phase 7 — Campaign expansion
- Expand regions, plants, monsters, bosses, farm upgrades, and rewards only after Phase 1 is stable and accepted.
- Keep all campaign content offline and data-driven.
- **Gate:** each new stage has its own complete gameplay and story acceptance checklist; no content is marked playable until tested.

## 5. Required test strategy

- Unit tests for placement validation, occupied cells, energy limits, damage, monster targeting, wave counts, rewards, purchases, unlocks, and save validation.
- Deterministic simulation tests for combat and wave progression.
- Scene-level tests for pause/resume, restart, victory, defeat, and scene cleanup.
- Android manual tests for touch precision, aspect ratios, safe areas, app lifecycle, and offline operation.
- Regression checklist comparing the Godot behaviour with the approved gameplay rules and the Phaser source implementation.
- Every bug fix must include a reproducible test or a written manual verification step.

## 6. Definition of done for the first Android milestone

The first milestone is not a menu mock-up. It is an installable Android debug build that runs without internet and lets a player complete the full first stage: launch, understand the objective, plant and defend, survive the waves, fight the dragon, rescue the wife, view results, save progress, close the app, and resume with valid local progress. Victory and defeat paths must both work.

## 7. Immediate next actions

1. Complete Phase 0 audit and map all relevant Phaser/Unity systems and assets to Godot destinations.
2. Confirm the canonical gameplay data and list unresolved conflicts before porting.
3. Bootstrap `godot/` on the migration branch without touching `web/` or the legacy Unity project.
4. Deliver and test the first Android debug APK before expanding scope.
