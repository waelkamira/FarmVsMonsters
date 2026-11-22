# FarmVsMonsters Hybrid Animation Engine

## Decision

Extend the existing Phaser 3 animation pipeline with an optional 2D cutout/skeletal animation mode. Keep Sprite Sheet animation as a first-class mode and allow a single character to mix both techniques. This is an additive capability: existing assets without a rig continue to use their current Sprite Sheet profiles unchanged.

The engine is implemented in the active browser project under \`web/\`. Godot remains paused and is not a target for this work.

## Goals

- Build expressive plant and monster motion from independently authored bitmap parts.
- Keep the editor approachable: upload/assign parts, place pivots, create parent-child bones, preview clips, and save a draft without writing code.
- Use one evaluated pose for rendered parts, weapon/projectile attachment points, and animation-bound hitboxes.
- Keep animation deterministic and presentation-only where appropriate; combat rules remain authoritative in the existing combat systems.
- Reuse rigs, clips, and presets across compatible characters without copying source image files.
- Preserve all existing Sprite Sheet assets and animation profile behavior.

## Architecture

### 1. Versioned rig profile

A rig profile is stored alongside an asset's existing animation profile:

- \`version\`: schema version (currently 1).
- \`canvas\`: source-space width and height used by the rig editor.
- \`bones\`: stable ID, optional parent ID, local transform, pivot, and optional bitmap part reference (asset ID plus frame index).
- \`attachments\`: named local transforms parented to bones (muzzle, hand, mouth, projectile origin, held item).
- \`hitboxes\`: named local rectangles parented to bones, classified as attack or hurt.
- \`clips\`: named duration/loop settings and per-bone keyframe tracks.

All references must resolve. IDs are stable and unique. Parent graphs must be acyclic with exactly one root. Coordinates are local source-space pixels. The editor must display the rig over the real character artwork and use the same coordinate conversion as the Phaser runtime.

### 2. Runtime evaluator

The pure evaluator validates profiles, samples keyframes, interpolates transforms (including shortest-path rotation), composes parent-child world transforms, and resolves attachments/hitboxes from the same pose. The Phaser adapter will translate those evaluated transforms to Phaser Containers/Sprites; no React component or persisted content record may execute arbitrary JavaScript.

### 3. Animation state machine

The runtime state machine will own named states such as idle, move, attack, hurt, frozen, death, and special. Transitions are explicit and prioritized. Non-looping action clips return to a configured fallback state. State changes must not allow the idle updater to overwrite an active attack clip.

### 4. Blending

Support bounded cross-fades between compatible clips by interpolating local transforms over a configurable transition duration. Do not blend incompatible rig versions or missing bone IDs. Default blend durations should remain short and deterministic.

### 5. Projectile and weapon anchors

Projectile spawn positions are derived from the evaluated attachment transform (for example \`muzzle\`) and then passed through the existing shared world-coordinate and trajectory helpers. The editor preview and live Phaser runtime must call the same conversion functions. A missing attachment is a validation blocker for a rigged projectile attacker; do not silently fall back to a screen-space constant.

### 6. Hitboxes

Attack/hurt rectangles are resolved from the same evaluated pose as the visible parts. Initial implementation may support oriented rectangles and conservative axis-aligned bounds for the current combat collision system. Hitbox geometry must not independently change damage, target selection, or combat timing.

### 7. Studio editor

The editor is a mode switch inside Asset & Animation Studio:

- Animation mode: Sprite Sheet (existing), Skeletal (new), or Hybrid.
- Rig canvas: actual character artwork, part layers, zoom/pan, bone hierarchy, pivot handles.
- Bone tools: create, rename, re-parent with cycle prevention, delete with child handling, and set local transform.
- Part assignment: immutable Studio asset ID and optional frame.
- Attachments: muzzle/hand/mouth/projectile origin with draggable local handles.
- Hitboxes: attack/hurt type, editable size/offset/rotation, visible overlays.
- Timeline: named clips, per-bone keyframes, play/pause/stop, scrub, FPS, loop, and blend preview.
- Presets: idle sway, breathing, recoil, walk cycle, bite, attack, hurt, and death; presets remain editable.
- Save as Draft first. Existing approval/release flow remains the only route to published runtime content.

### 8. Compatibility and fallback

- Assets without \`rigProfile\` continue to use their current \`animationProfile\` or static image behavior.
- A rig profile is opt-in and versioned.
- Unsupported profile versions, missing part assets, invalid parent graphs, or invalid clip references block testing/publishing and produce actionable messages.
- Existing Sprite Sheet frame-count inference, projectile trajectories, launch-origin fixes, and current plant/monster runtime contracts remain intact.

## Delivery phases and acceptance gates

### Phase A — Data contract and pure evaluator
- [x] Versioned profile validation.
- [x] Parent hierarchy and reference validation.
- [x] Deterministic clip sampling and parent transform composition.
- [x] Attachment and hitbox transform resolution.
- [ ] Focused Node tests pass in the repository environment.

### Phase B — Phaser runtime adapter
- Render each bitmap part using the evaluated world transform.
- Integrate state selection with existing plant/monster runtime animation calls.
- Add deterministic state transitions and safe cleanup on scene shutdown.
- Keep legacy Sprite Sheet runtime unchanged when no rig profile exists.

### Phase C — Studio rig editor
- Add mode selection and a visual rig canvas using the real uploaded art.
- Implement bone hierarchy editing, pivots, part assignment, attachments, hitboxes, and timeline.
- Save/load the rig profile through the existing authenticated Studio draft APIs.
- Reuse existing validation and asset dependency/revision protections.

### Phase D — Animation state machine and blending
- Add explicit state priorities, transition rules, clip fallback, and bounded cross-fades.
- Prevent idle updates from overriding attack/hurt/frozen/death states.
- Verify blend determinism and state interruption rules.

### Phase E — Full battle integration and verification
- Use rig attachment points for real projectile origins.
- Use pose-bound hitboxes for supported attacks.
- Verify a rigged plant and a rigged monster in a live Phaser battle.
- Run tests, lint, production build, and Chrome verification on Windows.
- Update the Studio master plan and build log with actual evidence.

## Safety and quality rules

- Never rewrite or delete existing Sprite Sheet assets as part of rig conversion.
- Do not change combat balance or authoritative combat rules in the animation evaluator.
- Do not load arbitrary scripts from asset metadata.
- Cap bones, clips, keyframes, attachments, hitboxes, and coordinate ranges.
- Validate all IDs and references before saving, testing, or publishing.
- Keep rig profiles versioned and include them in clone/version/restore snapshots.
- Do not mark a phase complete until its acceptance checks are actually run.
