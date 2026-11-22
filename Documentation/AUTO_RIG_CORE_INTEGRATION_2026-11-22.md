# Auto-Rig Core Integration — 2026-11-22

## Integrated on main

The following isolated Auto-Rig core files were ported from `feat/studio-ai-auto-rig-builder` into `main`:

- `web/game/studio/skeletalAnimation.mjs` — validated skeletal rig profile, animation clips, keyframe evaluation, attachments, and hitboxes.
- `web/game/studio/autoRigBuilder.mjs` — deterministic rig construction from already extracted parts, semantic role dictionary, parent selection, pivots, muzzle/emitter anchors, starter clips, manifest validation, quality analysis, and polygon vertex editing.
- `web/tests/studio-auto-rig-builder.test.mjs` — focused contract tests for rig generation, geometry, hierarchy, source fingerprints, quality gates, attachments, and polygon editing.

A further regression test verifies that the starter attack clip selects arm and hand bones when no weapon part is present. The current role matcher is the intended `/^(arm|hand)\\./` expression; the previously suspected extra-backslash issue was not present in the exact branch source inspected for this port.

## Integration boundaries

- The builder consumes extracted parts. It does not perform image segmentation itself.
- It does not reconstruct hidden pixels. Reconstruction must be supplied by a real upstream pixel-generation/inpainting stage; a mask or metadata flag is not reconstruction.
- Quality readiness requires a source fingerprint, reviewed parts, and resolved occlusion/provenance gates.
- The UI, API persistence, worker orchestration, Phaser skeletal runtime, and BattleScene integration are not included in this isolated port.
- The worker protocol integrated earlier intentionally does not advertise hidden-part reconstruction.

## Verification status

The files were fetched from the source branch and committed to `main` in small commits. GitHub status/workflow lookups currently return no check runs for these commits. The new web validation workflow should execute lint, the full Node test suite, and a production build on pushes affecting `web/**`; until a completed run is visible, no runtime or build pass is claimed.
