# Phase 1 Acceptance Matrix — Studio Foundation

**Baseline:** `main` at `a642d676e186bb6ae59b5875585352a690ce40d7`  
**Snapshot:** 2026-11-22  
**Phase status:** Active; not accepted/closed.

## Status meanings
- **Present:** implementation is visible in inspected source.
- **Partial:** a component exists but acceptance scope is incomplete.
- **Not verified:** required execution evidence is absent.
- **Blocked:** known infrastructure or safety issue prevents acceptance.
- **Pass:** only after evidence is attached and reviewed.

## Acceptance gates

| ID | Gate | Acceptance criteria | Source evidence | Snapshot status |
|---|---|---|---|---|
| P1-01 | Studio shell/navigation | Stable shell, coherent navigation, responsive layouts, no dead links, extensible feature boundaries | `web/app/studio/page.js`, `studio.css` | Partial; page is large and navigation coverage not fully audited |
| P1-02 | Authentication/session | Protected APIs reject unauthenticated requests; secure cookie/session lifecycle | `api/studio/session/route.js`, `signedSession.mjs` | Present in source; browser/security execution not verified |
| P1-03 | Authorization model | Clear role/permission checks for read, edit, test, approve, publish, archive, restore | Session currently demonstrates a single admin-token pattern | Partial; full RBAC not evidenced |
| P1-04 | Canonical content contract | Stable IDs, schema/type validation, version compatibility, no duplicated source of truth | `assetTypes.mjs`, profile validators | Partial; capability registry and schema migration policy need consolidation |
| P1-05 | Storage abstraction | Local/GitHub drivers behind stable interfaces; failures do not corrupt registry | Asset API and testing API contain driver-specific paths | Partial; service boundary and storage contract need formalization |
| P1-06 | Safe file intake | MIME + byte signature + size + safe path; decode and dimension checks | `assetTypes.mjs`, upload API, upload-signature tests | Partial; actual image decode/dimension browser workflow not verified |
| P1-07 | Immutable asset identity | Stable IDs and immutable file paths; replacing creates new path | `immutableAssetPath.mjs`, asset API | Present in source; failure-path test needed |
| P1-08 | Revision snapshots | Complete snapshots include combat, animation, rig, monster and dependencies | `assetVersions.mjs` | Present in source; complete UI restore flow not verified |
| P1-09 | Dependency integrity | Forward/reverse references, missing refs, safe archive/replace/restore | `assetDependencies.mjs`, readiness module | Present in source for modeled relations; relation coverage incomplete as content expands |
| P1-10 | Concurrency safety | All writes compare expected version/SHA; conflicts preserve local edits and provide reload/merge path | `registryConcurrency.mjs` | Partial; enforcement coverage and conflict UI not proven |
| P1-11 | Content lifecycle | Draft/testing/approved/published/disabled/archived with guarded transitions | `releaseLifecycle.mjs`, asset API | Partial; complete operational/browser lifecycle not verified |
| P1-12 | Release transaction | Complete package, dependency closure, review, atomic activation, rollback; no partial live state | Release branch helper and PR workflow references | Blocked/partial; multi-file atomic activation and failure recovery not proven |
| P1-13 | Runtime contract | Published catalog maps exactly to runtime behavior; old content remains compatible | Plant/monster profiles and Phaser integration source | Partial; live battle proof not available |
| P1-14 | Asset & Animation foundation | Sprite Sheet, animation, rig, Auto-Rig share identity, revisions, dependencies, readiness and release | Rig/Auto-Rig modules, RigEditor, worker route | Partial; full UI→worker→save→battle proof absent |
| P1-15 | Basic test foundation | Unit, API, integration and browser checks are separated and reproducible | Many focused `web/tests/*studio*` files | Partial; test files exist but execution result not confirmed |
| P1-16 | Readiness Lab | Report contract, files, dependencies and unsupported capabilities; clear not-tested state | `/studio/testing`, testing API | Present as static/read-only audit; not a live simulator |
| P1-17 | Arabic/RTL foundation | Shared layout direction, labels, validation and editor behavior support Arabic/RTL | Arabic labels exist in source | Partial; full page/browser RTL review not performed |
| P1-18 | Draft protection | Autosave or reliable unsaved-change warning/recovery across editors | Main Studio UI | Not verified; must test navigation/reload/network failure |
| P1-19 | Auditability | Who/what/when for sensitive operations and release state transitions | Version metadata partially present | Partial; comprehensive audit trail not evidenced |
| P1-20 | No false completion | UI and docs distinguish implemented, verified, failed, blocked and not tested | Docs and testing report | Partial; adopt one shared evidence vocabulary |

## Required end-to-end acceptance scenarios

### Scenario A — ordinary asset
1. Authenticate.
2. Create a new asset with a stable ID.
3. Upload a supported file; reject malformed/oversized/unsafe inputs.
4. Preview and verify actual dimensions and frame grid.
5. Save draft; reload and confirm exact persisted values.
6. Edit and save a new revision.
7. Run readiness audit; show dependencies and file presence.
8. Test in the relevant Phaser context.
9. Request release through the approved review route.
10. Confirm published catalog and runtime load the exact revision.
11. Restore a prior revision as a new draft without mutating published content.

### Scenario B — Auto-Rig + Hybrid Rig
1. Start from an existing registered source asset.
2. Request a proposal only when a compatible worker is actually reachable.
3. Validate worker response, source dimensions and part references.
4. Review/edit parts, roles, bones, pivots, clips, attachments and hitboxes.
5. Save the rig in the same asset record and revision history.
6. Verify dependency closure and prevent destructive actions on referenced parts.
7. Preview with the same evaluator/coordinate conversion used by Phaser.
8. Run readiness checks and a live battle with the rigged entity.
9. Publish through the same release transaction as every other asset.
10. Verify fallback for legacy Sprite Sheet assets and rollback.

### Scenario C — concurrent edits and failed release
1. Open the same asset in two sessions.
2. Save from session A.
3. Attempt stale save from session B.
4. Reject stale write without losing B's unsaved form state.
5. Simulate a release failure after staging.
6. Verify active catalog pointer and runtime content remain unchanged.
7. Retry or rollback with a clear audit trail.

## Phase 1 exit criteria

Phase 1 remains active until:
- all P1 gates are Pass or explicitly scoped out with user approval;
- Scenarios A, B and C have reproducible evidence;
- tests, lint and production build have actually run on a working runner;
- Chrome/Windows editor and live Phaser verification have been completed;
- no known data-loss, partial-release or stale-write blocker remains;
- all docs agree on the same phase status and source baseline.

A green source-only test suite is insufficient. A successful static audit is insufficient. A UI screenshot is insufficient.

## Evidence log template

For each run record:
- commit SHA and branch;
- environment and runtime versions;
- exact command or browser scenario;
- start/end time;
- passed/failed/skipped counts;
- logs/artifacts;
- known limitations;
- reviewer and follow-up issue.

Until evidence exists, use **Not verified**, not Pass.
