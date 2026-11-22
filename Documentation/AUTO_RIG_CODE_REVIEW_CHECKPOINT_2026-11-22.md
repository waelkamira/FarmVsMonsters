# Auto-Rig code review checkpoint — 2026-11-22

This follow-up reviews the manifest validator and quality gate on `feat/studio-ai-auto-rig-builder` after the initial branch reconciliation.

## Positive validation design
- Stable IDs and canvas-bound geometry are validated.
- Part masks and occlusion masks use bounded source-coordinate polygons.
- Parent graph cycle detection exists for both generated and persisted manifests.
- The persisted profile canvas and source dimensions are required to match.
- Source frame, hash syntax, part count and role-dictionary version are validated.
- Animation readiness separates confidence from explicit human review and fails closed for unresolved occlusion, absent fingerprint, missing editable masks, unknown roles, or reconstructed pixels.
- Quality warnings are explicit and do not silently modify data.

## Integration risks requiring tests during porting
1. **Role dictionary evolution:** persisted manifests are version-gated. Any dictionary update must include a deliberate migration or re-authoring strategy rather than silently accepting old roles.
2. **Image export/crop correctness:** the manifest stores source-space masks and pivots while the rig profile may refer to cropped image assets. Verify each part's alpha crop, pivot translation, transparent padding, and parent-local transform using visual fixtures.
3. **Hierarchy determinism:** test overlapping/duplicate semantic instances and custom parent relationships, including tie-breaking and cycle errors.
4. **Emitter anchor consistency:** test the authored source-space anchor through crop offset, parent transforms, runtime transforms, and projectile launch positioning in Phaser.
5. **Quality gate consistency:** server publish validation, editor validation, and readiness UI must use the same manifest/profile versions and must not permit stale review flags after edits.
6. **Worker safety and operating constraints:** keep the worker loopback-only, body/image limits, admission control, Host/Origin validation, and strict protocol validation intact. Do not weaken these when porting.
7. **Reconstruction honesty:** occlusion-mask authoring must remain labelled as preparation until a model actually creates pixels and those pixels are inspected/reviewed.

## Suggested fixture matrix for integration
- 1-part body-only rig; multiple same-role leaves/arms with stable IDs.
- Source with transparent margins and cropped part exports.
- Left/right mirrored parts; unusual or asymmetric pivots.
- Partial occlusion, explicit no-occlusion, unresolved occlusion and reconstructed provenance.
- Muzzle anchor on barrel, weapon, mouth and rejected non-emitter roles.
- Polygon edit that clamps valid vertices and rejects collapsed/zero-area geometry.
- Source fingerprint mismatch and source-frame changes.
- Missing local SAM 2 checkpoint, model initialization error, worker busy response, malformed/oversized requests, origin/host rejection.
- Registry save/reload/clone/revision restore and publish gate behavior.

## Next integration checkpoint
Port and review the standalone Auto-Rig builder + manifest contract first, with focused unit tests and a fixture-based integration contract. Keep worker, UI, and runtime integration as separate slices. Do not merge the full divergent branch without review.

## Verification
This checkpoint is source review only. No image fixtures, local Node/Next build, Python model, Windows/WSL worker, or Phaser runtime could be executed in this environment.
