# AI Auto-Rig Builder — Technical Plan

## Status
- Phase 0 source-code compatibility/licensing review is documented. Final hardware/model-weight validation on the target Windows PC remains pending; no model weights are bundled or auto-downloaded.
- Phase 1 deterministic Auto-Rig core is implemented on this feature branch and its focused tests, ESLint, and production build have passed in GitHub Actions.
- Phase 2 permanent Studio workflow is integrated: guided manual/AI mask authoring, semantic role assignment, editable cutouts, source-space pivots/bones, starter clips, muzzle attachment workflow, quality reporting, asset-library discovery, and server-side publish gating.
- Phase 3 local SAM 2 worker is implemented with automatic mask proposals and positive/negative point-prompt segmentation. Its focused Python/Node CI is active; the actual model is optional and must be installed locally by the developer.
- Phase 4 semantic plant/monster classification and hidden-pixel reconstruction remain incomplete. SAM 2 masks are geometric proposals only; role assignment and author review remain explicit.
- Phase 5 quality/publish gates and Rig Library discovery are implemented; reusable rig-template retargeting and live Phaser/browser acceptance remain outstanding.
- This work is additive to the existing Hybrid Animation Engine branch and targets the existing Phaser 3 runtime. No third-party editor is embedded and no paid/cloud inference API is required.

## Product goal
Turn one uploaded plant or monster illustration into a reviewable, editable, game-ready rig with the least possible manual preparation. The creator should upload the original image, choose or describe intended actions, review automatically extracted parts, and approve the generated rig. The system must preserve the original art and must never silently publish a low-quality result.

## Non-negotiable architecture constraints
1. Extend the current RigEditor.jsx, rig profile schema, skeletalAnimation.mjs, and Phaser skeletal adapter. Do not introduce a competing runtime or replace Sprite Sheet support.
2. Keep the current version-1 rig profile readable by existing game assets. Builder-specific metadata belongs in a separately versioned build manifest until a deliberate runtime schema migration is justified.
3. All inference runs locally/offline after model installation. No image is uploaded to a hosted inference provider. No paid API key is required.
4. Model dependencies are optional and capability-detected. The Studio must remain usable when Python, a GPU, or an AI model is unavailable.
5. Preserve source image, source dimensions, alpha, stable asset IDs, existing muzzle/projectile origin behavior, hitboxes, and Sprite Sheet fallback.
6. Every automatic result is editable and reversible. Never overwrite the source image or an existing published asset during generation.
7. No model weights or third-party art are bundled until their licenses, notices, model-card terms, and redistribution conditions are reviewed.

## Research findings and intended use

### Rigby2D
- Source: https://github.com/jaisurya-dev-art/rigby2d
- Source license: MIT OR Apache-2.0 (choose one and retain notices).
- Relevant ideas: layered PSD/PNG import, semantic layer-role detection, editable bone hierarchy, weighted meshes, IK, retargeting, command-line automation, MCP workflow, Phaser runtime.
- Important limitation: its AutoRig starts from already separated layers; it does not cut a flattened image into parts.
- Decision: use as a primary architecture/UX/runtime reference and evaluate its Phaser runtime and interchange formats in an isolated compatibility spike. Do not embed its full editor or replace the project's existing Phaser skeletal profile without measured benefit. Do not use its demo characters/art as game assets; demo content has separate restrictions.

### Stretchy Studio
- Source: https://github.com/MangoLion/stretchystudio
- Source license: MIT.
- Relevant ideas: mesh deformation, vertex skinning, timeline UX, layer grouping, and a two-stage decomposition-to-rig workflow.
- Important limitation: its documented workflow targets See-Through-style anime layers and DWPose human pose detection. Human pose landmarks are not a reliable skeleton detector for stylized plants, weapons, leaves, or monsters.
- Decision: study the mesh deformation and editing concepts; do not depend on DWPose or its anime-specific workflow as the default plant-rigging path.

### Segment Anything
- Source: https://github.com/facebookresearch/segment-anything
- SAM/SAM 2 are promptable segmentation systems; they produce masks from points/boxes/prompts, not semantic plant-part labels.
- Decision: evaluate SAM 2 as a local assisted-mask backend. Use positive/negative clicks or boxes to propose individual part masks, then refine masks and edges. A separate role-classification/approval stage is required. A mask alone cannot reconstruct pixels hidden behind an occluding part.

### See-through
- Source: https://github.com/shitagaki-lab/see-through
- It decomposes a single anime illustration into semantically distinct, inpainted layers with inferred ordering. This is closer to the desired one-image workflow than SAM alone.
- Limitations: its body-part parser is trained for anime/human body categories, not plant anatomy; its full pipeline is substantially heavier than the current web app. The published guidance reports roughly 12–16 GB VRAM at 1280 resolution for the default pipeline.
- Licensing: the source code is Apache-2.0, but LayerDiff 3D and depth checkpoints inherit additional OpenRAIL terms from upstream model weights; the body-part parsing model has separate Apache-2.0 terms. Commercial use is described as permitted, but the OpenRAIL use restrictions must be carried into applicable terms when redistributing weights or hosting a service.
- Decision: keep as an optional research adapter only. Do not bundle its weights, make it a required install, or make it the default pipeline until art-style tests, hardware tests, and license compliance are complete.

## Permanent Studio subsystem — required product modules

The Auto-Rig workflow is a first-class, permanent subsystem of the Asset & Animation Studio, not a temporary external utility. It must be reachable from the normal Studio asset workflow and persist its outputs through the existing asset/version/dependency/publish lifecycle.

The subsystem is composed of these named modules. Each module has a defined responsibility, input/output contract, editable result, and validation state:

1. **AI Part Detector**
   - Proposes semantic plant/monster part instances from the original image and segmentation results.
   - Uses the versioned role vocabulary, but never assumes every character has every role.
   - Assigns stable instance IDs independently of role names; repeated leaves, petals, limbs, eyes, weapon components, and accessories remain distinct instances.
   - Exposes confidence and lets the user rename, split, merge, add, or remove proposals.

2. **Smart Image Segmentation**
   - Produces editable masks and transparent layer images in original source coordinates.
   - Supports AI prompts (points/boxes), edge refinement, and manual mask editing.
   - Preserves source art, alpha, z-order, and provenance; no destructive overwrite.
   - A mask is not treated as semantic understanding or as reconstruction of hidden pixels.

3. **Hidden Part Reconstruction**
   - Detects occluded regions and proposes completion only where an underlying part is genuinely required for its intended motion.
   - Separates original pixels from generated pixels in metadata and review UI.
   - Offers before/after review, confidence, accept/reject, and rollback.
   - If reconstruction is uncertain or unavailable, marks the part unresolved and requests manual completion rather than silently inventing pixels.

4. **Auto Bone Generator**
   - Builds a deterministic parent/child hierarchy from approved part roles, contact geometry, and user corrections.
   - Emits bones directly in the existing skeletal rig-profile format consumed by the current Phaser runtime.
   - Keeps bone hierarchy independent from render z-order.

5. **Auto Pivot Detection**
   - Suggests pivots from overlap/contact boundaries and part geometry, not just image centers.
   - Stores source-space and crop-local coordinates consistently.
   - Shows confidence and allows direct visual drag correction before rig generation is accepted.

6. **Animation Generator**
   - Creates editable starter clips such as idle, attack, hit, death, and movement when applicable.
   - Uses the existing skeletal evaluator, clip schema, playback controls, and game state machine.
   - Generates suggestions only; user-approved clips are saved in the same rig profile used in gameplay.
   - Does not own damage, cooldown, projectile timing, or other combat authority.

7. **Weapon Attachment Builder**
   - Detects/proposes weapon, barrel, grip/hand attachment, muzzle, projectile direction, and optional recoil anchor.
   - Requires visual confirmation of muzzle position and direction for projectile-firing plants.
   - Writes attachments in the existing runtime attachment format so BattleScene projectile origin remains authoritative and consistent.
   - Never guesses or silently changes a live projectile origin.

8. **Rig Quality Validator**
   - Performs structural, geometric, visual, and runtime-readiness checks.
   - Checks unique/stable IDs, valid parent graph/no cycles, valid masks and image assets, bounds/pivots, unresolved occlusion, generated-pixel provenance, clip references, attachment validity, muzzle requirements, and hitbox proposals.
   - Runs the same rig-profile validator and skeletal evaluator used by the game; Studio-only validation must not diverge from runtime behavior.
   - Reports blocking errors separately from warnings and gives actionable links to the relevant editor control.

9. **Rig Library**
   - Stores approved reusable rig templates, role maps, pivot presets, motion templates, and weapon/attachment presets.
   - Supports versioning, search, duplication, and controlled updates without changing already-published assets.
   - Uses semantic roles and explicit per-instance IDs so templates can be retargeted to new plants without re-defining every part.
   - Saves through the existing Studio asset API/version/dependency system; it is not a separate untracked file store.

### Shared integration contract
- All nine modules operate on one canonical, versioned Auto-Rig build manifest and produce one existing game-compatible skeletal rig profile plus referenced image assets.
- The manifest records source hash/dimensions, role dictionary version, part instance IDs, masks/layer paths, source-space bounds, pivots, parent links, z-order, confidence, occlusion/reconstruction provenance, attachment proposals, and generator/model versions.
- The build manifest is authoring metadata; it does not create a second animation runtime. The canonical output remains the current rig-profile format.
- Every output is manually editable, reversible, and reviewable. Original source images and published versions are immutable during generation.
- The preview must use the exact skeletal evaluator/runtime behavior used in Phaser gameplay.
- The pipeline remains local-first with optional model adapters. If AI models are unavailable, the same modules remain accessible with guided/manual proposals; there must be no hard dependency on a paid cloud API.
- Existing Sprite Sheet assets, manual Rig Editor workflows, asset IDs, dependencies, snapshots, muzzle attachments, hitboxes, and publishing remain backward compatible.

## Proposed pipeline

### Stage A — image intake and source preservation
- Accept PNG/WebP and preserve the original bytes.
- Record source width, height, alpha channel, color profile when available, and a content hash.
- Generate a non-destructive working copy and preview.
- Reject unsupported dimensions, malformed files, decompression bombs, and over-limit uploads with actionable errors.

### Stage B — part proposals
Use a pluggable local inference interface:
- sam2-prompted: point/box-assisted mask extraction.
- single-image-decomposition: optional See-through-compatible adapter only after model/license/hardware validation.
- manual-mask: deterministic fallback where the user/assistant marks regions in the Studio.
Each proposal contains a mask, confidence/quality metrics, source-space bounds, and provenance. Do not fabricate semantic certainty.

### Stage C — semantic role assignment
Map each proposed layer to a stable role vocabulary. Initial roles:
- root, body, head, face, eye.left, eye.right, mouth, jaw.upper, jaw.lower
- leaf.left, leaf.right, leaf, stem, arm.left, arm.right, hand.left, hand.right
- weapon, weapon.barrel, weapon.muzzle, back, tail, armor, accessory, shadow, effect
Role is not the same as instance ID. A character may have multiple leaf parts; each instance gets a unique stable ID and may have a side/index. Missing roles are allowed. Unknown roles remain custom and are never discarded.
- Use deterministic role aliases and editable user confirmation.
- Keep a versioned role dictionary. Never renumber a role because a new plant introduces another part.

### Stage D — layer extraction and occlusion repair
- Crop each mask into a same-source-coordinate transparent PNG with padding.
- Retain original pixel coordinates and z-order.
- Detect overlaps and holes. When an underlying part is occluded, mark its hidden region as unresolved unless a reconstruction backend supplies a candidate.
- Any inpainted pixels must be tagged as generated, previewable, and user-approvable. Preserve an untouched original layer for rollback.
- Avoid destructive alpha cleanup; use bounded edge decontamination and show a before/after comparison.

### Stage E — automatic rig construction
- Build a deterministic parent graph from approved roles and geometric relationships.
- Use stable semantic bone IDs (e.g. body, head, weapon, leaf-left-01) rather than positional numbering alone.
- Compute source-space bounds, centroids, attachment anchors, and candidate pivots from masks.
- Infer pivots at actual overlap/contact boundaries where possible; expose confidence and allow a user drag correction.
- Preserve layer draw order independently from bone hierarchy.
- Create a weapon muzzle attachment from a confirmed muzzle point/weapon geometry; never guess a projectile origin silently.
- Generate attack/hurt hitbox proposals only as editable suggestions, not authoritative combat values.
- Emit the existing rig-profile version 1 shape for the current runtime, plus a builder manifest containing segmentation provenance, part role, confidence, bounds, mask path, generated-pixel metadata, and tool/model versions.

### Stage F — motion templates
Generate conservative starter clips, not final authored animation:
- idle: subtle breathing/sway.
- attack: anticipatory motion, recoil, recovery.
- hit: brief reaction.
- death: optional, non-looping.
- move: only when the character actually moves in gameplay.
Templates target semantic roles and skip absent bones. Weapon attack timing must remain coordinated with the existing combat state machine. The game remains authoritative for damage, cooldowns, and projectile timing.

### Stage G — review, validation, and export
- Show original image, extracted layers, role labels, bone tree, pivots, draw order, and preview together.
- Provide per-layer visibility, mask edit, role reassignment, pivot drag, z-order, and undo/redo.
- Validate missing image assets, broken parent graphs, cycles, duplicate IDs, missing muzzle anchors for projectile plants, invalid frame references, and unreasonable bounds.
- Run preview clips through the same skeletal evaluator used by the Phaser runtime.
- Save as a draft first. Testing/publishing remains an explicit existing Studio workflow.
- Store generated assets and manifests through the existing Studio asset API/version/dependency lifecycle.

## Local inference deployment
- Use a separate optional Python worker rather than loading PyTorch/model weights into the Next.js server or browser bundle.
- Expose a narrow localhost-only API with health/capabilities, analyze, segment, cancel, and result retrieval operations.
- Bind only to loopback; validate file paths and payload sizes; do not accept arbitrary filesystem paths from browser input.
- Pin Python and package versions in a dedicated optional environment. Keep the Node app independent of Python dependencies.
- Model weights are downloaded by an explicit setup command, stored outside the web bundle, checksummed, and accompanied by license/NOTICE metadata.
- First target a CPU-capable assisted segmentation baseline; GPU acceleration is optional. Do not promise fast local inference until tested on the user's actual hardware.
- If the worker is not installed or is too slow, the Studio falls back to guided/manual masks and the existing manual Rig Editor.

## Implementation phases and acceptance gates

### Phase 0 — compatibility and licensing audit
- Completed the source-code compatibility review and documented upstream licenses and model constraints.
- No external model weights are bundled or downloaded automatically.
- Still required: verify CPU/GPU capability, RAM/VRAM, install size, inference time, and output quality on the actual Windows development machine before recommending a SAM 2 checkpoint as the default.

### Phase 1 — deterministic Auto-Rig core
- Implemented `web/game/studio/autoRigBuilder.mjs`: versioned manifest validation, stable part-instance IDs, role aliases, deterministic parent graph, source/crop coordinate handling, pivots, local bone transforms, muzzle attachment generation, starter animation clips, and occlusion/unknown-role warnings.
- Added geometry, manifest, readiness, confidence, explicit author-review, reconstruction-provenance, and muzzle regression coverage in `web/tests/studio-auto-rig-builder.test.mjs`.
- Focused Auto-Rig tests, ESLint, and production build have passed in GitHub Actions on prior feature-branch commits. Continue to require green checks on the latest head before merge.
- Remaining: validate output visually against representative plant and monster assets in the user's Windows browser/game environment.

### Phase 2 — permanent Studio subsystem and review workflow
- Integrated the guided Auto-Rig workspace into the existing Studio asset flow, preserving the manual Rig Editor and Sprite Sheet workflow.
- Supports source preservation/hash, manual polygon authoring, SAM 2 proposal review, semantic role assignment, editable mask vertices, occlusion-region masks, per-part author review, cutout PNG asset creation, deterministic bones/pivots, starter clips, and muzzle attachment placement.
- Saves part assets through the existing Studio asset API and stores the build manifest alongside the existing rig profile/version lifecycle; no parallel asset registry or animation runtime is introduced.
- Added Rig Library discovery to the existing asset library (rigged/unrigged filters, part-role/bone/attachment search, and rig metadata).
- Remaining: live browser validation, robust partial-upload cleanup/rollback, and real-asset workflow acceptance.

### Phase 3 — local segmentation worker
- Implemented the optional loopback Python worker and SAM 2 adapters for automatic mask proposals and positive/negative point-prompt segmentation.
- Worker binds to `127.0.0.1`, requires locally installed weights, performs no hosted inference or automatic model downloads, validates source dimensions and payload sizes, rejects browser-origin/remote-host requests, and admits one inference at a time.
- The worker preserves transparent PNG artwork by compositing alpha onto a neutral white inference background; original source bytes remain unchanged.
- Added a Windows PowerShell launcher, setup guide, and Python unit tests. CI compiles the worker and exercises the protocol/geometry/image decoding behavior.
- Remaining: install SAM 2 and a compatible checkpoint on the target PC, measure CPU/CUDA performance, and test with actual game artwork. The model is not bundled.

### Phase 4 — semantic decomposition and reconstruction
- Not complete. Current SAM 2 output consists of geometric masks, not semantic body/limb/weapon classification.
- Add a separately evaluated local semantic detector/role classifier for stylized plants and monsters; every role remains editable and requires author approval.
- Add hidden-part detection and inpainting only after evaluating commercial-use licenses, hardware requirements, output provenance, and before/after rollback. Until then, occluded regions remain explicitly unresolved and block animation readiness.

### Phase 5 — motion authoring, Rig Library, and production validation
- Implemented starter animation clips through the existing rig profile, weapon/muzzle attachment authoring, Rig Quality Validator, explicit per-part review/occlusion gates, and server-side publish-time quality enforcement.
- Implemented Rig Library discovery through the existing asset library; reusable role-based template retargeting and template version management are still outstanding.
- Still required: validate muzzle/projectile origin, hitboxes, animation state transitions, asset publication, and Sprite Sheet fallback in live Chrome/Phaser gameplay.
- No merge to main until the dependent Hybrid Animation Engine base is merged/ready and the full build, tests, and live browser/game acceptance gates pass.

## Initial acceptance criteria
0. All nine named modules are permanent Studio capabilities, not an external or disposable utility.
1. A single source image can be opened without changing or overwriting it.
2. Every proposed part has a unique instance ID, a stable semantic role, source-space bounds, and an editable mask.
3. Multiple parts with the same role are supported.
4. The generated rig passes the existing validateSkeletalRigProfile validator.
5. A projectile plant cannot be marked rig-ready without a confirmed muzzle attachment.
6. Missing or uncertain hidden pixels are surfaced rather than silently invented.
7. Generated clips can be previewed with the existing skeletal evaluator.
8. Assets remain drafts until the existing explicit test/publish action is used.
9. Existing Sprite Sheet-only plants and monsters continue to work unchanged.
10. With no local AI worker installed, the Studio remains functional through its deterministic/manual fallback.
11. All module outputs share one versioned manifest and save to the existing game-compatible rig profile and asset lifecycle; no second runtime or parallel animation format is introduced.
12. Animation previews use the same skeletal evaluator as gameplay, and weapon muzzle attachments resolve through the existing Phaser runtime.
13. Rig Library templates can be reused by semantic role while preserving unique per-character part instance IDs and published-version immutability.

## Current decision
The Auto-Rig Builder is a permanent first-class Studio subsystem composed of the nine modules above. The deterministic Auto-Rig core is its first implementation layer; AI segmentation and reconstruction are pluggable local capabilities that progressively power the same integrated workflow. This avoids making the Studio depend on a large, hardware-sensitive model before validating the workflow on real FarmVsMonsters art. No separate animation runtime is permitted.


## 2026-11-22 — Local inference worker contract foundation
- Added `web/game/studio/autoRigWorkerProtocol.mjs` as the versioned boundary between Studio and an optional loopback inference worker.
- The contract capability-detects part detection, prompted segmentation, and hidden-part reconstruction without claiming a model is installed or available.
- Worker outputs are rejected unless proposal IDs, semantic roles, confidence, source-coordinate bounds, editable polygon masks, provenance, protocol version, and the 63-part limit are valid. Partial output is discarded when any proposal is invalid.
- Added focused protocol regression tests and included them in the Auto-Rig CI workflow and focused ESLint command.
- This is an integration contract, not an AI model implementation. The actual local worker, model installation/setup, SAM 2 adapter, semantic plant/monster detector, and reconstruction backend remain explicit implementation gates; no hosted inference API or model weights were added.


## 2026-11-22 — Authenticated local worker bridge
- Added `POST /api/studio/auto-rig/worker` for Studio-session-authenticated task dispatch and `GET` for capability/health discovery.
- The bridge accepts bounded PNG/JPEG/WebP data URLs, source dimensions, and one of the three declared task types; applies a 45-second inference timeout; and validates all returned proposal geometry against the original source canvas before exposing it to Studio.
- The upstream endpoint is restricted to HTTP loopback addresses only. Remote worker URLs are rejected to avoid turning this authenticated route into an SSRF proxy or silently uploading artwork to a hosted inference provider.
- Added focused route-contract tests and included the route and tests in Auto-Rig CI and ESLint.
- Runtime configuration: optional `STUDIO_LOCAL_AI_WORKER_URL=http://127.0.0.1:8765`. Without a worker process, the health route intentionally reports offline/not configured; the bridge does not fabricate AI results.
- Remaining: implement and package the actual local worker process and its model adapters; wire worker status and approved proposals into the Auto-Rig UI; add real plant/monster image fixtures and end-to-end validation.


## 2026-11-22 — First local SAM 2 worker adapter
- Added `web/local-ai-worker/worker.py`, a Python HTTP service bound exclusively to `127.0.0.1`. It exposes capability discovery and a SAM 2 automatic-mask generation endpoint matching the version-1 Studio worker protocol.
- The worker requires locally installed PyTorch, the official SAM 2 package, a config, and a checkpoint path. It does not download model weights, call cloud inference, or expose a LAN listener.
- Automatic masks are converted to simplified source-coordinate polygons and returned as reviewable proposals with bounds, confidence, and SAM 2/source-pixel provenance.
- The Studio UI now requests the implemented `part-detection` capability instead of claiming text-prompted segmentation. Health status distinguishes ready from degraded worker state.
- Added worker setup documentation and Python contract tests; CI now has a separate Python job to install image dependencies, compile the worker, and run its tests.
- This is the first actual model adapter, not the completed AI feature set. Semantic plant/monster role classification, true prompt-conditioned segmentation, overlap/occlusion resolution, hidden-part reconstruction, and local Windows hardware validation remain outstanding. The worker cannot report ready until the user-side machine has SAM 2 and a checkpoint installed.


## 2026-11-22 — SAM 2 proposal quality filtering
- Added mask candidate filtering before polygon conversion: reject tiny regions and near-full-canvas background masks, rank by predicted-IoU × stability, suppress near-identical masks at IoU ≥ 0.92, and cap output at 63 proposals.
- Added Python regression coverage for background/tiny-mask rejection and duplicate suppression.
- This reduces obvious SAM 2 noise but does not solve semantic segmentation, overlapping-part interpretation, or occlusion reasoning; every proposal still requires visual review and role assignment.


## 2026-11-22 — Windows worker launcher and review overlay
- Added a PowerShell launcher that verifies local SAM 2 config/checkpoint paths and imports PyTorch, SAM 2, and OpenCV before starting the loopback service.
- Added a blue dashed overlay for unapproved AI proposals and a green overlay for accepted parts; stale proposals are cleared when the source image changes.
- The API bridge initially exposed only automatic mask proposals; it was subsequently extended to the implemented positive/negative point-prompted SAM 2 endpoint. Hidden-part reconstruction remains unavailable and is not advertised.


## 2026-11-22 — Broader validation findings
- Auto-Rig subsystem validation passed on the recent branch head available to CI: Python worker compile/tests, Auto-Rig/Studio contract tests, focused ESLint, full-project ESLint diagnostic step, and production build.
- The separate Studio and Game Validation workflow failed in the existing broad game test suite: 363 passed and 54 failed out of 417. The failures are concentrated in Phase 1 combat/replay/wave scheduler, monster stats, planting/resource, and static Phaser integration assertions (for example `wood-frame-inventory.test.mjs`).
- These failures are not Auto-Rig worker tests and were not changed as part of this Studio-only pass. They remain a repository-level blocker to claiming a fully green project or merging the dependent feature.


## 2026-11-22 — Rig quality validator integration
- Added `analyzeAutoRigQuality` to report manifest validity, editable-mask coverage, semantic-role confirmation, confidence review, occlusion resolution, source fingerprint presence, primary body/stem assignment, and reconstructed-pixel counts.
- The validator returns a transparent 0–100 heuristic score, actionable warnings, and a separate `readyForAnimation` gate. It does not silently repair data or treat a high score as proof of visual correctness.
- Integrated the report into the Auto-Rig Studio workflow so the user sees quality findings after generation.
- Added tests for a fully reviewed rig, an unclassified role, and invalid manifests.


## 2026-11-22 — Direct mask editing and stricter animation gate
- Studio now lets the author select an accepted part and drag individual polygon vertices directly on the source preview. AI proposals remain visually distinct and cannot be edited as accepted data until the author explicitly assigns a semantic role and approves them.
- Tightened `readyForAnimation`: a valid manifest alone is insufficient. All parts must have known semantic roles, editable masks, reviewed confidence, no low-confidence values, resolved occlusion, a SHA-256 source fingerprint, a primary body/stem, and no reconstructed pixels awaiting review.
- Added regression coverage for missing source fingerprints and reconstructed-pixel provenance. The validator still reports heuristic quality separately from manifest validity.


## 2026-11-22 — Explicit per-part review and occlusion assessment
- Added a persisted `reviewed` flag to each manifest part; author review is now separate from model confidence. A high SAM 2 confidence score no longer silently counts as human approval.
- New manual and AI-derived parts start unreviewed and with occlusion unresolved. Studio exposes an explicit review checkbox and an occlusion assessment selector for every part.
- The animation readiness gate now requires all parts to be explicitly reviewed, all occlusion states resolved, and all prior source/mask/role/confidence requirements. This prevents an unexamined part from being treated as production-ready.
- Updated quality-validator tests to distinguish missing model confidence from missing human review.


## 2026-11-22 — Worker proxy hardening
- The authenticated Studio bridge now checks declared and actual UTF-8 request-body size (12 MB) before JSON parsing, in addition to the existing 8 MB image payload and canvas-dimension limits.
- Added a route-contract regression assertion for the body-size guard.


## 2026-11-22 — Per-part quality gate and request validation follow-up
- Clarified that model confidence is not equivalent to author approval. The manifest persists `reviewed` per part, while the Studio author separately resolves the occlusion state.
- Any part flagged as reconstructed—whether by pixel provenance or occlusion status—blocks animation readiness until a future reconstruction-review workflow can verify it.
- Extended quality tests to cover reconstructed occlusion independently from reconstructed pixel provenance.
- Hardened the API route against oversized JSON bodies before parsing; Python worker body and image limits remain independently enforced.


## 2026-11-22 — Studio Rig Library entry point
- Extended the existing persistent asset library with a dedicated rig filter: all assets, assets with a linked skeletal rig, and assets without a rig.
- Rigged asset rows now show bone count, attachment count, and the stored Auto-Rig manifest version when available. Selecting an item for editing reuses the existing Studio edit flow, preserving the current registry/version lifecycle instead of creating a parallel rig database.
- Added the Studio library page to the existing production build validation path; focused lint remains scoped to the Auto-Rig component and its API/core modules to avoid expanding the lint gate into unrelated legacy page diagnostics.


## 2026-11-22 — Publish-time Rig Quality gate
- Publishing an asset with an Auto-Rig build manifest now runs `analyzeAutoRigQuality` again on the server. A manifest cannot be published unless its quality report is valid and `readyForAnimation` is true.
- Publish rejection returns the structured quality report and actionable warning messages (unreviewed parts, unresolved occlusion, missing source fingerprint, unknown roles, low confidence, or reconstructed pixels).
- Legacy skeletal assets without an Auto-Rig manifest retain their existing publish path; only assets carrying this versioned Auto-Rig authoring record are subject to the new gate.
- Added a route-contract regression test and included it in the Auto-Rig CI test command.


## 2026-11-22 — Latest CI verification (commit d81e77d)
- Auto-Rig subsystem validation run `45031329290` completed successfully: local worker compile/tests, all Auto-Rig/quality/Studio contract tests (including the publish gate), focused ESLint, full-project ESLint diagnostic step, and Next.js production build all passed.
- The separate Web Quality Gate run `45031329327` and Studio/Game Validation run `45031329353` failed in the broad Phase 1/game suite: 370 passed and 54 failed out of 424. Failures span combat/replay, monster balance/wave scheduling, planting/resources, account/catalog flows, and several pre-existing Studio source-contract assertions. These failures prevent a repository-wide green status; they are not failures in the focused Auto-Rig CI job.


## 2026-11-22 — Rig Library semantic search
- Extended the existing Studio library search to index Auto-Rig part IDs, semantic roles, part names, bone names, and attachment names in addition to asset metadata. This keeps Rig Library discovery inside the existing asset registry and search controls.


## 2026-11-22 — Rig Library regression coverage
- Added a focused source-contract test for the rigged/unrigged library filters and semantic search across part roles, bone names, and attachment names.
- Included the new test in the Auto-Rig subsystem workflow so changes to the Studio Rig Library are covered by the same build and validation pipeline.


## 2026-11-22 — Hidden-region mask authoring foundation
- Added validated `occlusionMask` polygons to the versioned Auto-Rig manifest, stored in original source-image coordinates and constrained to the source canvas.
- Studio can now enter a per-part hidden-region marking mode, draw and save the polygon region where the occluded part is expected to continue, and display saved regions as dashed amber overlays.
- The quality report distinguishes unresolved occlusion with a supplied region mask from unresolved occlusion with no reconstruction target. The mask is preparation data only: no pixels are fabricated, and the rig remains blocked until a real reconstruction model and review flow exist.
- Added regression tests for manifest persistence and out-of-canvas occlusion masks.


## 2026-11-22 — Review invalidation on edits
- Accepted part roles can now be corrected in the part list. Changing a role, dragging a polygon vertex, or changing the occlusion assessment invalidates the explicit author-review flag so stale approval cannot survive a substantive edit.
- Re-drawing an occlusion region also clears the review flag and leaves the part unresolved.


## 2026-11-22 — Latest focused validation (commit 1463e9f)
- Auto-Rig subsystem run `45032089391` passed on the current feature commit: all Auto-Rig, worker-protocol, publish-gate, Rig Library, asset-version, and hybrid-engine contract tests; focused ESLint; full-project ESLint diagnostic step; production build; Python worker compile and tests.
- The separate broad Web Quality Gate / Studio-Game test suite remains independent and has previously failed 54 of 424 tests; no claim of repository-wide green status is made.


## 2026-11-22 — Interactive SAM 2 point prompting
- Extended the local SAM 2 worker to load both `SAM2AutomaticMaskGenerator` and `SAM2ImagePredictor` from the same local checkpoint.
- Added a prompted-segmentation endpoint supporting 1–32 positive/negative source-space point prompts and up to three mask alternatives per request.
- Extended the authenticated Studio proxy to validate prompt count, coordinates, and binary labels before forwarding. The worker independently validates prompts and source image dimensions.
- Studio now supports positive points (inside the target) and negative points (outside it), renders them on the source preview, and requests point-conditioned SAM 2 masks. Alternatives remain unapproved until the author selects one, assigns its semantic role, edits if necessary, and explicitly reviews it.
- Added worker unit tests for valid and invalid point prompts. This is interactive SAM 2 segmentation, not semantic role classification or hidden-pixel generation.


## 2026-11-22 — Prompted segmentation validation hardening
- Prompt coordinates must be actual finite numeric source-space values; string/null coercion is rejected at both the authenticated API proxy and local worker.
- Prompt labels must be integer 0/1 values, and every segmentation request must include at least one positive (inside-target) point. Negative points remain optional and refine exclusions.
- Added worker and route-contract tests for strict coordinate/label validation and positive-point requirements.


## 2026-11-22 — Latest point-prompt validation run
- Auto-Rig subsystem run `45032986956` passed on commit `e11bbe2`: all Auto-Rig/worker protocol/quality/publish/Rig Library tests, Python worker tests (including fake-predictor point segmentation), focused ESLint, full-project ESLint diagnostic step, and Next.js production build.
- The point-prompt pipeline now enforces numeric finite coordinates, integer binary labels, a positive target point, and optional negative exclusion points at both API and worker boundaries.


## 2026-11-22 — Local inference worker security hardening
- The SAM 2 worker now accepts POST requests only when the Host header matches its exact 127.0.0.1 bind/port, the media type is JSON, and no browser Origin header is present. This blocks cross-site browser form submissions from triggering local model inference.
- A bounded single-request admission slot prevents concurrent uploads from accumulating while CPU/GPU inference is serialized; busy clients receive HTTP 429 and can retry.
- Added worker unit coverage for accepted loopback requests and rejected browser-origin, remote-host, and non-JSON requests. The local-worker CI job compiles and runs these tests.


## 2026-11-22 — SAM 2 alpha handling and Windows WSL setup
- The local worker now decodes source images with their original channel layout and composites transparent PNG pixels onto white for inference instead of silently discarding alpha and turning transparent pixels black.
- Added a regression test covering opaque, semi-transparent, and fully transparent PNG pixels.
- Added WSL 2 setup and launch scripts. The setup creates an isolated Python environment, installs CPU PyTorch by default, clones the official SAM 2 source, skips its optional CUDA extension, and installs worker dependencies. Checkpoints remain a separate manual download and are never committed.
- Updated the worker README to follow Meta's current installation guidance: Python 3.10+, PyTorch 2.5.1+, matching torchvision, and WSL/Ubuntu recommended on Windows. Native PowerShell startup remains a best-effort alternative.
- CI now validates WSL shell syntax in addition to Python compilation and worker tests. The alpha-handling worker test passed in run `45034701613`; WSL launcher syntax and the worker contract tests passed in run `45034810415`.
- The Studio button now describes automatic SAM 2 output as visible-region proposals rather than implying semantic role recognition. The author must assign each region's semantic role.


## 2026-11-22 — Transparent-canvas mask clipping
- Extended alpha-aware decoding to return a source-visible pixel mask. Automatic and point-prompted SAM 2 masks are clipped to non-transparent pixels before polygon conversion, preventing the transparent canvas from being accepted as part of a character.
- Added regression coverage for transparent/semitransparent pixel decoding and automatic mask clipping. The prompted-segmentation fixture now uses the alpha-aware decoder contract.


## 2026-11-22 — Alpha-aware proposal clipping regression verification
- Updated the prompted-segmentation test fixture to use the new alpha-aware decoder contract and added an automatic-mask regression proving that transparent canvas pixels are excluded from the proposal bounds.
- The local-worker job passed all Python tests, Python compilation, and WSL launcher syntax checks in run `45035114044`. The paired Node/ESLint/production-build job is still running at the time of this note.


## 2026-11-22 — Fail-closed occlusion defaults
- Missing or unrecognized per-part occlusion metadata now normalizes to `unresolved`; only an explicit `none` assessment clears the occlusion gate. This prevents older or malformed manifests from silently asserting that no hidden pixels exist.
- Added a regression proving that a manifest with a missing occlusion assessment cannot pass animation readiness.


## 2026-11-22 — Rig Library duplication and manifest identity
- Replaced the native browser prompts used by Studio asset cloning with an accessible in-app dialog (dialog semantics, modal state, initial focus, Escape cancellation, inline validation).
- Cloning a rigged asset now deep-copies the skeletal profile and Auto-Rig authoring manifest, preserves the immutable source image and shared part dependencies, resets the clone to a new draft/version history, and rebinds the manifest's source asset ID to the new asset ID while retaining the original source hash.
- Added the existing clone-dialog regression test to the focused Auto-Rig workflow and extended asset-version tests to verify independent manifest identity and copy behavior.
- This provides safe draft duplication of a rigged asset; semantic template retargeting to a different character remains a later Rig Library capability.


## 2026-11-22 — Rig Library search refinement and clone workflow verification
- Rig Library semantic search now indexes both display names and stable IDs for bones and attachments, as well as part IDs, roles, and names.
- Focused Auto-Rig run `45035533023` passed both Python worker tests and the Node Auto-Rig/Studio contract suite, including the accessible clone dialog, versioned rig-profile/manifest clone behavior, focused ESLint, full-project ESLint diagnostic step, and Next.js production build.


## 2026-11-22 — Clone dialog regression and broad-suite delta
- Preserved the existing asynchronous `cloneAsset(asset)` action signature while replacing native prompts with the accessible Studio dialog. The asset-cloning source-contract test now passes.
- The latest broad Studio/Game test run recorded 374 passed and 53 failed out of 427 (run `45035732569`). The clone-dialog and clone-action failures were eliminated; remaining failures are concentrated in combat/replay/wave scheduling, monster stats and plant/resource contracts, plus older Studio/runtime source-contract expectations.
- The focused Auto-Rig subsystem suite, worker suite, ESLint, and production build are green on the preceding feature-branch head; the new signature-only adjustment is included in the current re-run.


## 2026-11-22 — Semantic role suggestion milestone
- Added `web/game/studio/semanticRoleClassifier.mjs`, a deterministic, geometry-only role suggestion layer for SAM 2 masks. It uses source-space bounds, relative center, size, aspect ratio, and the selected character type (plant/monster).
- Integrated an explicit Studio action to suggest semantic roles for current AI proposals and passed the active asset type into the panel.
- Suggestions remain deliberately conservative (confidence below 0.7), do not mark parts as reviewed, do not approve masks, and never bypass the author’s role selection/review gate. Ambiguous shapes fall back to accessory with a low confidence.
- Added focused tests for plant body/leaf suggestions, monster head/arm suggestions, and invalid geometry. Added the new test and module to Auto-Rig CI and ESLint.
- This is a heuristic assist, not a trained visual classifier. Pixel-aware plant/monster classification remains a later model-backed milestone. Local donor transfer and Telea texture inpainting are implemented as separate, explicitly reviewed reconstruction aids; generative anatomical completion remains outstanding.


## 2026-11-22 — Author-guided visible-donor reconstruction (first reconstruction path)
A first usable reconstruction workflow is now implemented as deterministic visible-pixel transfer:
1. The author marks the hidden target polygon in source coordinates.
2. The author marks a visible donor polygon (for example, the opposite leaf or arm).
3. The loopback worker clips the donor to visible source pixels, optionally mirrors it, resizes the donor crop to the target bounds, and returns a transparent PNG patch.
4. Studio composites the patch into the extracted part PNG, expands part bounds to include the target, and stores donor/target polygons, bounds, transform choice, and method in the versioned manifest.
5. Pixel review is a separate explicit approval from the overall part review. The quality gate allows reconstructed pixels only after both reviews and resolved occlusion.

**Capability boundary:** donor transfer is an author-guided symmetry/texture-copy operation, not generative inpainting. A second path, `local-texture-inpaint`, uses OpenCV Telea to fill a manually marked region from immediate neighboring pixels. It is useful only for small texture gaps and does not infer anatomy, shape, or semantic structure. Both methods produce transparent patches, preserve provenance, and require explicit pixel review plus normal part review. A future local generative inpainting model remains separate and must include model/checkpoint provenance and the same fail-closed review gate. The worker advertises `visible-donor-reconstruction` and `local-texture-inpaint`, never `hidden-part-reconstruction`.
