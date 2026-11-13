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

## 2026-11-13 — Desktop/mobile input and wave resilience
- Added `Input/DesktopBattleInput.cs`: WASD/arrow movement, number-key plant selection (1–5), and mouse-click plant placement by camera raycast.
- Added `Input/TouchBattleInput.cs`: tap-to-place adapter and a public movement-input method for a future on-screen joystick.
- Updated `Enemies/WaveManager.cs` to discard destroyed/missing enemy references while waiting for a wave to clear, avoiding a permanent wait if an enemy is removed without raising its death event.
- Desktop input uses Unity's built-in legacy Input Manager axes; set Active Input Handling to Input Manager or Both. The touch adapter is a basic prototype adapter; mobile UI joystick/buttons still need to be built and wired.
- Placement raycasts require the board surface to have a collider and its layer to be included in `placementMask`. The selected plant definitions must reference configured plant prefabs.
- Verification: commits were written to `main`; source files were read back in the repository. No Unity compile, scene test, or device test has been run yet.

## 2026-11-13 — Battle HUD and stage selection
- Added `UI/BattleHudController.cs`: presents energy, protected-farm health, wave/enemy counts, plant selection buttons, and victory/defeat panel. Includes retry and configurable main-menu scene navigation methods.
- Added `UI/StageSelectionController.cs`: displays configured stages, checks locally saved unlock progression, disables locked/missing-scene entries, and loads the selected stage scene.
- Extended `WaveManager` with total-wave and current-wave display metadata for HUD presentation.
- Fixed HUD button listener lifecycle by retaining and removing the exact UnityAction delegates on disable.
- UI components use Unity UI (uGUI) Text, Slider, and Button references; Canvas layout, fonts, icons, responsive scaling, and scene button wiring must be created in Unity.
- Build settings must include every scene referenced by name, or use valid scene paths where supported by the project setup.
- Verification: code committed to `main` and read back. No Unity compile, UI rendering, scene transition, or runtime test has been performed.

## 2026-11-13 — Persistent farm economy, upgrades, and buildings
- Expanded `PlayerProgressData` to schema v2 with persistent farm coins, upgrade levels, and owned building IDs. Version-1 saves are migrated while preserving stage unlock and battle statistics.
- Added `FarmUpgradeDefinition.cs` and `FarmUpgradeService.cs` for configurable upgrade costs, maximum levels, persistent purchases, and per-level bonuses.
- Added `FarmUpgradeRuntimeApplier.cs` and runtime bonus methods on farmer, health, and plant combat components so saved movement, health, damage, attack-speed, and energy upgrades can affect a battle scene.
- Added `FarmBuildingDefinition.cs`, `FarmBuildingSlot.cs`, and `FarmBuildingService.cs` for stage-gated building purchases, named placement slots, persistent ownership, and restoration when the farm scene loads.
- Added `UI/FarmManagementController.cs` to display farm coins, upgrade levels/costs, building ownership/costs, and purchase actions.
- Victory now grants persistent farm coins in addition to battle energy; the farm shop spends farm coins, keeping the permanent economy separate from temporary battle energy.
- Unity Inspector setup remains required: create ScriptableObject assets, assign slot IDs to matching building definitions, connect shop buttons/services, configure the upgrade list and battle runtime applier references.
- Important limitation: building positions are restored from predefined slots, not arbitrary free placement. Upgrade bonus values are authored per level and must be balanced in the Inspector.
- Verification: source updates were committed to `main` and are being read back. Unity compilation, migration runtime checks, purchase flows, and scene tests have not yet been run.

## 2026-11-13 — Farm progression integration and source corrections
- Completed the v2 save clone/migration path so owned building IDs and upgrade records are preserved when data is copied and saved.
- Corrected farm building restoration/purchase to consistently resolve the configured `SlotId`, separate from the persistent `BuildingId`.
- Added persistent farm-coin rewards on battle victory.
- Added runtime application of permanent bonuses to farmer movement, farm health, energy capacity/starting energy, and plant combat. Newly placed plants also receive their saved damage/attack-speed bonuses through `PlantPlacementService`.
- Hardened farm shop UI against unassigned optional button references.
- Source review caught and corrected malformed escaped newline insertions before finalizing the affected scripts. The affected files were rewritten/read back from GitHub.
- Verification remains source-level only: no Unity Editor/compiler is available in this session, so compile and gameplay tests are still pending.

## 2026-11-13 — Farm animals and resource production
- Added `FarmAnimalDefinition.cs` ScriptableObjects for animal prefab, purchase price, stage requirement, produced resource, production quantity, and production interval.
- Added named `FarmAnimalPenSlot.cs` anchors and `FarmAnimalService.cs` for purchase, ownership persistence, restoration into free pen slots, and timed resource production.
- Added `FarmResourceType.cs` and `FarmResourceWallet.cs` with a separately persisted, capacity-limited inventory for wheat, milk, wool, eggs, and meat.
- Added `UI/FarmAnimalShopController.cs` for animal purchase buttons, coin balance, ownership state, and resource counts.
- Animal purchases use the existing permanent farm-coin balance and stage unlock progression. Production is only generated while the farm scene/service is running; offline production and animal care/feeding are not implemented yet.
- Unity setup required: create animal definition assets, assign animal prefabs and pen slot references, add a FarmResourceWallet, and wire the shop UI.
- Verification: files were committed to `main` and read back from GitHub. Unity compilation, save/load runtime tests, production timing, and scene placement have not yet been tested.

## 2026-11-13 — Crop planting, growth, watering, and harvest
- Added `FarmCropDefinition.cs` ScriptableObjects for crop identity, seed cost, growth duration, harvest resource/yield, stage unlock, and growth-stage prefabs.
- Added named `FarmCropPlot.cs` plot anchors and `FarmCropService.cs` for planting, per-plot persistence, growth progression, stage visual changes, and harvest.
- Crop growth uses UTC wall-clock timestamps, so planted crops continue progressing while the game is closed. This is prototype-local clock-based progress and is not server-authoritative.
- Added watering: one water resource accelerates a crop by its configured growth bonus, with a per-crop watering cooldown. Watering and growth bonuses persist.
- Expanded `FarmResourceType` and `FarmResourceWallet` with Seeds and Water, preserving older shorter inventory arrays and granting starter seeds/water on a new save.
- Added seed-pack purchasing with farm coins, capacity validation, and UI controls for planting, watering, harvesting, and displaying seed/water stock.
- UI uses uGUI Button/Text references and needs plot/crop arrays wired in the Inspector. Each crop definition needs one or more stage prefabs, and each plot needs a unique ID.
- Verification: changes were committed to `main` and source files read back. Unity compilation, clock/offline progression, UI wiring, and scene gameplay tests remain pending.
