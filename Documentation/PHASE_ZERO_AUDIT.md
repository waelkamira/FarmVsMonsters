# FarmVsMonsters — Phase 0 Audit

**Audit date:** 2026-11-20  
**Scope:** source-level inspection of the current `main` branch through GitHub file reads.  
**Important:** this is not a local execution report. No Windows browser session, Node install, test run, lint run, or production build was executed during this source review.

## Confirmed project direction

- Root README identifies `web/` as the active project: Next.js + React + Phaser 3.
- `godot/` is explicitly paused and retained as a reference.
- The active game is a 2D cartoon farm-defense game.
- Local development and playtesting are expected in Chrome on Windows.
- Android packaging is deferred until the browser game is complete.

## Source files inspected

- `web/package.json`
- `web/scripts/build-asset-manifest.mjs`
- `web/game/scenes/BattleScene.js`
- `web/tests/asset-manager.test.mjs`
- `web/README.md`
- `README.md`
- `Documentation/GAME_DESIGN_DOCUMENT.md`
- `Documentation/BUILD_LOG.md`

## Findings

### 1. Asset manifest generator

The current `web/scripts/build-asset-manifest.mjs` source already:
- Recursively scans `web/public/assets`.
- Computes SHA-256 hashes and reports exact duplicate files.
- Detects duplicate asset keys and stops with an error.
- Collects image dimensions when supported by its parser.
- Builds grouped asset metadata and spritesheet metadata.
- Defines `largeFiles` before using it.
- Writes both `asset-audit.json` and `asset-manifest.json`.

**Correction to an earlier review note:** the claim that `largeFiles` was undefined and that the audit file was not written is not supported by the current `main` source. The current file contains both the declaration and the audit write. Do not make a speculative patch to this script. Runtime verification is still required.

### 2. Asset manager tests

`web/tests/asset-manager.test.mjs` includes coverage for:
- Loading a manifest group once and skipping cached textures.
- Releasing manager-owned textures after their final reference.
- Preserving textures that existed before manager loading.
- Requiring frame metadata for spritesheets.
- Keeping shared textures alive while another scene manager references them.

These are useful foundations, but do not by themselves prove the full manifest generator, BattleScene, or game runtime works.

### 3. BattleScene integration

`web/game/scenes/BattleScene.js` imports the Phaser asset manager, seeded random helper, combat event log, phase-one rules, combat simulation, and phase-one combat contract. It also contains direct preload declarations for battlefield UI, plant, farmer, dragon, and hyena assets.

The scene is substantial and should be changed incrementally. Preserve existing asset keys and frame configurations unless the actual image dimensions and runtime behavior prove a correction is needed.

### 4. Documentation drift

The existing `Documentation/GAME_DESIGN_DOCUMENT.md` describes a stylized 3D isometric Unity prototype and lists a different character roster. This conflicts with the current root README and active Phaser browser-game decision.

Update the design document to describe the active 2D Phaser implementation and the newly approved farm-world direction. Keep historical Unity/Godot material only where clearly labeled as archived context.

## Verification still required on the developer's Windows machine

Run from `web/`:

```bash
npm ci
npm test
npm run lint
npm run build
npm run assets:manifest
```

Then open the game using `OPEN_IN_CHROME.bat` and verify:
- No asset load failures or console errors.
- Plant cards and battlefield sizing remain correct.
- Plant placement, targeting, attacks, monster movement, wave completion, rewards, and progression work end-to-end.
- No regression in approved hyena-run1 animation or plant sprite crops.
- Repeated scene transitions do not leak or prematurely destroy textures.

## Phase 0 status

**Source review:** started.  
**Asset manager unit coverage:** confirmed present.  
**Manifest generator:** source appears to generate both outputs; runtime not yet verified.  
**Gameplay runtime:** not executed in this audit.  
**Lint/build/test status:** not executed in this audit.  
**Next action:** run the listed checks locally and resolve verified failures before adding the farm hub.
