# Build Log — Farm Vs Monsters

## 2026-11-13 — Repository foundation
- Created private GitHub repository `waelkamira/FarmVsMonsters` on branch `main`.
- Added project README and repository hygiene files.
- Initial implementation has started: `TeamId`, `Health`, `DamageDealer`, and `EnergyWallet` C# components are committed under `Assets/Scripts/`.
- No Unity project settings, scenes, prefabs, input wiring, or 3D models have been committed yet.

## Next implementation milestones
1. Pin a Unity LTS version and configure URP + Input System.
2. Create Boot, MainMenu, Farm, Battle, and Test scenes.
3. Implement player movement, camera, grid placement, energy, plant combat, enemy waves, win/loss, rewards, and save/load.
4. Build a playable Windows prototype, then validate Android touch controls.

## 2026-11-13 — First gameplay code
- Added `Core/TeamId.cs` for Player/Monsters/Neutral allegiance.
- Added `Combat/Health.cs` with damage, healing, death event, and reset.
- Added `Combat/DamageDealer.cs` with team-aware friendly-fire prevention.
- Added `Economy/EnergyWallet.cs` with capped balance, atomic spend checks, and change events.
- Verification: files were committed to `main` and are being checked through GitHub file reads. Unity compilation has not yet been run.

## 2026-11-13 — Grid and plant placement foundation
- Added `Farm/BattleGrid.cs` for bounded world-to-cell conversion, cell centers, and editor grid gizmos.
- Added `Plants/PlantDefinition.cs` as a ScriptableObject for plant ID, display name, energy cost, cooldown, and prefab.
- Added `Plants/PlantPlacementService.cs` for bounds/occupancy/energy validation and prefab placement.
- Corrected grid conversion to respect the grid transform and scale; hardened energy addition against integer overflow.
- Verification: committed files were read back from `main`. No Unity Editor/compiler is available through this GitHub operation, so a Unity build and in-scene validation remain pending.

## 2026-11-13 — Combat loop foundation
- Added Combat/Projectile.cs for homing projectiles with lifetime, target validation, and team-aware impact damage.
- Added Enemies/EnemyMarker.cs so plant targeting explicitly identifies monster combatants instead of damaging arbitrary colliders.
- Added Enemies/EnemyMovement.cs for target approach and timed melee attacks.
- Added Enemies/WaveManager.cs for sequential wave spawning; a wave clears only after all spawned enemies have died. Death-event subscriptions are retained and cleaned up safely.
- Added Plants/PlantCombatController.cs for nearest-monster acquisition and projectile firing with a bounded non-allocating physics query.
- These components require scene/prefab wiring: assign spawn points and target health, add EnemyMarker + Health + colliders to monster prefabs, and assign projectile prefabs/muzzles to plant prefabs.
- Verification: new files and fixes were committed to main and read back through GitHub. Unity compilation, physics setup, and runtime playtesting have not yet been performed.

## 2026-11-13 — Player, camera, energy, and battle flow
- Added `Player/FarmerController.cs`: CharacterController-based movement with a public input method, so keyboard/gamepad/touch adapters can be added without coupling input APIs to movement.
- Added `Camera/IsometricCameraFollow.cs`: configurable smooth follow camera for the isometric play space.
- Added `Economy/EnergyPickup.cs`: one-shot trigger pickup that safely credits the configured/collector wallet and ignores full wallets.
- Added `Economy/TimedEnergyGenerator.cs`: configurable periodic energy generation for producer plants such as Sunflower.
- Added `Battle/BattleOutcomeController.cs`: listens for all waves cleared or protected-target death, emits one terminal outcome, and grants a configurable victory energy reward.
- Scene wiring still required: add a CharacterController to the farmer; assign camera target; set pickup trigger colliders; assign the wallet to energy generators; connect WaveManager and protected-target Health to BattleOutcomeController.
- Verification: commits were written to `main`. Unity compilation and runtime behavior have not been tested because the Unity project/editor is not yet installed/configured. Input adapters, HUD, save/load, scenes, prefabs, and 3D assets remain outstanding.

## 2026-11-13 — Local progression persistence
- Added `Progression/ProgressSaveService.cs` with versioned JSON save data stored in PlayerPrefs: highest unlocked stage, completed battles, victories, and defeats.
- Added safe defaults and basic malformed/unsupported-save recovery. Exposed stage unlock, battle recording, progress load, and reset operations.
- Connected `BattleOutcomeController` to record every terminal battle result and unlock the configured next stage on victory.
- Save data is local prototype storage only; it is not encrypted, backed up, or synchronized between devices.
- Verification: source files were committed to `main`. Unity compilation and save/load runtime tests remain pending.
