# FarmVsMonsters — Master Roadmap

This roadmap supersedes older Unity/Godot-first plans. The active implementation is the Phaser 3 browser game in `web/`, hosted by Next.js and React. Work is staged by acceptance gates, not calendar promises.

## Phase 0 — Stabilize and audit the current project

**Goal:** establish a reliable baseline before expanding scope.

- Confirm the active branch, current main commit, working tree context, and open feature branches/PRs.
- Map the runtime entry points, scenes, rules modules, asset manager, save/progression code, and test suite.
- Verify asset manifest and audit generation, sprite-sheet metadata, duplicate keys, missing assets, and large files.
- Identify current gameplay contracts and preserve approved plant/monster art and animation decisions.
- Run the existing tests, lint, and production build in the actual Windows/Node environment; record results and blockers.
- Create a prioritized defect list with reproducible steps.

**Exit gate:** project builds; existing automated tests pass or have documented, isolated failures; asset generation is repeatable; no known critical battle-loop regression remains.

## Phase 1 — Polished vertical slice

**Goal:** a complete, replayable first experience, not a broad but shallow feature list.

Target content (subject to inventory audit): up to 10 usable plants, 6 monster archetypes, one boss, one region, and approximately 10 carefully paced stages.

- First-session flow and concise interactive onboarding.
- Plant selection, placement, attacks, cooldowns, energy economy, and clear feedback.
- Monster lanes, targeting, attacks, damage, death, wave completion, victory/defeat.
- Reward screen and meaningful next action.
- Difficulty curve, sound, hit feedback, readable HUD, pause/retry.
- Hybrid VFX system: authored Sprite Sheets for signature actions, bounded Particles for sparks/embers/dust, and optional renderer-safe Shaders/Post-FX for glow and distortion.
- Adaptive VFX quality (Ultra/High/Performance) driven by rolling frame-time samples, concurrent-effect caps, and reduced particle budgets on slower devices.
- Save and restore stage unlocks and essential progress.

**Exit gate:** a new tester can start, understand, complete multiple battles, receive rewards, upgrade or unlock something, and return to play without developer assistance. No critical gameplay or save-loss bugs.

## Phase 2 — Persistent farm and progression

**Goal:** make battle rewards matter in a persistent home.

- Farm hub and expansion-ready plot model.
- Planting/growing/harvesting loop with clear time and reward rules.
- Farm resources and economy separated from temporary battle energy.
- Plant collection, levels, upgrades, and ability unlocks.
- Region map and stage progression.
- Versioned save schema with migration and recovery tests.

**Exit gate:** farm actions, battle rewards, plant progression, and stage unlocks persist correctly across reloads; economy is testable and balanced.

## Phase 3 — Signature discovery and social hooks

**Goal:** create memorable, naturally shareable moments.

- Plant discovery and combination/trait experimentation with transparent rules.
- Bosses with distinct mechanics, tells, and counterplay.
- Weekly or rotating challenges only when content cadence can support them.
- Share cards/clips for rare discoveries, boss wins, clever strategies, and farm designs.
- Friend farm visits and asynchronous comparisons before considering real-time multiplayer.

**Exit gate:** the features are fun in playtests, explainable to players, safe for a family audience, and do not destabilize progression.

## Phase 4 — Analytics and closed testing

- Privacy-conscious event taxonomy: onboarding steps, battle starts/completions, exits, progression, performance, and voluntary shares.
- Cohort analysis for D1/D7/D30 retention and tutorial completion.
- Device/browser performance and memory profiling.
- Accessibility, localization, parental/privacy, and age-appropriate review.
- Small playtests followed by a wider opt-in test.
- Fix the largest measured friction points before scaling acquisition.

**Exit gate:** retention and session-quality signals are understood, critical crashes are resolved, and players can complete the core loop reliably across target devices.

## Phase 5 — Global release and live operations

- Store packaging for Android/iOS after the browser experience is stable.
- Localization and regional store assets.
- Creator/community launch plan based on proven gameplay footage.
- Cosmetic-first monetization with clear pricing and purchase safeguards.
- Sustainable content cadence, support, moderation, and release rollback procedures.

**Exit gate:** operational readiness, support processes, privacy disclosures, purchase safeguards, and stable release builds.

## Non-goals until evidence justifies them

- Real-time PvP or co-op.
- Guilds, global chat, player marketplace, or complex live-ops infrastructure.
- Large content volume before the first region is polished.
- Paid user acquisition before retention and conversion are measured.
- Rewriting the active Phaser game in Unity or Godot.

## Delivery rule

Every feature follows: design → implementation → integration → automated checks → in-browser/device verification → documentation → merge. Do not mark a feature complete based only on source files existing.
