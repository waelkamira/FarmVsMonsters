# Studio System & Page Inventory

**Snapshot:** 2026-11-22  
**Repository baseline:** `main` at `a642d676e186bb6ae59b5875585352a690ce40d7`  
**Purpose:** Evidence-based inventory of Studio on the inspected mainline. This is not a claim that every listed system is production-ready.

## Status vocabulary

- **Source present:** relevant source files exist on this baseline.
- **Integrated in source:** a visible/API/runtime path is present in this baseline.
- **Automated coverage present:** focused test files exist; this does not mean they were executed.
- **Browser/runtime verified:** only when a real browser/gameplay check is recorded with evidence.
- **Incomplete:** known missing scope or acceptance work remains.
- **Not verified:** this review could not execute the behavior.

A file or test existing is not proof of successful runtime behavior.

## 1. Current Studio pages

| Route / page | Source | Observed responsibility | Current evidence state |
|---|---|---|---|
| `/studio` | `web/app/studio/page.js` | Main control surface, asset library, content workflows, admin session-aware UI | Source present; broad UI exists; end-to-end behavior not browser-verified in this review |
| `/studio/assets/[id]` | `web/app/studio/assets/[id]/page.js` | Unified asset detail, editing and dependency/version context | Source present; browser workflow not verified |
| `/studio/testing` | `web/app/studio/testing/page.js` | Read-only asset registry/readiness and physical-file audit report | Source present; this is not a live Phaser battle simulator |

Additional editor components:
- `web/app/studio/RigEditor.jsx` — skeletal/hybrid rig editing surface.
- `web/app/studio/ProjectileTrajectoryEditor.jsx` — projectile path/trajectory editing surface.
- `web/app/studio/studio.css` — Studio presentation layer.

These components are not separate products. They are feature workspaces inside the Studio shell and must use the same content lifecycle and release contract.

## 2. API routes

| Route | Source | Observed responsibility | Known boundary |
|---|---|---|---|
| `/api/studio/session` | `web/app/api/studio/session/route.js` | Admin token verification, signed session cookie, session status/logout | Single configured admin token model; broader roles/permissions are not demonstrated here |
| `/api/studio/assets` | `web/app/api/studio/assets/route.js` | Asset registry CRUD/workflow, upload validation, revisions, dependencies, lifecycle and release integration | Large route currently combines multiple responsibilities; persistence driver and multi-file release atomicity need further hardening |
| `/api/studio/testing` | `web/app/api/studio/testing/route.js` | Protected readiness audit and physical file existence checks | Audit is not equivalent to decoded-image validation or a live gameplay/browser test |
| `/api/studio/auto-rig/worker` | `web/app/api/studio/auto-rig/worker/route.js` | Authenticated, bounded, same-origin worker proxy and protocol validation | Requires a reachable compatible worker; local model/runtime availability is not established by this route |

## 3. Shared domain modules

| Capability | Main source files | Source-level status | Remaining proof / gap |
|---|---|---|---|
| Asset type and upload contracts | `assetTypes.mjs` | Present; supported types and byte validation exist | Verify full upload matrix and real file decoding in browser |
| Asset dependency graph | `assetDependencies.mjs` | Present; direct and reverse references are modeled | Expand relation coverage as new content types are introduced |
| Immutable asset paths | `immutableAssetPath.mjs` | Present | Verify replacement/rollback under failure and concurrency |
| Asset revisions | `assetVersions.mjs` | Present; combat, animation, rig, monster and dependency snapshots are represented | Verify complete lifecycle in browser and release path |
| Asset readiness | `assetReadiness.mjs` | Present; contract/readiness and file audit states | Actual image decode, dimensions and frame inspection still require distinct proof |
| Release lifecycle | `releaseLifecycle.mjs` | Present; release state transitions and branch naming | Multi-file atomicity, PR lifecycle and failure recovery need end-to-end proof |
| Registry concurrency | `registryConcurrency.mjs` | Expected-SHA conflict helper present | GitHub asset-registry writes use expected SHA in several paths; local POST/PATCH paths do not demonstrate concurrency protection; verify all mutations and conflict UI |
| Plant profile | `plantProfiles.mjs` | Present | Verify each editable field affects live Phaser behavior |
| Monster profile | `monsterProfiles.mjs` | Present | Current supported behavior models are bounded; new AI behaviors require engine work |
| Animation profiles | `animationProfiles.mjs` | Present | Browser authoring and actual battle playback not verified here |
| Skeletal/Hybrid rig | `skeletalAnimation.mjs`, `skeletalWorldTransform.mjs`, `skeletalCollision.mjs` | Present | Live battle, priority edge cases, performance and device verification remain open |
| Auto-Rig proposal builder | `autoRigBuilder.mjs` | Present; deterministic proposal/build logic | Full UI-to-worker-to-rig-save workflow and real worker/model availability not verified |
| Auto-Rig worker contract | `autoRigWorkerProtocol.mjs` | Present; protocol and proposal validation | Worker service operation and model/license provenance need operational validation |
| Phaser skeletal adapter | `phaserSkeletalRig.mjs` | Present | Actual browser scene lifecycle and visual battle proof remain open |
| Projectile trajectory | `projectileTrajectory.mjs` | Present | Verify each exposed control through Studio → persisted data → Phaser |
| Signed Studio session | `signedSession.mjs` | Present | Broader authorization/role model not established |

## 4. Asset & Animation Studio scope

This is one integrated system, with the following sub-capabilities:
1. Asset intake and validation.
2. Asset identity, immutable paths and reusable library.
3. Sprite Sheet grid/frame metadata and preview.
4. Animation profiles (Idle/Move/Attack and supported states).
5. Skeletal/cutout rig editor (Hybrid Rig).
6. Auto-Rig proposal generation and human-reviewed rig authoring.
7. Attachments, projectile muzzle anchors and pose-bound hitboxes.
8. Asset dependencies, revision snapshots and restoration.
9. Readiness checks and test evidence.
10. Release packaging and runtime activation.

Auto-Rig generates a proposal; it does not bypass human review, validation, asset identity, revision history, testing or release approval. Hybrid Rig is an animation mode within the same asset record/lifecycle, not a separate publishing system.

## 5. Target Studio system inventory (planned coverage)

| System | Primary workspace | Key data / dependencies | Mainline state |
|---|---|---|---|
| Studio shell, navigation, dashboard | `/studio` | Session, registry summaries, workflow state | Partial/source present; needs modularization and complete navigation audit |
| Content/asset library | `/studio` | Registry, IDs, types, statuses, search/filter | Present in source; browser verification open |
| Asset detail/dependency center | `/studio/assets/[id]` | Asset record, references, versions | Present in source; coverage not universal for all future relations |
| Asset & Animation Studio | Main + RigEditor | Asset files, frames, animation profile, rig profile | Partial/integrated source; browser/runtime gates open |
| Auto-Rig | RigEditor/workflow + worker API | Source image, worker protocol, proposal, rig contract | Builder and worker bridge source present; complete operational workflow unverified |
| Plant Studio | Main/detail page | Plant profile, projectile, animations, assets, Phaser | Partial integrated source; verify all editable fields and edge cases |
| Monster Studio | Main/detail page | Monster profile, behavior model, waves, assets, animations | Partial integrated source; supported behavior set limited |
| Projectile/Weapon Studio | Main + trajectory editor | Projectile asset, trajectory, origin, collision/effect | Partial source; verify full create/edit/runtime path |
| Effects & VFX | Asset types + future editor | Effect assets, trigger contracts, Phaser renderer | Asset type exists; full editor/runtime lifecycle incomplete |
| Audio | Asset types + previews | Audio file, metadata, trigger/volume contracts | Upload/type foundation exists; full sound-event authoring incomplete |
| Item/Inventory content | Registry target | Item schemas, player inventory and runtime | Planned/incomplete |
| World/Map Builder | Future workspace | Grid, terrain, paths, collision, environment | Not present as a Studio editor in inspected route inventory |
| Level/Wave Builder | Future workspace | Map, wave groups, monster profiles, conditions | Existing game data/runtime is not a full Studio authoring workflow |
| Player & Progression | Future workspace | Save schema, unlocks, resources, migrations | Planned/incomplete |
| Economy & Monetization | Future workspace | Costs, rewards, prices, validation | Planned/incomplete |
| Simulation & Balance Lab | Future workspace | Deterministic scenarios, battle engine, metrics | Current Testing Lab is a readiness audit, not this system |
| Localization & Accessibility | Future workspace | String catalogs, RTL, accessibility options | Design requirement; comprehensive Studio management not evidenced |
| Release Manager | Release lifecycle + UI | Version package, PR, approval, activation, rollback | **Unsafe/incomplete on current main:** PATCH publish writes directly to target branch (default main), then syncs registry separately; no PR created by this route; atomic release unverified |
| Operations & Analytics | Future workspace | Runtime telemetry, incidents, privacy | Planned/incomplete |
| AI Assistant | Future workspace | Proposals, plans, tests, approvals | Planned; Auto-Rig is a bounded specialized tool, not the general assistant |
| Settings & Security | Session/API | Auth, roles, audit, integrations | Basic signed admin session exists; full RBAC/audit administration incomplete |

## 6. Verification boundary at this snapshot

The review inspected GitHub source on main. It did not execute Windows commands, npm tests, ESLint, production build, Chrome, or a live Phaser battle. The existing focused test files are evidence of intended coverage only, not passing results.

## 7. Next inventory maintenance rule

Every new Studio feature must be added to this inventory with:
- page/route and owning component;
- API route and service/domain module;
- canonical data schema and storage location;
- runtime adapter/consumer;
- direct and reverse dependencies;
- focused tests and browser/gameplay checks;
- current status and evidence date.

Do not mark an item “complete” based on a UI component or source-regex test alone.
