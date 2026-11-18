# FARM VS MONSTERS — Godot project

Android-first, offline, single-player Godot 4 project. The Phaser client and legacy Unity source remain intact as migration references.

## Current status

The project has a first playable Stage 1 combat loop and now imports approved source artwork into `godot/assets/` without modifying the originals:

- Farmer idle, walk, run, planting and club-attack sheets are connected. A successful planting action plays the original six-frame bend/recovery animation and returns to the current locomotion state when it finishes. The Farmer can move with WASD/arrow keys or the on-screen D-pad; touch movement uses the slower walk animation. Press Space or the on-screen CLUB button for emergency melee after at least one defender has been planted and every living Radish has been lost.
- Hyena idle, walk, run, bite, hit and death sheets are connected as animation states. Dust Skitter uses the faster run sheet and now performs the canonical short speed bursts with trailing dust puffs; jumping remains disabled, matching the active Phaser runtime. Stonehide displays a shale brace ring while biting and retains its reduced incoming-damage multiplier. Monsters switch to bite when stopped at a plant, play hit reactions on damage and play their defeat animation before removal.
- Radish, Pineapple, Hazelnut and Mango sheets are sliced into a resting frame plus an attack sequence. The attack sequence plays when the plant launches a projectile.
- Mushroom and Pumpkin use their approved static character artwork.
- Radish, Pineapple, Hazelnut and Mango projectile textures are connected to their matching plant launchers.
- Existing gameplay remains: 8×5 placement, configured energy costs, plant firing/production, projectile damage, monster movement and biting, five waves, rewards, victory and defeat.

The original artwork remains in `web/public/assets/`; the Godot copies point to the same Git blob contents. See `ASSET_IMPORT.md` for source mapping and frame assumptions.

- Fourteen CC0 OGG sound effects are imported unchanged and played through an eight-voice SFX pool: planting, footsteps, monster bites/hits/defeat, projectile launch, energy/coin reward, and battle outcomes. Their source and license notes are retained under `assets/audio/sfx/LICENSES.md`.

## Known visual limitations

- The approved farm battlefield background and 8×5 perspective mesh are now used. Cell taps are resolved against the 40 calibrated soil polygons; plants, monsters and projectiles follow perspective lanes and scale with row depth.
- The Pineapple and Hazelnut sheets use their exact Phaser frame contracts (418×418 and 341×341 respectively); the Godot visual result still needs runtime review.
- Farmer planting now uses the authored action sheet, but the full walk-to-cell/return trip is not implemented. Uproot, collect, jump, hit and death sheets are imported and frame-registered but remain inactive until their corresponding gameplay interactions (manual uproot/pickup, jump control and Farmer health/damage) exist in the Godot runtime. The Phaser version remains the reference for those mechanics.
- The same Hyena base art is temporarily reused for all four monster archetypes, with tint and size differences; this is not a final character-art pass. Monster-jump and monster-land audio are imported but unused while canonical jumping is disabled; plant-rustle remains reserved for a future uproot action.

## Open in Godot

1. Install a stable Godot 4.x editor.
2. Import this folder by selecting `project.godot`.
3. Run the project to open the main menu.
4. Select **Start Stage 1 — Live Combat**.

The project is configured for a 1280×720 landscape canvas and the Compatibility renderer. The exact Godot patch version and Android export template/toolchain still need a local validation pass.

## Tests

Run the resource import once, then the asset and rule smoke tests:

```sh
godot --headless --editor --path godot --quit
godot --headless --path godot --script res://tests/test_asset_manifest.gd
godot --headless --path godot --script res://tests/test_phase_one_rules.gd
godot --headless --path godot --script res://tests/test_phase_one_combat_core.gd
```

The GitHub Actions workflow runs these checks on Godot pull requests and pushes to main. Godot 4.x is not available in the current development environment, so no local engine run or Android export/device test is claimed.

## Audio and future art

The imported sound effects are CC0-1.0; see `assets/audio/sfx/LICENSES.md` for the source packs and license record. The OGG payloads are copied unchanged. Do not assume every design contract has a matching production-ready image file.
