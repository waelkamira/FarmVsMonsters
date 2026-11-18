# FARM VS MONSTERS — Godot project

Android-first, offline, single-player Godot 4 project. The Phaser client and legacy Unity source remain intact as migration references.

## Current status

A dedicated **Test Snow Thrower vs Frozen Hyena** entry is available from the main menu. It starts a controlled single-lane encounter with full energy, automatically places the Snow Thrower, and spawns one guaranteed Hyena in the same lane so the freeze projectile can be observed without waiting for a random wave.


The project has a first playable Stage 1 combat loop and now imports approved source artwork into `godot/assets/` without modifying the originals:

- Farmer idle, walk, run, planting, uproot, jump, hit, death and club-attack sheets are connected. Press J or tap JUMP to play the original five-frame jump when the Farmer is free; the jump also avoids a monster bite during its animation. The Farmer has 180 HP; monsters can bite him when they reach him in the same lane, hits grant 700 ms of damage protection, the original hit reaction plays when available, and lethal damage triggers the death animation and defeat. The UPROOT mode lets the player tap a planted defender, play the original uproot animation and recover its configured planting-energy cost. A successful planting action plays the original six-frame bend/recovery animation and returns to the current locomotion state when it finishes. The Farmer can move with WASD/arrow keys or the enlarged on-screen D-pad; touch movement uses the slower walk animation. The landscape battle HUD uses a two-row plant selector with a visible selected state, compact resource/wave readouts, and a Farmer health percentage plus an overhead health bar. Touch direction state is cleared when the app/window loses focus so a held movement input cannot remain stuck. Press Space or the on-screen CLUB button for emergency melee after at least one defender has been planted and every living Radish has been lost.
- Hyena idle, walk, run, bite, hit and death sheets are connected as animation states. Dust Skitter uses the faster run sheet and now performs the canonical short speed bursts with trailing dust puffs; jumping remains disabled, matching the active Phaser runtime. Stonehide displays a shale brace ring while biting and retains its reduced incoming-damage multiplier. Monsters switch to bite when stopped at a plant, play hit reactions on damage and play their defeat animation before removal. A reusable freeze status now pauses a monster's movement and attacks for 2.6 seconds, restores its original tint on expiry, and selects projectile targets using each monster's width scale so small and large bodies get appropriate collision reach. The Snow Thrower is now available in the plant selector and launches a dedicated snow projectile that freezes the nearest monster in its lane for 2.6 seconds without dealing direct damage.
- Radish, Pineapple, Hazelnut, Mango and Snow Thrower sheets are sliced into a resting frame plus an attack sequence. The attack sequence plays when the plant launches a projectile.
- Mushroom and Pumpkin use their approved static character artwork.
- Radish, Pineapple, Hazelnut, Mango and Snow Thrower projectile textures are connected to their matching plant launchers.
- Existing gameplay remains: 8×5 placement, configured energy costs, plant firing, visible Mushroom energy-orb production and touch collection with the Farmer’s six-frame collect animation, projectile damage, monster movement and biting, five waves, rewards, victory and defeat.

The original artwork remains in `web/public/assets/`; the Godot copies point to the same Git blob contents. See `ASSET_IMPORT.md` for source mapping and frame assumptions.

- Fourteen CC0 OGG sound effects are imported unchanged and played through an eight-voice SFX pool: planting, footsteps, monster bites/hits/defeat, projectile launch, energy/coin reward, and battle outcomes. Their source and license notes are retained under `assets/audio/sfx/LICENSES.md`.

## Known visual limitations

- The approved farm battlefield background and 8×5 perspective mesh are now used. Cell taps are resolved against the 40 calibrated soil polygons; plants, monsters and projectiles follow perspective lanes and scale with row depth.
- The Pineapple and Hazelnut sheets use their exact Phaser frame contracts (418×418 and 341×341 respectively); the Godot visual result still needs runtime review.
- Farmer planting now follows the Phaser-style walk-to-cell route across the calibrated perspective mesh, plays the authored planting action, then runs back to the exact starting position and facing. The route geometry is covered by round-trip tests for points inside and outside the board. Jump, hit and death interactions are now wired into the Godot runtime; Farmer health and monster-bite lane detection still require hands-on gameplay balancing. Mushroom energy orbs expire after 18 seconds if left uncollected. The Phaser version remains the reference for those mechanics.
- The same Hyena base art is temporarily reused for all four monster archetypes, with tint and size differences; this is not a final character-art pass. Frozen Hyena level 1/2 PNG sources are imported but their atlas layout has not yet been confirmed, so the current freeze effect uses a temporary tint rather than substituting an unverified animation sheet. Snow Thrower source art is provisionally treated as a 3×3 atlas based on its 1080 px sheet width; verify frame margins, pivot and visual scale in the Godot editor before production sign-off. Monster-jump and monster-land audio are imported but unused while canonical jumping is disabled; plant-rustle now plays during manual uprooting.

## Platform delivery plan

1. Continue feature development and gameplay review through a free browser-hosted Web build while keeping this GitHub repository private. Cloudflare Pages is the intended host; the current GitHub Pages workflow is retained as an optional route but cannot publish this private repository on its current plan.
2. Keep the Godot project and gameplay systems shared between Web and Android. Browser builds are for frequent review, not a separate game implementation.
3. Complete mobile touch, landscape layout, performance, offline behavior and device validation.
4. At release, export and sign a complete Android APK from this same Godot project using the matching Android export templates and signing credentials.

The dedicated Snow Thrower test uses the current temporary blue freeze tint. The imported frozen-hyena Level 1/2 images remain source assets only until their frame layout is visually verified; they are not yet used as an animated replacement in combat.

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

The GitHub Actions workflow runs these checks on Godot pull requests and pushes to `main` or `migration/**` branches. Godot 4.x is not available in the current development environment, so no local engine run or Android export/device test is claimed.

## Audio and future art

The imported sound effects are CC0-1.0; see `assets/audio/sfx/LICENSES.md` for the source packs and license record. The OGG payloads are copied unchanged. Do not assume every design contract has a matching production-ready image file.
