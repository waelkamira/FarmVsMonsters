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

### Phase 2 — Studio review workflow
- Add a dedicated Auto-Rig wizard beside the existing Rig Editor.
- Support source image upload, layer proposals, role correction, mask review, pivot adjustment, and generated-rig preview.
- Preserve the existing manual rig editor and Sprite Sheet workflow.

### Phase 3 — local segmentation worker
- Add the optional localhost worker and SAM 2 prompt-based segmentation adapter.
- Provide point/box prompts and mask refinement.
- Validate Windows setup, CPU fallback, and local-only data flow.

### Phase 4 — semantic decomposition and reconstruction
- Evaluate See-through and other permissively licensed candidates against our stylized plant/monster art.
- Add only models whose weights and all upstream terms are compatible with the project's distribution and intended commercial use.
- Train/fine-tune a FarmVsMonsters part-role model only if a properly licensed, representative dataset becomes available.

### Phase 5 — motion authoring and production validation
- Add reusable plant/monster motion templates and retargeting by semantic roles.
- Validate projectile muzzle position, hitboxes, animation state transitions, asset publication, and existing Sprite Sheet compatibility in live Chrome gameplay.
- No merge to main until the full build, tests, and live browser/game acceptance gates pass.

## Initial acceptance criteria
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

## Current decision
The first deliverable is the deterministic Auto-Rig core and its contract. The AI segmentation worker is a separate optional phase. This avoids making the existing Studio depend on a large, hardware-sensitive model before we have validated the workflow on real FarmVsMonsters art.
