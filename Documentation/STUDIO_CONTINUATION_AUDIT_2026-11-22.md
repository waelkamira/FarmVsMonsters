# Studio Continuation Audit — 2026-11-22

## Verified repository state
- Active runtime: Phaser 3 / Next.js / React under `web/`; Godot remains paused.
- The latest inspected main commit includes upload binary-signature validation (PNG, WebP, GIF, MP3, WAV, OGG, ISO BMFF audio) and associated tests/docs.
- Main README's local Windows/Chrome workflow remains the prescribed verification method.
- No Windows local execution, Chrome playtest, lint, or production build was available in this review session. This status does not claim those passed.

## Immediate Studio risk register (from the Phase Zero audit)
1. Studio deployment/publishing can write multiple GitHub Contents objects sequentially; failures may leave partial publication.
2. Registry writes lack a demonstrated optimistic concurrency/locking strategy for concurrent edits.
3. Publication directly to main is not a controlled preview/release approval flow.
4. Current Studio is plant-centric; generalized monster, effect, item, audio, projectile lifecycle editors, visual map editor, and wave/stage builder are incomplete.
5. General asset delete/archive/restore and universal version history need safe, dependency-aware semantics.
6. Sprite-sheet dimensional validation and visual inspection need a distinct readiness gate.
7. Static source-regex tests do not replace behavioral API/runtime/browser tests.

## Branch inventory for follow-up
Feature branches found include:
- `feat/studio-release-pull-request-flow`
- `feat/studio-safe-asset-archive`
- `feat/studio-asset-version-history`
- `feat/studio-asset-readiness-lab`
- `feat/studio-asset-detail-dependency-center`
- `feat/studio-asset-file-integrity-audit`
- `feat/studio-ai-auto-rig-builder`
- `feat/studio-animation-profile-editor`
- `feat/studio-runtime-animation-profiles`
- `feat/studio-hybrid-animation-engine`
- `feat/studio-monster-runtime`
- `feat/studio-freeform-projectile-motion-editor`
- `feat/studio-sprite-frame-count`
- `feat/studio-easier-field-editing` and follow-up
- `feat/studio-direct-publish` (must be reviewed for safety; do not assume it is safe)

## Recommended execution order
A. Compare and review safety-critical release-flow, archive, integrity, readiness, dependency, and version-history branches against main. Do not merge blindly or activate direct publishing.
B. Establish a safe content publication transaction: draft package/manifest, validation, staged branch or PR, verify all assets and references, then explicit merge; failure must not alter published catalog.
C. Add registry concurrency protection (content SHA / expected version), conflict UI, and preservation of concurrent edits.
D. Validate files by actual decode and dimensions, frame-count/grid preview, and safe asset limits.
E. Expand editors in order: plant runtime, monster runtime, projectile trajectory, animations, effects/audio/items, maps, stages/waves, economy/progression.
F. Behavioral API tests, game integration tests, and Chrome Windows playtest/build remain required acceptance gates.

## Session limitation
GitHub source inspection and repository metadata were available. The local Windows folder `H:\FarmVsMonsters\web` and browser session were not connected, so commands, local files, and actual gameplay could not be executed.


## Documentation reconciliation update — 2026-11-22

The foundation-first documentation pass is available for review in draft PR #90:
- `STUDIO_SYSTEM_INVENTORY.md` — actual pages, API routes, shared modules, planned systems and evidence boundaries.
- `STUDIO_END_TO_END_DATA_FLOW.md` — source-backed flows and required transactional boundaries.
- `STUDIO_DEPENDENCY_MAP.md` — layer/dependency order and unified Asset & Animation lifecycle.
- `STUDIO_PHASE1_ACCEPTANCE_MATRIX.md` — explicit Phase 1 gates and end-to-end scenarios.
- `STUDIO_IMPLEMENTATION_ROADMAP.md` — reordered phases with Studio Core and Asset & Animation foundation in Phase 1.
- `STUDIO_MASTER_PLAN.md` — canonical reconciliation section while preserving historical implementation notes.

The user-confirmed governance decision is explicit: Auto-Rig and Hybrid/Skeletal Rig are integrated capabilities within Asset & Animation Studio, not separate projects or release lifecycles. Both must use the same asset identity, revisions, dependency checks, readiness, release approval, runtime validation and rollback.

PR #90 is draft and has not been merged. The branch is based on main `a642d676e186bb6ae59b5875585352a690ce40d7`, six commits ahead and zero commits behind at comparison time. No code, runtime or asset changes were made in this documentation pass. No tests, lint, production build, Chrome/Windows or live Phaser battle were executed.
