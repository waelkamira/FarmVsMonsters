# Plant Master Template (Blender)

This is the first scene bootstrap for the Hazelnut Level 1 proof of concept.

## What it creates

- Orthographic front camera (Blender X right, Z up, Y depth).
- Transparent RGBA PNG render settings.
- Standard color management for repeatable sprite output.
- A configurable pixel canvas (150x150 by default) and pixels-per-unit scale.
- A ground/root pivot marker and non-rendering guides.
- A separate, explicitly unverified attack-origin placeholder.
- A source inspection JSON report when `--source` is supplied.

## What it deliberately does not do

- It does not split the Hazelnut sprite sheet into body/head/leaf parts.
- It does not create an anatomical skeleton or guess pivots.
- It does not claim that a sprite sheet is a set of independent cutout parts.
- It does not generate animations or an export atlas yet.

The actual source image must be inspected and segmented before anatomy-specific rigging. The current Phaser cutout runtime supports rigid bitmap parts; deforming parts must be baked to sprite sheets for the first slice.

## Run in Blender

From the repository root:

```powershell
blender --background --python web/game/studio/autoRig/templates/plants/build_plant_template.py -- --output web/.autorig-workspace/templates/plants/plant-master.blend --source web/public/assets/plants/hazelnut-level-1.png
```

The generated `.blend` and inspection report are local workspace artifacts and must not be committed. The canvas defaults are configurable with `--width`, `--height`, `--pixels-per-unit`, and `--baseline-margin-px`.

A successful Blender process only proves that the scene was generated. It does not prove that Hazelnut anatomy, pivots, animation, or Phaser integration are correct.
