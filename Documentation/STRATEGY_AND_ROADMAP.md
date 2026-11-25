# FarmVsMonsters — Strategy and Execution Roadmap

**Product direction:** a colorful farm-and-battle world built around farming, plant collection and progression, tactical defense, exploration, and social competition.

**Primary growth priority:** fast, sustainable organic discovery and sharing. Retention and player enjoyment take precedence over raw download counts or manipulative engagement mechanics.

## Active technical baseline

- Canonical runtime: Next.js + React + Phaser 3 in `web/`.
- Local development target: Windows + Google Chrome using `web/OPEN_IN_CHROME.bat`.
- `godot/` is a paused reference project. Preserve it; do not add active features there or migrate the game away from Phaser.
- Default integration branch: `main`.
- Do not start Android packaging or public deployment before the browser game is stable and playtested.
- Preserve existing artwork, animation keys, scene behavior, and approved gameplay decisions unless a verified defect requires a narrowly scoped correction.

## Product pillars

1. **My farm:** a personal space to grow plants, collect resources, expand land, and improve useful buildings.
2. **Battlefield defense:** readable tactical battles with plant placement, enemy waves, special enemies, and memorable bosses.
3. **Plant discovery and progression:** collectible plants, meaningful upgrades, distinct abilities, and carefully designed discoveries.
4. **World exploration:** unlockable regions with their own visual identity, enemies, rewards, and challenges.
5. **Social sharing and competition:** asynchronous friend visits, challenge results, achievements, and shareable moments before considering real-time multiplayer.

These pillars must form one connected progression loop: farm resources → develop plants → defend the farm → earn rewards → unlock new places and possibilities → improve the farm.

## Execution phases and exit gates

### Phase 0 — Repository and runtime audit

- Verify the current `main` head and active project structure.
- Review the Phaser battle scene, gameplay rules, asset manager, asset manifest generator, tests, package scripts, and CI configuration.
- Identify blockers that prevent local development, tests, or production builds.
- Record verified findings separately from assumptions.
- Preserve the current PNGs and source sprite sheets. Inspect real image dimensions before defining frame boundaries.
- Exit gate: the asset pipeline, development command, test command, and production build have no known source-level blockers; remaining browser-only checks are clearly listed.

### Phase 1 — Polished vertical slice

Target content, subject to the existing project's verified state:
- 10 usable plants with clear tactical roles.
- 6 enemy types and at least one distinctive boss.
- 10 short, progressively challenging stages in one biome.
- A complete first-session journey: onboarding → choose seeds → place plants → fight waves → win/lose → rewards → upgrade/unlock → replay.

Exit gate: a new player can understand the loop without coaching, finish several battles, and has a clear reason to try another.

### Phase 2 — Farm and connected progression

- Farm plot placement and crop/plant production.
- Resource collection and a transparent economy.
- Useful buildings and bounded upgrades.
- Plant collection, unlocks, and progression.
- World map and gated region progression.

Exit gate: farm actions materially support battle progression, and battle rewards materially improve the farm.

### Phase 3 — Differentiating discovery and social features

- Plant combination/discovery with understandable rules and no misleading random-purchase mechanics.
- Boss encounters with readable telegraphs and distinct mechanics.
- Asynchronous friend-farm visits and challenge comparisons.
- Share cards or short clips for discoveries, boss wins, and personal records.

Exit gate: players can create and share moments that are specific to FarmVsMonsters, not generic screenshots.

### Phase 4 — Reliability, analytics, and scale

- Reliable save/restore and, when needed, server-backed account synchronization.
- Instrument first-session completion, battle completion, D1/D7/D30 retention, session length, repeat battles, and organic shares.
- Test performance on representative low- and mid-range phones.
- Validate accessibility, localization, privacy, and child-appropriate design.
- Consider real-time multiplayer only after evidence justifies its cost and complexity.

Exit gate: real player tests show a stable experience and a repeatable acquisition/retention signal.

### Phase 5 — Global release and live operations

- Android/iOS packaging after browser quality is proven.
- Localization, store materials, creator partnerships, and measured launch campaigns.
- Regular content drops, seasonal events, and cosmetic monetization that does not sell competitive power.

Exit gate: release readiness, support processes, crash/performance monitoring, and a sustainable content cadence.

## Non-goals until the relevant exit gate

- No real-time multiplayer in the first playable slice.
- No large content catalogue before the first 10 plants and first biome are fun.
- No paid user acquisition before retention and conversion are measured.
- No pay-to-win economy.
- No rewriting the active Phaser game in Unity or Godot.
- No destructive asset conversion, renaming, or deletion as part of inventory work.

## Engineering workflow

Every feature must have:
1. A concise design and acceptance criteria.
2. A clear owner module and explicit data flow.
3. Implementation integrated with the actual game route and state.
4. Focused regression tests for important rules and data safety.
5. Local verification in Chrome for visual/gameplay changes.
6. A build-log entry that states exactly what was and was not verified.
7. A reviewed change merged to `main` only after the applicable checks pass.

Prefer small, reviewable branches. Never report a source read-back as a successful runtime test.

## Preserved project decisions

- The Phaser 3 browser game in `web/` is the active project.
- Keep `godot/` as a paused reference.
- Preserve existing asset files and stable Phaser asset keys.
- The provisional 150×150 plant-frame convention is not a reason to override actual source-sheet dimensions. Inspect each sheet and use its real frame geometry.
- Keep the existing approved battle rules and visual assets unless a verified defect or explicit product decision requires a change.

## Current execution note

Phase 0 is in progress. The repository's latest `main` commits have already repaired the undefined `largeFiles` reference and added the asset audit JSON output. This work adds pure, testable audit helpers and regression tests, aligns the manifest and audit timestamps, and documents the asset pipeline before the broader runtime audit continues. See `Documentation/STRATEGY_EXECUTION_LOG.md`.

