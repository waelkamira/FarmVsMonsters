# FARM VS MONSTERS — Godot project

Android-first, offline, single-player Godot 4 project. The Phaser client and legacy Unity source remain intact as migration references.

## Current status

The project now has a first playable Stage 1 live-combat loop in `scenes/live_battle.tscn`:

- Place all six Stage 1 defenders on the 8×5 board with the mirrored energy costs.
- Radish, Pineapple, Hazelnut and Mango automatically fire lane projectiles using their configured damage, speed, range and cooldown.
- Mushroom generates energy on its configured production interval; Pumpkin acts as a high-health blocker.
- All four Stage 1 monster archetypes spawn with their configured health, speed, size, damage and attack cadence.
- Monsters move along five lanes, stop to bite the nearest plant, destroy it when its health reaches zero, and breach the farmhouse if they reach the left edge.
- Projectiles collide with monsters, apply the configured damage modifiers, and award the existing 8-point defeat reward.
- Five waves spawn the canonical 3/5/6/7/9 enemies, followed by victory or defeat.

The current battlefield uses temporary vector shapes and simplified lane positioning. It is a gameplay prototype, not the final art-integrated game. The current prototype automatically credits Mushroom production and defeat rewards to keep the first combat loop playable; authored pickup interactions, detailed Dust Skitter jump/burst presentation, Stonehide bracing visuals, Dragon boss/story sequence, Farmer melee, and production sprite animations are not yet ported.

## Open in Godot

1. Install a stable Godot 4.x editor.
2. Import this folder by selecting `project.godot`.
3. Run the project to open the main menu.
4. Select **Start Stage 1 — Live Combat**.

The project is configured for a 1280×720 landscape canvas and the Compatibility renderer. The exact Godot patch version and Android export template/toolchain still need a local validation pass.

## Rule smoke tests

Run both existing smoke-test scripts with a Godot 4.x executable:

```sh
godot --headless --path godot --script res://tests/test_phase_one_rules.gd
godot --headless --path godot --script res://tests/test_phase_one_combat_core.gd
```

These tests cover the mirrored rules. The live combat scene itself has not yet been executed in the Godot engine in the current development environment.

## Art workflow

Keep source art in the existing repository until the asset inventory and approval pass is complete. Import approved PNG sprite sheets into Godot with explicit frame dimensions, spacing, margins, anchors and filtering. Do not assume that every design contract has a matching production-ready image file.
