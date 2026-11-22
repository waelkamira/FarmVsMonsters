# Auto-Rig production workspace

This directory defines the Blender-backed Auto-Rig pipeline contract for FarmVsMonsters Studio.

## Existing runtime contract (do not duplicate)

The active Phaser runtime already supports two animation paths:

- Sprite Sheet + Atlas JSON remains the universal compatibility/export path.
- Version 1 cutout rigs are evaluated by `../skeletalAnimation.mjs` and rendered by `../phaserSkeletalRig.mjs`.

The Blender pipeline must export to one of those existing paths. It must not introduce a second Phaser rig evaluator or a competing profile format.

Important current limitation: the Phaser cutout adapter attaches bitmap images to bone containers. It supports hierarchical rigid-part transforms, attachments and hitboxes; it does not currently implement Blender mesh deformation or vertex skinning. For deforming parts, bake the final motion into Sprite Sheets for the first production slice. Do not label a deforming rig as runtime-supported until a Phaser deformation renderer is implemented and tested.

## Per-character workspace

Generated workspaces are local, disposable build data and must not be committed as source assets:

```text
web/.autorig-workspace/
  jobs/
    <job-id>/
      job.json                 # validated input manifest
      input/
        source.png             # original character sheet/image
        references/            # optional user-supplied references
      parts/
        manifest.json          # part IDs, source rectangles/masks, confidence
        png/                   # transparent extracted parts
        masks/                 # segmentation masks and debug overlays
      geometry/
        character-geometry.json # pixel-space landmarks and proposed rig mapping
      blender/
        build_rig.py
        scene.blend             # editable Blender project
        logs/
      renders/
        idle/
        walk/
        attack/
        preview/
      export/
        rig-profile.json        # only when compatible with runtime v1
        atlas.png
        atlas.json
        character-config.json   # combat events/attachments/hitboxes
        validation.json
      job-result.json           # stage status, errors, timings, artifact references
```

Committed pipeline code and schemas live in this `autoRig/` directory. Approved game assets are promoted from the workspace into the existing asset-management/publishing flow; the workspace itself is never the runtime asset store.

## Input contract

A job starts with `schemas/job.schema.json`. All paths are relative to the job directory; reject absolute paths and path traversal. The source image dimensions are read from the actual file, never guessed from a preset. The manifest may select an existing rig template, but the template is a hint to the matching stage, not permission to force an incompatible skeleton.

The AI/vision stages produce geometry and segmentation artifacts. They do not write directly into the runtime profile without validation.

## Runtime rig profile contract

`schemas/rig-profile.schema.json` documents the exact version-1 structure accepted by `createSkeletalRigProfile()`. Keep it aligned with that validator:

- One root bone; unique stable IDs; acyclic parent graph.
- Bone transforms use the Phaser canvas coordinate system (x right, y down; rotation in degrees).
- `pivot` is measured in source-frame pixels, matching Phaser Image.setOrigin conversion in the adapter.
- `part.assetId` resolves to a separately loaded part texture; `part.frame` is an integer frame index.
- Attachments and hitboxes reference existing bones.
- Animation tracks use increasing integer `timeMs` keyframes and the supported transform fields.
- Bone array order is also the initial draw/container insertion order; preserve intended layering when exporting.

The current runtime schema has no `rig_type`, arbitrary mesh, vertex weights, or z-index field. Keep those in the intermediate geometry/Blender project, then either map them to supported rigid bones or bake the animation to a Sprite Sheet.

## Output and validation

Every job must write a `job-result.json` with per-stage status and artifact paths. A stage is successful only when its expected files exist, parse, and pass structural validation. Never mark a job approved merely because Blender exited with code 0.

Minimum first-slice outputs:

1. Editable `.blend` scene.
2. Transparent preview render.
3. Sprite Sheet PNG + Atlas JSON.
4. Runtime-compatible rig profile only if all parts are rigid and the profile passes the existing validator.
5. Character combat metadata with named animation events, muzzle/attack attachments and hitboxes.
6. Validation report recording source dimensions, frame count, FPS, alpha presence, and Phaser compatibility checks.

## First proof of concept

Use one real Hazelnut Level 1 source asset. Inspect its actual dimensions and existing files before creating the job manifest. Build and test the smallest working path first: source -> parts/placement -> Blender scene -> Idle/Attack renders -> Atlas -> Phaser BattleScene. Keep the existing approved animation assets unchanged.
