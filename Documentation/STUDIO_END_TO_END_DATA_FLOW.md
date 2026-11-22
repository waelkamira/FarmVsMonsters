# Studio End-to-End Data Flow Map

**Baseline:** `main` at `a642d676e186bb6ae59b5875585352a690ce40d7`  
**Snapshot:** 2026-11-22

## 1. Canonical flow

```text
Studio page / editor
  → authenticated Studio API
  → request parsing + authorization
  → domain validation / capability contract
  → registry + immutable asset storage
  → revision snapshot + dependency graph
  → readiness/test evidence
  → release package / review request
  → published catalog + asset files
  → Runtime adapter
  → Phaser scene / gameplay
  → runtime and regression evidence
```

This is the required logical flow. The current code implements parts of it, but the complete chain must be verified per operation.

## 2. Current source-backed paths

### Session
- UI requests `/api/studio/session`.
- API validates the signed `fvm_studio_session` cookie using `signedSession.mjs` and the configured `STUDIO_ADMIN_TOKEN`.
- Session API exposes authenticated state and selected storage driver.
- Limitation: this demonstrates a basic administrator session, not a complete user/role/permission administration system.

### Asset record and file lifecycle
- UI uses `/api/studio/assets`.
- API imports shared contracts for asset types, plant/monster profiles, animation profiles, skeletal rigs, dependencies, immutable paths, versions, readiness and release lifecycle.
- Registry path in source: `web/game/data/studioAssetRegistry.json`.
- Published catalog paths in source include `web/public/assets/studio-plant-catalog.json` and `web/public/assets/studio-monster-catalog.json`.
- Upload bytes are validated before use; file records use immutable paths and records retain revision history.
- A changed published record is expected to become a new draft/revision rather than mutate the active published version.
- Important risk: the API route is large and currently combines persistence, validation, lifecycle and release concerns. Refactoring should be incremental and behavior-preserving.
- **Critical observed divergence:** the current `PATCH publish` implementation copies asset files to `STUDIO_PUBLISH_BRANCH` (default `main`), writes the published catalog to that branch, then attempts to sync the registry on the storage branch. It does not create a release PR in this route. If catalog publication succeeds but registry sync fails, the API returns success with `registrySyncWarning`; therefore the live catalog can change while registry status remains stale. This is not an atomic release transaction and does not satisfy the intended review-first policy.

### Testing/readiness audit
- UI requests `/api/studio/testing`.
- API authenticates the session, loads the registry and calls `auditStudioAssetRegistry` plus physical file audit.
- The page reports ready/warning/blocked/excluded and file present/missing/unknown.
- This is a registry/file readiness report. It does not itself run a live Phaser battle, verify visual correctness, or measure FPS.

### Auto-Rig proposal
- Studio editor invokes the protected `/api/studio/auto-rig/worker` bridge.
- API validates session, same-origin request shape, bounded body/response sizes and worker response protocol.
- `autoRigWorkerProtocol.mjs` normalizes capabilities and validates proposal shape.
- `autoRigBuilder.mjs` creates a deterministic rig proposal/profile using the shared skeletal contract.
- Human review and ordinary asset save/revision/readiness/release lifecycle remain mandatory.
- Worker/model availability, complete browser workflow and final runtime quality are not established by source presence alone.

### Hybrid/Skeletal animation
- Rig profile is stored on the asset record alongside its animation profile.
- `assetVersions.mjs` snapshots `rigProfile` and other behavior data.
- `assetReadiness.mjs` validates the rig and referenced parts.
- `assetDependencies.mjs` resolves part references and protects referenced assets.
- Release packaging must include referenced part files and descriptors.
- `phaserSkeletalRig.mjs` adapts the validated profile to Phaser containers; shared evaluators resolve transforms, attachments and hitboxes.
- Existing Sprite Sheet assets without a rig retain their fallback path.

## 3. Canonical data ownership

| Data | Canonical owner | Consumers |
|---|---|---|
| Asset identity/type/status/revision | Studio asset registry | Studio library, detail page, readiness, release flow |
| Binary file | Immutable asset path/storage | Preview, release package, Phaser texture loading |
| Sprite Sheet rows/columns/frame count | Asset record + validation contract | Frame editor, animation profile validator, runtime loader |
| Animation profile | Asset record/version snapshot | Preview and Phaser animation setup |
| Skeletal rig profile | Asset record/version snapshot | Rig editor, readiness, dependency audit, Phaser adapter |
| Rig part relationship | Rig profile + dependency resolver | Detail page, safe archive/replace, release packaging |
| Plant combat profile | Asset record/version snapshot | Plant catalog and Phaser plant behavior |
| Monster profile | Asset record/version snapshot | Monster catalog and wave/runtime integration |
| Projectile relationship | Plant combat profile + dependency resolver | Projectile editor, dependency center, runtime projectile |
| Release state | Release request + lifecycle resolution | Studio status, catalog eligibility, runtime |
| Test/readiness report | Testing API result | Studio Testing page and release gates |

No UI component should invent a second canonical copy of any of these values.

## 4. Required transactional boundaries

1. **Upload boundary:** validate declared MIME, byte signature, size and safe path before registry references the file.
2. **Save boundary:** compare expected registry/content SHA; reject stale writes and preserve the user's unsaved changes.
3. **Revision boundary:** snapshot the previous complete behavior profile before replacing it.
4. **Dependency boundary:** resolve both forward and reverse dependencies before archive, replace, restore or release.
5. **Release boundary:** stage all descriptors and binary files; validate the complete manifest; publish via an immutable release package and one activation pointer or equivalent atomic switch.
6. **Runtime boundary:** load a complete compatible catalog/package; reject unsupported schema/capability versions with actionable diagnostics.
7. **Rollback boundary:** restore a previous immutable package without manually reconstructing files or altering player-save data.

The current source has helpers for several of these boundaries, but the multi-file atomic activation and full failure-recovery behavior remain open acceptance items. In particular, the current mainline publish route is a direct-write flow, not the desired staged-branch/PR approval flow; do not describe it as review-gated until the implementation is replaced and tested.

## 5. Cross-cutting contracts

- Stable IDs, never display names or mutable filenames, identify relationships.
- Every schema is versioned and validated.
- Unsupported capabilities cannot be published.
- No executable JavaScript is stored in asset records.
- Content presentation (animation) must not silently own combat authority.
- API writes are authenticated and bounded.
- Audit evidence distinguishes source tests, API behavior, browser behavior and gameplay behavior.
- All operations preserve immutable published versions.

## 6. Required evidence for a complete feature

A feature is complete only with evidence for:
- UI action and validation feedback;
- API authorization and request validation;
- persisted data/revision;
- dependency behavior;
- preview and readiness;
- runtime consumption of the exact saved value;
- publish and rollback behavior;
- automated tests plus real browser/gameplay checks where relevant.

## 7. Known structural concern

`web/app/api/studio/assets/route.js` currently imports and coordinates many domain modules and is a large route file. Do not rewrite it wholesale during the documentation phase. The later architecture task should extract service functions behind stable contracts, then add tests around the route/service boundary.
