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

## 2026-11-13 — Crop system source review and compatibility fixes
- Completed the crop UI listener lifecycle for crop selection, watering, harvesting, and seed-pack purchase controls; refresh now reflects empty/occupied plots, growth percentage, harvest readiness, water cooldown, and available resources.
- Added a visual-stage cache so crop prefabs are only replaced when the crop advances to another configured growth stage, rather than being recreated every refresh tick.
- Added backward-compatible resource inventory migration: saves created before Seeds and Water existed receive the configured starter quantities when those inventory slots are first introduced; migrated arrays are saved in the expanded format.
- Corrected escaped source line breaks discovered during read-back and rewrote the crop UI controller to ensure valid C# source text.
- Verification remains repository read-back/source inspection only. No Unity compiler or runtime tests have been executed.


## 2026-11-13 — Persistent farm processing and crafting
- Added `FarmProductionRecipe.cs` ScriptableObjects for configurable input resources, output goods, processing duration, and stage requirements.
- Added `FarmProductionStation.cs` scene anchors with stable station IDs.
- Added `FarmProductionService.cs` with one active job per station, ingredient validation/consumption, persistent job timestamps, offline processing progress, and capacity-checked output claiming.
- Expanded farm resources with Flour and Bread. Existing resource saves remain compatible because the inventory loader copies old array entries into the larger inventory and initializes newly introduced Seeds/Water only when those slots were absent.
- Example recipes can be authored in Unity (e.g. Wheat → Flour; Flour + Eggs + Milk → Bread) without hardcoding production rules in the service.
- Scene setup required: create recipe assets, assign the recipe catalogue and station anchors to the service, and connect UI controls to TryStart/TryClaim.
- Important limitation: jobs are completed when claimed, not automatically deposited; if output storage is full, the completed job remains claimable and no output is lost. This is local PlayerPrefs persistence and UTC-clock based, not server-authoritative.
- Verification: GitHub commits were created on `main`; Unity compilation, editor wiring, and runtime production tests have not been run.


## 2026-11-13 — Farm market and resource sales
- Added `FarmMarketListing.cs` ScriptableObjects for per-resource prices, minimum sale quantities, display names, and stage unlock requirements.
- Added `FarmMarketService.cs` to list unlocked goods, calculate sellable stock, validate quantity and currency overflow, remove inventory, and credit permanent farm coins.
- Added `UI/FarmMarketController.cs` as a uGUI adapter for balance, sellable inventory, fixed-quantity sale buttons, and sale feedback.
- Sale quantities are bounded by both available inventory and remaining farm-coin integer capacity. The service validates both sides before committing and includes defensive inventory compensation if the currency credit unexpectedly differs.
- Unity setup required: create listing assets, configure prices and unlock stages, assign the market service/resource wallet, and wire the UI Text/Button references.
- Limitation: this is a local single-player NPC market with fixed configured prices. Dynamic supply/demand, market orders, player trading, and a durable transaction ledger are not implemented.
- Verification: source files were committed to `main` and read back from GitHub. Unity compilation and runtime transaction tests remain pending.


## 2026-11-13 — Warehouse storage and capacity upgrades
- Added `FarmWarehouseService.cs` with a persistent warehouse level, configurable capacity growth, escalating upgrade prices, and farm-coin purchases.
- Added a capacity setter to `FarmResourceWallet.cs`; expanding the warehouse updates the cap for every resource while preserving existing inventory. Changing the configured capacity does not delete or clamp existing inventory; excess stock simply blocks additional deposits until capacity is raised or goods are sold.
- Added `UI/FarmWarehouseController.cs` to show warehouse level, per-resource capacity, stock quantities, next upgrade cost, and the upgrade action.
- Warehouse levels persist independently in a versioned PlayerPrefs record. Default tuning is 9,999 base capacity plus 2,500 per level, up to 10 levels; values can be adjusted in the Inspector.
- Unity setup required: assign one FarmResourceWallet to FarmWarehouseService and the UI controller, then connect the level/capacity/stock/cost/status Text fields and upgrade Button.
- Limitation: capacity is currently a per-resource cap, not a single shared volume/weight pool. Storage categories, spoilage, separate warehouses, and production routing are future work.
- Verification: code was committed to `main` and read back from GitHub. Unity compilation, Inspector wiring, and purchase/save runtime tests remain pending.


## 2026-11-13 — Trade contracts and inventory preservation
- Added `FarmTradeContractDefinition.cs` ScriptableObjects for configurable delivery requests, resource quantities, coin rewards, stage gates, and optional UTC deadlines.
- Added `FarmTradeContractService.cs` with one active contract at a time, persistent acceptance/deadline state, expiry handling, inventory-backed delivery, and farm-coin rewards.
- Added `UI/FarmTradeContractController.cs` for accepting configured offers, viewing delivery progress, delivering goods, cancelling an active order, and showing status/balance.
- Hardened inventory preservation: changing warehouse capacity no longer clamps or deletes existing resource quantities; loading older inventory values no longer truncates stock to the wallet's serialized base capacity.
- Fixed warehouse initialization order: capacity is applied in `Start`, after all scene objects have completed `Awake`, ensuring the resource wallet loads its saved inventory before the warehouse writes updated capacity settings.
- Warehouse UI now reads its configured maximum level instead of assuming the default value of 10.
- Unity setup required: create contract definition assets, assign the same assets to the contract service and UI offer list, connect the resource wallet, and wire uGUI buttons/text.
- Limitations: one active delivery contract is supported; no rotating daily board, reputation, NPC route simulation, or remote/server validation yet. Saves remain local PlayerPrefs.
- Verification: all changed/new source files were committed to `main` and read back. No Unity compiler/editor or runtime tests have been run.


## 2026-11-13 — Specialized storage facilities
- Extended `FarmResourceWallet.cs` with per-resource additional capacity bonuses while preserving the existing shared base capacity and existing inventory save format.
- Added `FarmStorageFacilityDefinition.cs` ScriptableObjects to configure dedicated resource groups, building prefabs, named slots, capacity bonus per level, upgrade pricing, stage gates, and maximum levels.
- Added `FarmStorageSlot.cs` anchors and `FarmStorageFacilityService.cs` to persist each facility level, restore owned building prefabs, aggregate storage bonuses by resource, and purchase upgrades with farm coins.
- Added `UI/FarmStorageFacilityController.cs` for facility level/bonus displays, per-resource effective capacity, and upgrade actions.
- Suggested facility catalog to author in Unity: Grain Store (Wheat + Seeds), Animal Products Store (Milk + Wool + Eggs + Meat), Processed Goods Store (Flour + Bread), and Water Tank (Water). Each needs its own prefab and unique slot ID.
- The general warehouse remains the shared base capacity; specialized buildings add capacity only to their configured resources. Their bonus save is separate from the base warehouse save, so the two systems do not overwrite each other's capacity values.
- Hardened the contract UI to refresh delivery progress when the resource wallet changes, so harvesting/production immediately updates the displayed amount.
- Important setup constraints: assign the same ScriptableObject definitions to the storage service and UI, provide unique storage IDs and slot IDs, add a FarmStorageSlot for every facility, and connect the FarmResourceWallet. No actual warehouse meshes/prefabs have been authored yet.
- Verification: source changes were committed to `main` and read back from GitHub. No Unity compilation, prefab restoration, purchase flow, or gameplay test has been performed.


## 2026-11-13 — Offline animal production and inventory initialization
- Reworked `FarmAnimalService.cs` to persist each owned animal's next production UTC timestamp in save schema v2 while migrating existing schema-v1 ownership saves.
- On farm load, owned animals calculate missed production cycles and deposit the goods they can fit in the appropriate resource capacity. If storage is full, unproduced cycles remain pending and can be collected after the player makes room; no partial cycle is consumed.
- Live production now uses realtime waits and the same timestamp-based catch-up path, so pausing gameplay does not pause farm production clocks.
- Added duplicate animal-ID rejection and safer pen occupancy checks.
- Fixed new inventory initialization: a fresh `FarmResourceWallet` now actually seeds the configured starting Seeds and Water values and saves them, instead of returning with an empty inventory.
- Limitations: animal ownership and production timestamps remain local PlayerPrefs data; device clock changes can affect offline progress. No feeding, happiness, animal health, or server-authoritative anti-cheat exists yet.
- Verification: modified files were committed and read back from GitHub. No Unity compilation or runtime/offline clock simulation has been run.


## 2026-11-13 — Farm economy setup documentation and storage validation
- Added `Documentation/FARM_ECONOMY_AND_STORAGE_SETUP.md` with the scene-object graph, shared-wallet rule, specialized storage catalog, ScriptableObject authoring steps, UI wiring checklist, animal offline-production behavior, and local-save limitations.
- Added duplicate storage identity/slot validation so two configured facilities cannot silently share a persistent ID or spawn into the same named anchor.
- Read-back verification completed for the new setup guide and storage-service update. Unity Editor validation remains outstanding.


## 2026-11-13 — Unity project baseline pinned
- Pinned the repository to Unity 6.3 LTS Editor `6000.3.27f2` using the official Editor revision.
- Added `Packages/manifest.json` with the Unity 6.3-compatible Input System 1.20.1, URP 17.3.0, and uGUI 2.0.0 dependencies.
- Added `Documentation/UNITY_PROJECT_BOOTSTRAP.md` with Unity Hub modules, first-open steps, Input Manager compatibility, URP setup, and the current project limitations.
- Version choice is based on Unity's published Unity 6.3 LTS support guidance and the 6000.3.27f2 security-patched Editor release.
- Verification: configuration files were committed and read back from GitHub. Package resolution and Unity Editor import have not yet been run on a local machine.


## 2026-11-13 — Prototype battle scene generator
- Added `Assets/Editor/PrototypeBattleSceneGenerator.cs`, an Editor menu tool at **Farm Vs Monsters → Generate Prototype Battle Scene**.
- The generator creates a 3D battle board, player/farm target, isometric camera, energy wallet, grid placement, five plant ScriptableObject definitions and primitive 3D plant prefabs, projectile prefab, grunt/brute enemy prefabs, three waves, energy pickups, and a uGUI battle HUD with plant selection and retry.
- Added `Combat/DestroyOnDeath.cs` so defeated monsters are removed from the scene after their death event, and `Battle/BattleRetryButton.cs` to bind the result-panel retry action.
- Connected placed energy-producing plants to the active battle EnergyWallet through PlantPlacementService.
- Desktop and touch placement inputs now ignore taps/clicks over UI controls, preventing UI interaction from accidentally placing plants on the board.
- The generated visuals are primitive 3D greybox models intended only to make the first scene playable/testable; final stylized 3D models, rigging, animation, VFX, and sound remain separate art tasks.
- Added instructions to the Unity bootstrap guide. The generator has not been run in a Unity Editor in this environment, so its output and C# compilation still require local validation.


## 2026-11-13 — README and prototype workflow update
- Updated the repository README to reflect the actual implementation state, pinned Unity version, first-scene generation steps, platform priority, and the distinction between source completion and verified gameplay.
- Corrected the earlier warehouse log wording: existing stock is preserved if capacity is changed; deposits are blocked while inventory is above the current cap.
- Fixed the Editor generator's primitive cleanup calls and documented its temporary greybox art status. The generator has not been executed in Unity yet.


## 2026-11-13 — Prototype scene structural validator
- Added `Assets/Editor/PrototypeBattleSceneValidator.cs` with **Farm Vs Monsters → Validate Prototype Battle Scene**.
- The validator checks required scene components, core serialized references, minimum wave/spawn configuration, five plant/button entries, EventSystem presence, missing MonoBehaviour scripts, and Build Settings inclusion.
- Updated the Unity bootstrap guide and README to run validation after scene generation.
- The validator reports structural wiring only; it cannot replace Editor compilation, actual physics/gameplay checks, or a Windows build.


## 2026-11-13 — Enemy energy drops
- Added `Combat/EnergyDropOnDeath.cs` to spawn a collectible energy orb when a monster dies.
- Extended `EnergyPickup.cs` with safe runtime wallet/amount configuration, and extended `WaveManager.cs` to inject the active battle EnergyWallet into each spawned monster's drop component.
- Updated the Editor generator to create a trigger/Rigidbody energy pickup prefab, attach drop behavior to grunt and brute prefabs, and configure the scene WaveManager wallet.
- Structural validation now checks the WaveManager energy wallet reference as well.
- This closes the battle resource loop: place Sunflower for timed energy, defeat monsters for collectible energy drops, and collect board pickups.
- Verification remains source-level only; physics trigger behavior and pickup collection must be tested in Unity Play Mode.


## 2026-11-13 — Greybox battlefield visual pass
- Improved the generated battlefield with 45 collider-free soil beds aligned to the 9×5 placement grid, wooden side/front fence sections, a clear entrance, a grass backdrop, directional sunlight, and ambient lighting.
- Refactored generated enemy prefabs so gameplay colliders/health stay on the root while the rendered capsule/eyes live under a separate visual root.
- Added `Visuals/ProceduralIdleMotion.cs` and attached it to generated plant/enemy visual roots for subtle bobbing and sway. This is temporary procedural motion, not final rigged animation.
- The generator now creates the enemy energy-orb prefab and wires monster death drops into the battle wallet. The first battle resource loop includes timed Sunflower generation, board pickups, and monster drops.
- The greybox generator and validator source were read back from GitHub and checked for balanced braces/parentheses and expected configuration references. These are source inspections only; Unity compilation and Play Mode physics remain unverified.


## 2026-11-13 — Battle preparation and default plant selection
- Battle HUD now selects the first configured plant on enable, keeping the visible selection text aligned with desktop/touch input defaults.
- Added a configurable initial wave delay to `WaveManager`; the generated battle grants a five-second preparation window before the first monster spawns.
- Source changes were committed to `main`; timing and HUD interaction still require Play Mode validation.
