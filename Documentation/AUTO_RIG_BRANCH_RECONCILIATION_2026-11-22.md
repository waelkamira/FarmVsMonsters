# Auto-Rig branch reconciliation — 2026-11-22

## Decision
Do not merge `feat/studio-ai-auto-rig-builder` wholesale into `main` yet. The branch contains a substantial, coherent Auto-Rig subsystem but is 289 commits ahead and 2 commits behind the current mainline, and its diff includes broad game/runtime, asset API, Studio UI, validation, and documentation changes. A selective integration/rebase is safer than a full merge.

## Verified branch contents
The inspected branch includes:
- `web/game/studio/autoRigBuilder.mjs`: deterministic rig-profile generation, manifest validation, quality analysis, polygon-vertex editing, semantic role options, source hash/frame data, part hierarchy, masks and occlusion-mask metadata.
- `web/app/studio/AutoRigBuilderPanel.jsx`: Arabic guided segmentation interface; visible-region proposals and point-prompt SAM 2 workflows, manual masks, role assignment and review.
- `web/app/studio/RigEditor.jsx`: dedicated editor implementation.
- `web/app/api/studio/auto-rig/worker/route.js`: authenticated API bridge with task and input validation.
- `web/local-ai-worker/worker.py`: loopback local SAM 2 worker; model files/config/checkpoint are user-installed, no cloud inference or automatic weight downloads.
- Tests and workflow coverage for the worker, Auto-Rig manifest, quality/publish gates, rig editing, library, and skeletal runtime.

## Capability boundaries (confirmed from inspected source)
- SAM 2 automatic proposals and point-prompted segmentation are implemented on the branch; these are masks, not semantic classification. Authors must assign roles and review.
- Hidden-region marking/occlusion-mask preparation exists, but actual pixel reconstruction/inpainting is not implemented.
- The readiness gate is intentionally strict: editable masks, role confirmation, review, confidence, resolved occlusion, source fingerprint, primary body/stem, and no unreviewed reconstructed pixels.
- Local inference requires installing the SAM 2 package and checkpoint on the user's machine. The worker binds to loopback and is not a hosted service.
- The branch's own build log reports focused Auto-Rig CI successes at several branch commits but also describes broad repository/game suite failures (including 53–54 failures in runs cited there). Those historical claims are recorded by branch documentation and are not independently re-run in this environment.

## Mainline comparison
The four key implementation files are absent from current `main` at the inspected ref. Therefore this Auto-Rig capability is not yet available from main. The branch is valuable but should be integrated in staged, conflict-aware slices.

## Safe integration sequence
1. Rebase/port the standalone manifest and validator module plus its focused tests.
2. Integrate worker protocol and loopback worker, security tests, and CI as a separately reviewed slice.
3. Integrate the Auto-Rig UI panel and asset extraction/persistence path.
4. Integrate RigEditor and skeletal runtime, then reconcile Phaser/game-scene changes.
5. Run focused CI and broad project CI, review conflicts and failure deltas, and only then promote the integrated work.

## Verification limitations
This report is based on GitHub source retrieval and branch comparison. No local checkout, browser, image fixture, Windows/WSL worker, or local build/test runner was available in this session.