# FARM VS MONSTERS — Godot project

This folder is the new Android-first, offline Godot 4 project. The Phaser client
and legacy Unity source remain intact as migration references.

## Current status

The project currently contains a minimal Godot foundation and a board-placement
sandbox. It is **not yet a complete battle game**: monster movement, combat,
projectiles, wave progression, art integration, saves, audio and Android export
still need to be implemented and tested.

## Open in Godot

1. Install a stable Godot 4.x editor.
2. Import this folder by selecting `project.godot`.
3. Run the project to open the main menu.
4. Open the battle board prototype to test basic defender selection and placement.

The project is configured for a 1280×720 landscape canvas and the Compatibility
renderer. The exact Godot patch version and Android export template/toolchain
must be pinned after a local editor/export validation pass.

## Rule smoke test

Run with a Godot 4.x executable:

```sh
godot --headless --path godot --script res://tests/test_phase_one_rules.gd
```

The smoke test checks the initial Stage 1 board, wave-count, energy and placement
constants mirrored from `web/game/rules/phaseOneCombatContract.mjs`. It does not
replace the full JavaScript regression suite or parity testing.

## Art workflow

Keep source art in the existing repository until the asset inventory and approval
pass is complete. Import approved PNG sprite sheets into Godot with explicit
frame dimensions, spacing, margins, anchors and filtering. Do not assume that
every design contract has a matching production-ready image file.
