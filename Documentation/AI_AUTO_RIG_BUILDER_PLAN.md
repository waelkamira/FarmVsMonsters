# AI Auto-Rig Builder — Technical Plan

## Status
- Phase 0 compatibility/licensing audit documented.
- Phase 1 deterministic Auto-Rig core started: pure profile builder and regression tests added on the feature branch; execution/build verification is still pending.
- This work is additive to the existing Hybrid Animation Engine branch.
- Target integration: Asset & Animation Studio in web/, existing Phaser 3 runtime.
- No third-party editor is embedded and no paid/cloud inference API is required by the design.

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
- Verify current branch and existing Hybrid Animation Engine contracts.
- Pin exact source commits and license/NOTICE files for any reused code.
- Test candidate segmentation/decomposition on representative FarmVsMonsters plant and monster artwork, not only anime samples.
- Measure install size, RAM/VRAM, CPU/GPU time, and output quality on the actual development PC before selecting a default model.
- No dependency is added to the web app during this phase.

### Phase 1 — deterministic Auto-Rig core
- Initial implementation added at web/game/studio/autoRigBuilder.mjs: manifest validation, stable part-instance IDs, role aliases, deterministic parent graph, source-space to crop-space pivots, local bone transforms, muzzle attachment generation, static idle profile, and occlusion/unknown-role warnings.
- Regression coverage added at web/tests/studio-auto-rig-builder.test.mjs.
- Remaining in this phase: execute the new tests and build in the user's Windows environment, review the generated rig visually against real plant art, then harden the contract before Studio UI integration.
- Add regression tests for missing/duplicate parts, multi-leaf instances, unknown roles, occlusion flags, muzzle requirements, stable IDs, and invalid geometry.
- This phase can be tested without AI models.

### Phase 2 — permanent Studio subsystem and review workflow
- Integrate the nine permanent modules (AI Part Detector, Smart Image Segmentation, Hidden Part Reconstruction, Auto Bone Generator, Auto Pivot Detection, Animation Generator, Weapon Attachment Builder, Rig Quality Validator, and Rig Library) into the normal Studio navigation and asset workflow.
- Add a unified Auto-Rig workspace/wizard beside the existing Rig Editor, not a detached external app.
- Support source image upload, proposals, role correction, mask review, reconstruction approval, pivot adjustment, bone tree editing, weapon/muzzle setup, animation generation, quality reports, and Rig Library save/retarget.
- Save all approved outputs through the existing Studio asset API, version snapshots, dependencies, and explicit test/publish lifecycle.
- Preserve the existing manual rig editor and Sprite Sheet workflow.

### Phase 3 — local segmentation worker
- Add the optional localhost worker and SAM 2 prompt-based segmentation adapter.
- Provide point/box prompts and mask refinement.
- Validate Windows setup, CPU fallback, and local-only data flow.

### Phase 4 — semantic decomposition and reconstruction
- Evaluate See-through and other permissively licensed candidates against our stylized plant/monster art.
- Add only models whose weights and all upstream terms are compatible with the project's distribution and intended commercial use.
- Train/fine-tune a FarmVsMonsters part-role model only if a properly licensed, representative dataset becomes available.

### Phase 5 — motion authoring, Rig Library, and production validation
- Add reusable plant/monster motion templates and retargeting by semantic roles; expose them through the permanent Rig Library.
- Complete Weapon Attachment Builder and Rig Quality Validator integration with the existing combat/runtime contracts.
- Validate projectile muzzle position, hitboxes, animation state transitions, asset publication, and existing Sprite Sheet compatibility in live Chrome gameplay.
- No merge to main until the full build, tests, and live browser/game acceptance gates pass.

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
- Restricted the API bridge to the only implemented worker task (`part-detection`) so future reconstruction and prompted-segmentation tasks cannot be mistaken for available capabilities.


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
