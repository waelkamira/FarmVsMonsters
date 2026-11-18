# Godot Migration — Initial Asset and Legacy Source Inventory

**Branch:** `migration/godot4-android`  
**Inventory source:** tracked Git tree on `main` (read-only inspection)  
**Status:** initial path inventory only; visual review, dimensions, frame slicing, licensing/approval and duplicate checks remain open.

## 1. Existing art and audio

The tracked `web/public/assets/` tree currently contains:

- **49 image/vector files** (PNG/JPEG/WebP/SVG).
- **14 audio files** (OGG/MP3/WAV).
- Farmer animation folder: `web/public/assets/characters/farmer/` (10 raster files).
- Monster character folders: `web/public/assets/characters/monsters/` (8 raster files).
- Plant artwork folder: `web/public/assets/plants/` (13 raster files).
- Plant and monster icon collections are separate SVG files under `web/public/assets/plant-icons/` and `web/public/assets/monster-icons/`.
- Sound effects include collection, defeat/victory, footsteps, monster actions, planting and projectile impacts. Review `web/public/assets/audio/sfx/LICENSES.md` before reuse.

Representative Farmer files include idle, walk, run, attack, collect, plant, uproot, jump, hit and death sprite sheets. Their names do not establish exact frame count, spacing or visual approval; inspect each sheet before configuring a Godot `SpriteFrames` resource.

## 2. Legacy Unity source footprint

The repository contains **99 C# source files** under `Assets/`, including editor utilities and runtime systems for battle, combat, economy, enemies, farm, input, plants, player, progression, UI and visuals.

The tracked tree currently contains **0 Unity scene/prefab/asset files** with `.unity`, `.prefab` or `.asset` extensions. No `ProjectSettings/` or `Packages/manifest.json` path was found in the inspected tree. Therefore the tracked `Assets/` sources are useful migration references, but the available tree does not yet establish a complete, directly openable Unity project. Do not assume scenes, prefabs, ScriptableObjects or import metadata can be recovered from these scripts alone.

## 3. Godot import policy

- Keep the original files in their existing locations until each asset is reviewed and approved.
- Copy or move approved assets into `godot/assets/` only with a traceable source path and no destructive replacement.
- Record sprite frame width/height, margins, spacing, pivot/baseline, animation FPS and filtering.
- Preserve the Farmer and plant character identity; do not generate placeholder replacements for approved art.
- Confirm file existence before connecting a projectile design to a texture.
- Record audio attribution/license alongside imported audio.

## 4. Next audit actions

- [ ] Generate image dimensions, alpha-channel and sprite-sheet frame-grid report.
- [ ] Visually inspect Farmer, plant and monster sheets for overlap, inconsistent cells and missing frames.
- [ ] Review all SVG icons and map them to approved in-game entities.
- [ ] Read audio license notes and confirm permitted distribution.
- [ ] Inspect the C# systems most relevant to Stage 1 and reconcile them with Phaser's canonical rules.
- [ ] Determine whether missing Unity scene/prefab/project metadata exists in another branch or external backup; do not invent it.
- [ ] Create Godot import resources only after the above checks.
