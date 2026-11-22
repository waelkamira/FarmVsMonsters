# Studio Dependency & Architecture Map

**Baseline:** `main` at `a642d676e186bb6ae59b5875585352a690ce40d7`  
**Snapshot:** 2026-11-22

## 1. Layering contract

| Layer | Responsibility | Must not do |
|---|---|---|
| Studio UI | Navigation, forms, preview, user feedback, invoking workflows | Directly write files or mutate runtime objects |
| API boundary | Authentication, request parsing, rate/size/origin guards, response mapping | Become the only home for domain rules |
| Domain contracts/services | Schemas, validation, IDs, dependency rules, lifecycle, revisions | Depend on React or browser UI |
| Registry/storage | Canonical records and immutable files | Contain arbitrary executable content |
| Release coordinator | Package, validate, stage, approve, activate, rollback | Partially mutate live catalogs |
| Runtime adapters | Convert published schemas to Phaser-ready data | Invent alternate defaults that contradict Studio |
| Game engine | Authoritative movement/combat/waves and rendering | Hard-code per-content values that belong in data |
| Quality evidence | Unit/API/integration/browser/gameplay checks | Treat source-text tests as gameplay proof |

## 2. Dependency graph

```text
Studio Shell / Navigation
  ├─ Session & Authorization
  ├─ Content Library / Search
  │    └─ Asset Registry Contract
  │         ├─ Asset Types & File Validation
  │         ├─ Immutable Storage Paths
  │         ├─ Revisions / Version Snapshots
  │         ├─ Dependency Graph
  │         └─ Lifecycle & Release State
  ├─ Asset & Animation Studio
  │    ├─ Sprite Sheet Grid Contract
  │    ├─ Animation Profile Contract
  │    ├─ Hybrid/Skeletal Rig Contract
  │    │    ├─ Auto-Rig Proposal Builder
  │    │    ├─ Rig Parts / Attachments / Hitboxes
  │    │    └─ Phaser Skeletal Adapter
  │    └─ Audio / VFX asset contracts
  ├─ Plant / Monster / Projectile Editors
  │    ├─ Plant / Monster Profile Contracts
  │    ├─ Projectile Trajectory Contract
  │    └─ Asset & Animation references
  ├─ Testing & Readiness
  │    ├─ Schema validators
  │    ├─ File audit
  │    ├─ Dependency audit
  │    └─ Runtime/browser/gameplay test harness (to be completed)
  └─ Release Manager
       ├─ Immutable revision
       ├─ Dependency closure
       ├─ Complete package manifest
       ├─ Approval / PR
       ├─ Atomic activation (gap)
       └─ Rollback
```

## 3. Hard dependency ordering

1. Identity, schemas, storage abstraction and session protection precede all editors.
2. Asset identity, immutable paths, validation and dependency graph precede asset replacement and advanced animation.
3. Sprite Sheet and animation contracts precede Plant/Monster authoring that depends on animation.
4. Rig contract and dependency closure precede Auto-Rig save, Hybrid Rig preview and publication.
5. Runtime adapter and supported capability registry precede exposing new gameplay behavior in an editor.
6. Map/World schema precedes Level Builder.
7. Level/Wave contracts and Monster profiles precede full encounter simulation.
8. Save integrity precedes progression and economy authoring.
9. Complete test evidence and release transaction precede broad Live Operations.

## 4. Asset & Animation Studio: one lifecycle

Auto-Rig and Hybrid Rig are nested capabilities, not independent product lifecycles.

```text
Source Asset
  → validate/decode/dimensions
  → create immutable asset identity
  → Sprite Sheet / part preparation
  → optional Auto-Rig proposal
  → human review and rig editing
  → shared Rig schema validation
  → save draft + revision snapshot
  → dependency closure (all rig parts)
  → readiness and preview
  → browser/runtime battle test
  → release package + approval
  → active Phaser catalog
  → monitoring / rollback
```

Auto-Rig is allowed to propose part segmentation and semantic roles. It must not bypass:
- human review of parts and bone hierarchy;
- stable IDs and source asset references;
- rig schema validation;
- dependency tracking;
- revision history;
- readiness checks;
- release approval;
- browser/runtime verification.

## 5. Dependency integrity rules

- Referenced assets cannot be destructively archived or replaced without impact analysis.
- Restore must re-check reverse dependencies before changing state.
- Shared immutable paths remain safe until a clone explicitly receives a replacement path.
- A published manifest cannot reference missing files or unsupported schemas.
- A new runtime capability must register a contract, UI schema, adapter and tests before it becomes selectable.
- A dependency cycle is a validation error unless a future explicitly designed relationship type permits it.
- A failed release must leave the previous active package untouched.

## 6. Current architectural gaps to close in Phase 1

- Break the large asset API route into testable service/domain modules without changing public behavior.
- Verify expected-SHA enforcement on every mutation path and surface conflicts in the UI.
- Establish atomic multi-file release packaging and a single activation switch.
- Make release request state reconciliation reliable after merge, close, failure or lost webhook/poll.
- Define capability/schema registry and compatibility checks centrally.
- Complete the evidence model: distinguish static audit, API tests, decoded file checks, editor browser tests and live Phaser playtests.
- Ensure navigation and common UI patterns scale to more editors without a monolithic page.

## 7. Explicitly deferred

World/map editing, full level/wave authoring, economy/progression, broad analytics, general AI assistant and multiplayer/social expansion remain later phases. Their contracts can be anticipated, but they must not dilute the Phase 1 foundation gate.
