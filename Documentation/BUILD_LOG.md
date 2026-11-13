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


## 2026-11-13 — Farm storage UI refresh and slot safety
- Warehouse stock displays now refresh when the shared resource wallet changes.
- Specialized storage facility UI refreshes when inventory/capacity changes, including capacity changes originating from the general warehouse.
- Storage facility purchases now require a configured building prefab, and duplicate scene slot IDs are rejected instead of selecting an arbitrary anchor.
- These are source-level fixes; UI event behavior and prefab instantiation remain to be tested in Unity.


## 2026-11-13 — Prototype dependency validation and final source review pass
- Expanded the scene validator to inspect the generated grunt/brute prefabs, health/movement/marker/death-drop components, energy pickup trigger/Rigidbody, projectile prefab, all five plant assets, and each plant's combat or energy-generation component.
- Added the missing Visuals namespace import to the Editor scene generator.
- Added a default Sunflower selection in the battle HUD and a visible "Get Ready!" state during the pre-wave preparation countdown.
- Storage UI now refreshes as resources change, including the water capacity line; ambiguous duplicate storage scene slots are rejected.
- The source review confirmed balanced braces/parentheses in the changed Editor and economy scripts. This is not a C# compile. The repository still needs to be opened in the pinned Unity Editor to resolve packages, compile scripts, run the generator/validator, and play the scene.


## 2026-11-13 — Crop/production inventory safety review
- Repaired literal escaped newline characters in `FarmCropDefinition.cs` that would have prevented C# compilation.
- Hardened crop harvest so a crop is not removed unless the full configured harvest quantity fits in inventory; unexpected partial deposits are rolled back.
- Hardened production claims so an active job is not left claimable after a partial output deposit, preventing repeated partial claims from duplicating goods.
- Ran a source scan over the crop, animal, market, production, storage, and contract scripts for malformed backslash-newline sequences outside string literals; none remained in the scanned files.
- These are source inspections and safeguards only. Unity compilation and runtime inventory edge-case tests remain pending.


## 2026-11-13 — Ice Bloom crowd-control mechanic
- Added timed slow effects to `EnemyMovement` and optional slow-on-hit parameters to `Projectile`.
- Extended `PlantCombatController` to configure slow strength/duration per plant.
- The generated Ice Bloom now slows surviving monsters to 55% movement speed for 2.5 seconds per hit; other plants keep normal projectile behavior.
- This is a simple refreshable slow effect without stacking below the strongest active slow. It still needs in-game balance and visual feedback.

## 2026-11-13 — Farm hub and connected battle navigation
- Added `Assets/Editor/FarmHubSceneGenerator.cs` with **Farm Vs Monsters → Generate Farm Hub Scene**. It creates a first-pass 3D farm hub with barns, windmill, nine crop-bed placeholders, lighting, camera, and a uGUI Enter Battle button.
- Added reusable `UI/SceneNavigationButton.cs` for safe scene navigation with a Build Settings check.
- Extended the generated battle result panel with **RETURN TO FARM**, targeting FarmHub; the existing retry action remains available.
- Updated both Editor generators to append/enable generated scenes in Build Settings without replacing or deleting unrelated scenes, and to skip scene paths whose assets do not exist yet.
- Expanded the prototype validator to check the battle return button and, when FarmHub exists, its camera, canvas, EventSystem, Enter Battle button, target scene, and Build Settings registration.
- Updated README and Unity bootstrap instructions: generate Farm Hub first, then Prototype Battle, then run the validator.
- The farm hub is currently a navigable greybox shell; crops, animal pens, storage, market, production, and upgrades still need scene-level prefab/catalogue wiring. Unity Editor execution and Play Mode navigation tests remain outstanding.

## 2026-11-13 — Farm hub player controls
- Added `Player/FarmHubPlayerController.cs` with CharacterController-based WASD/arrow-key movement and a smoothed follow camera.
- Updated the Farm Hub generator to create a proper player root with a CharacterController and a separate collider-free visual capsule, then bind the camera to the movement controller.
- Extended the structural validator to require the Farm Hub player controller and CharacterController.
- Updated the quick-start documentation with separate Farm Hub and battle controls.
- The hub now supports basic movement and scene navigation, but its farm systems are not yet connected to visible interactable plots/buildings. Runtime movement and camera feel still require Unity Play Mode verification.

## 2026-11-13 — Farm hub crop gameplay integration
- The Farm Hub generator now creates nine uniquely identified `FarmCropPlot` components and a shared `FarmResourceWallet`/`FarmCropService` pair.
- Added generated Wheat crop assets with two 3D growth-stage prefabs, configurable seed cost/harvest yield/growth time/watering bonus, and persistent crop state using the existing UTC-based farm crop service.
- Added a generated crop-management UI wired to the existing `FarmCropManagementController`: plant Wheat, buy seed packs, view Seeds/Water stock, water individual plots, harvest ready plots, and inspect per-plot growth progress.
- Expanded Farm Hub structural validation to verify the crop service, shared inventory wallet, Wheat growth prefabs, nine plot references, nine sets of water/harvest/status controls, and unique plot IDs.
- Limitation: the current farm hub exposes one starter crop (Wheat) and placeholder plot meshes; animal pens, production stations, storage, contracts, and market still need their own scene-level setup and UI integration. Runtime growth/offline save behavior remains untested in Unity.


## 2026-11-13 — اعتماد الاتجاه الفني 2D وبداية تحويل القتال
- اعتمد المشروع أسلوب **2D Hand-Drawn Cartoon** مستوحى من اللغة البصرية العامة لألعاب الدفاع الكرتونية الكلاسيكية، مع تصميم نباتات ووحوش أصلية وعدم نسخ أصول محمية.
- أضيف `Documentation/ART_DIRECTION_2D.md` لتثبيت معايير تصميم الشخصيات والألوان والتحريك والكاميرا.
- أضيف `Farm/BattleGrid2D.cs` لتحويل إحداثيات العالم إلى خلايا ثنائية الأبعاد.
- أضيف `Plants/PlantPlacementService2D.cs` للتحقق من حدود اللوحة والخلايا المشغولة والطاقة قبل وضع النبات.
- أضيف `Input/DesktopBattleInput2D.cs` لاختيار النباتات بمفاتيح الأرقام ووضعها بالنقر.
- أضيف `Enemies/EnemyMovement2D.cs` لحركة الوحوش أفقياً وهجومها على هدف المزرعة.
- أضيف `Plants/PlantCombatController2D.cs` و`Combat/Projectile2D.cs` لاستهداف الوحوش وإطلاق المقذوفات مع دعم الإبطاء.
- أضيف `Visuals/SpriteAnimation2D.cs` لتشغيل إطارات Idle/Walk/Attack/Hurt/Death من مجموعات Sprite قابلة للضبط.
- تم تحديث `WaveManager` لتعيين هدف الوحوش التي تستخدم حركة 2D، مع الحفاظ على مسار الحركة القديم مؤقتاً.
- هذه نواة تحويل برمجية وليست مشهداً مكتملاً: لم تُنشأ بعد Sprite sheets أو شخصيات فنية نهائية، ولم يُنشأ مولّد مشهد 2D يربط المكونات.
- التحقق الحالي قراءة ملفات المصدر من GitHub ومراجعة بنيوية أولية فقط؛ لم يتم تشغيل Unity أو C# compiler أو Play Mode.

## 2026-11-13 — AI-generated 2D art asset pipeline
- Added Assets/Editor/CharacterSpriteImportSettings.cs to apply consistent Unity Sprite import defaults to generated character images and animation sheets.
- Individual character PNGs are imported as single sprites with a bottom-center pivot; animation sheets are imported as Multiple while leaving frame slicing under explicit editor control.
- Added Documentation/AI_ART_ASSET_PIPELINE.md with the art folder contract, naming rules, generation handoff, sprite-sheet slicing checklist, animation states, and acceptance review gate.
- The importer is scoped only to Assets/Art/Characters/Individual/ and Assets/Art/Characters/SpriteSheets/; it does not modify unrelated textures.
- Verification: files were committed to main. Unity compilation/import behavior has not been tested because the Unity Editor is not installed/configured in this workflow.
## 2026-11-13 — Combat-driven 2D character animation
- Extended SpriteAnimation2D with HasClip so gameplay animation drivers can safely detect optional states.
- Added CharacterAnimationDriver2D to map Health damage/death events to Hurt/Death, movement intent to Walk/Idle, and combat actions to Attack. Missing transient clips fall back to locomotion instead of trapping the character in a state.
- Connected EnemyMovement2D movement and melee attacks to the animation driver, and connected PlantCombatController2D firing to the Attack state.
- The driver initializes its health baseline in Start, after component Awake initialization, to avoid depending on unspecified Awake ordering between components.
- Prefab wiring: add SpriteAnimation2D and CharacterAnimationDriver2D to the same root as Health; assign clips in the Inspector. EnemyMovement2D and PlantCombatController2D discover the driver on their own GameObject.
- Verification: source changes were committed and are being read back from main. No Unity compile or Play Mode test has been run.
## 2026-11-13 — 2D character prefab integration guide
- Added Documentation/2D_CHARACTER_PREFAB_SETUP.md covering shared sprite setup, monster and plant prefab components, projectile configuration, battle board wiring, and a focused Unity smoke-test sequence.
- Documented component co-location constraints for CharacterAnimationDriver2D, Health, SpriteAnimation2D and SpriteRenderer to reduce Inspector wiring mistakes.
- Verification: documentation was committed to main. The smoke-test steps remain pending until the Unity Editor is installed and the project is opened.
## 2026-11-13 — 2D battle HUD, placement cooldowns, and board visuals
- Added BattleHudController2D, a dedicated uGUI presenter wired to DesktopBattleInput2D rather than the legacy 3D/older input adapters. It supports energy, protected-farm health, wave/enemy counts, plant selection, retry, and battle result UI.
- Updated PlantPlacementService2D to enforce each PlantDefinition.PlacementCooldown by stable plant ID and to prune destroyed plant entries before validating a new placement.
- Added BattleGridVisual2D to draw runtime cell boundaries using 2D-compatible line rendering, with configurable color, width and sorting.
- Updated the prefab/scene setup guide to include runtime board visuals.
- Verification: new and updated files were committed to main and are being read back. Unity compile, render pipeline shader availability, UI layout, and Play Mode behavior remain unverified.
## 2026-11-13 — Five-lane enemy movement and wave countdown
- EnemyMovement2D now captures a lane Y coordinate and constrains each monster to its assigned horizontal lane, correcting small vertical drift without allowing lane changes.
- WaveManager assigns the spawn Transform's world Y to each spawned 2D monster, exposes StartDelayRemaining, prevents duplicate Begin requests, and warns when waves or spawn points are missing.
- The initial wave delay now counts down using frame time, and BattleHudController2D displays the remaining seconds before the first wave.
- WaveManager clears its active coroutine and death subscriptions when disabled; normal scene teardown remains safe.
- Updated Documentation/2D_CHARACTER_PREFAB_SETUP.md with five-lane spawn point ordering and configuration requirements.
- Verification: changed C# and documentation files were committed to main and are being read back. Unity compile and Play Mode validation remain pending.
## 2026-11-13 — Wave difficulty controls
- Added Health.ApplyMaxHealthMultiplier, scaling current and maximum health together while preserving the current health ratio and notifying health UI listeners.
- Added EnemyMovement2D.ApplyDifficulty for configurable movement speed and melee damage multipliers.
- Each Wave now exposes enemyHealthMultiplier, enemySpeedMultiplier, and enemyDamageMultiplier; WaveManager applies these values to spawned enemies.
- The 2D HUD now includes the configured wave display name alongside its number.
- Updated the prefab setup guide with tuning guidance and clarified that difficulty is configured per wave rather than silently auto-scaled.
- Verification: GitHub readback and source delimiter checks performed after commits. Unity compilation and gameplay balancing remain pending.

## 2026-11-13 — Wave composition, lane selection, and clear rewards
- Added WaveManager.EnemyGroup entries with prefab/count composition while preserving the existing legacy enemyPrefabs list for compatibility.
- Added RoundRobin and Random spawn selection modes. Random mode avoids selecting the same spawn point consecutively when more than one lane is configured.
- Added per-wave interWaveDelay and energyRewardOnClear. The manager grants the configured energy only after all tracked enemies in that wave are defeated.
- Exposed InterWaveDelayRemaining and updated BattleHudController2D to show the countdown between waves.
- Added a required-Health validation gate: spawned prefabs without Health are logged and destroyed instead of silently allowing a wave to clear.
- Updated the 2D setup guide with composition, lane, reward, and prefab requirements.
- Verification: source files were read back from GitHub and delimiter checks are performed after this commit. Unity compilation, inspector serialization, and gameplay balance still require a Unity editor run.


## 2026-11-13 — Character sheet production pipeline
- Extended the shared 2D animation state model with Block and Victory states, and exposed matching methods on CharacterAnimationDriver2D so gameplay/UI events can request those reactions.
- Added an Editor-only 6x6 character atlas slicer. It validates evenly divisible dimensions, creates 36 named sprites in top-to-bottom animation-row order, and applies consistent bottom-center pivots and transparent-sprite import settings.
- Standard row mapping: Idle, Walk, Attack, Block, Hurt, then five Death frames plus one Victory frame. This matches the planned first plant-warrior sheet layout.
- Added the Unity setup instructions for slicing, naming, assigning frames, loop settings, and atlas limitations.
- Verification: source files were committed and read back from GitHub. Unity Editor API compatibility, sprite slicing output, C# compilation, and Play Mode behavior have not been tested in this environment.


## 2026-11-13 — Spear melee combat for defensive plants
- Added `MeleePlantCombatController2D` for stationary spear-wielding plants such as the first yellow plant warrior.
- The controller scans a configurable short range using a bounded non-allocating Physics2D query, filters targets by EnemyMarker and Health, applies direct melee damage, and requests the Attack animation.
- Added permanent damage and attack-speed bonus hooks to match the existing plant combat upgrade pipeline.
- Documented prefab setup and target-layer requirements.
- Verification: source was committed and read back through GitHub. Unity compilation, collider/layer behavior, and in-game combat timing remain untested.


## 2026-11-13 — Corrected plant roles and added caveman player controller
- Confirmed the core design rule: plants are stationary grid defenders and do not walk. Their attacks are plant-specific projectiles; the cactus example launches thorns from its mouth.
- Plant projectile targeting now checks lane alignment so a planted defender does not automatically select a monster in a different row.
- Changed the plant 6x6 sheet slicer row order to Idle, Attack, Hurt, Block, Death, Special. Monster and caveman sheets require separate layouts with locomotion.
- Added `CavemanFarmerController2D`: top-down movement inside configurable farm bounds and a directional club swing that damages the nearest valid monster in front of the player.
- Added the core gameplay roles document describing monsters advancing toward the farmhouse, eating crops/attacking animals, the caveman as mobile defender, and the princess as a protected story character at the farmhouse end.
- Verification: GitHub writes and source readback only; Unity compilation, Rigidbody2D setup, input bindings, collisions, and actual combat behavior remain untested.


## 2026-11-13 — Plant atlas and projectile contract correction
- Added a Special animation state and CharacterAnimationDriver2D.PlaySpecial hook to match the stationary plant atlas row.
- Corrected the plant sheet slicer menu label to explicitly identify it as a plant sheet utility.
- Corrected prefab documentation: every planted defender uses its own projectile prefab and visual identity; the cactus example fires thorn projectiles from its mouth. The experimental melee plant controller is no longer recommended for standard plants.
- Corrected the plant animation atlas to Idle, Attack, Hurt, Block, Death, Special with no Walk row.


## 2026-11-13 — Monster farm-target selection and eating/attacking
- Added `FarmDefenseTarget2D` to mark crops, planted defenders, animals, farmhouse, or princess as explicit monster targets with configurable priority and lane tolerance.
- Updated `EnemyMovement2D` to scan nearby farm targets, prefer the highest configured priority (then nearest), stop and attack a blocking target in reach, and continue toward its configured fallback target when no farm target is nearby.
- Farm targets require Health and a Collider2D; assign their layers in the monster's Farm Target Layers mask. Use lane-bound targets for plants/crops and optionally lane-independent targets for larger animals or the farmhouse.
- Verification: source writes and GitHub readback only; Unity compilation, physics overlap behavior, and gameplay balance remain untested.


## 2026-11-13 — Stabilize monster farm-target selection
- Rewrote `EnemyMovement2D` cleanly after detecting literal escaped newline sequences in the previous generated source. The replacement contains the complete target scan method and normal source line breaks.
- Monsters now scan nearby marked farm objects, filter targets by travel direction and lane, choose the highest priority (then nearest), stop to attack blocking targets in range, and resume movement toward their fallback destination after the target is destroyed.
- Documented required Health/Collider2D/FarmDefenseTarget2D setup and suggested target priorities.
- Verification: GitHub write and source readback; Unity compilation and Play Mode physics tests are still required.
