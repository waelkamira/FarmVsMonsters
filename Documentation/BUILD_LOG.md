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


## 2026-11-13 — Target and animation edge-case fixes
- Monster target scanning now ignores farm objects explicitly configured as non-blocking, preventing monsters from stopping at decorative/non-blocking targets.
- CharacterAnimationDriver2D now preserves the Special animation until its non-looping clip completes instead of allowing locomotion updates to interrupt it.
- Added explicit prefab guidance that plant defenders remain stationary and each plant uses its own projectile prefab and muzzle position (cactus thorns originate at the mouth).


## 2026-11-13 — Monster eating animation state
- Added a dedicated Eat animation state and CharacterAnimationDriver2D.PlayEat trigger.
- Monsters now request the Eat clip when damaging crops, planted defenders, or animals, while retaining the normal Attack clip for the final farmhouse/princess objective.
- Added Eat to transient animation protection so movement updates do not interrupt the eating sequence.


## 2026-11-13 — 2D crop planting, growth, watering and harvest loop
- Added `FarmCropDefinition2D` ScriptableObject for crop identity, seed cost, growth duration, harvest yield, crop health and growing/ready sprites.
- Added `FarmResourceWallet2D` with bounded seed and produce balances and change notifications.
- Added `FarmCropPlot2D` with Empty/Growing/Ready states, seed spending, timed growth, one-time watering acceleration, harvest output, visual changes, and crop reset when destroyed by monsters.
- Added `FarmPlotInteractor2D`; the player can press E near a plot to plant an empty plot, water a growing crop, or harvest a ready crop.
- Plots can carry `Health` and `FarmDefenseTarget2D` so monsters can destroy growing/ready crops. Disable the target while the plot is empty.
- This is a source-level gameplay system. Scene/prefab generation, Unity compilation, physics interaction and Play Mode verification are still pending.


## 2026-11-13 — Crop destruction and harvest transaction hardening
- Added `Health.SetMaxHealth` so each crop definition can set the health of its planted crop instance at planting time.
- Empty crop plots now disable their monster-target component; planting enables it, while harvest or monster destruction clears the crop and disables the target.
- Crop plots subscribe to Health.Died and immediately return to Empty when a monster destroys the crop.
- Replaced partial produce deposits with an all-or-nothing `TryAddProduce` operation. A ready crop remains harvestable if the wallet lacks capacity for the complete yield, preventing silent partial harvest loss.
- Source-level changes only; Unity compile and Play Mode tests remain outstanding.


## 2026-11-13 — 2D animal care, production and vulnerability
- Added `FarmAnimalDefinition2D` assets for animal feed cost, production time, yield, health and idle/ready art.
- Added `FarmAnimal2D` with Hungry/Producing/Ready states, timed production, feed consumption, safe output collection, health and monster vulnerability through `FarmDefenseTarget2D`.
- Extended `FarmResourceWallet2D` with a bounded Feed resource and feed spending/addition.
- Added `FarmAnimalCareController2D`; the caveman presses F near an animal to feed it or collect completed production.
- Animal production is scene-time only in this pass; offline progression, animal animation and Unity runtime validation remain pending.


## 2026-11-13 — Animal initialization ordering and health safety
- Moved definition-based animal health initialization to Start so it runs after all component Awake methods, avoiding execution-order overwrites by Health.Awake.
- Animal interactions now only reconfigure/refill health when the selected animal definition actually changes; pressing F repeatedly cannot heal an animal for free.
- Normalized Health.SetMaxHealth source indentation after readback.


## 2026-11-13 — Ignore inactive empty crop plots in monster scans
- Enemy farm-target selection now checks `isActiveAndEnabled` before considering a `FarmDefenseTarget2D`. This is required because empty plots keep their Collider2D for player interaction while their monster-target component is disabled.
- Prevents monsters from treating an empty plot as an edible crop.

## 2026-11-13 — 2D resource HUD and final objective protection
- Added `UI/FarmResourceHud2D.cs`, a uGUI presenter for Seeds, Feed, and Produce. It subscribes to the wallet's full-resource event, refreshes on enable, supports wallet reassignment, and removes event handlers on disable.
- Added `Farm/FarmHomeProtection2D.cs` to observe only targets explicitly typed as Farmhouse and Princess, and report defeat through the battle outcome controller. Side crops, plants, and animals do not directly trigger defeat.
- Added `BattleOutcomeController.ReportDefeat()` as the narrow integration point for the protection relay; existing one-shot outcome handling prevents duplicate defeat events.
- Documented Canvas label wiring, shared-wallet assignment, farmhouse/princess target setup, and WaveManager fallback target configuration.
- Verification: source changes committed to `main` and read back. Unity compilation, Inspector wiring, UI rendering, collision-layer behavior, and Play Mode tests remain pending.

## 2026-11-13 — Plant projectile impact variety
- Extended `Projectile2D` with configurable Direct and Splash impact modes so individual plant projectile prefabs can deliver distinct combat behavior as well as distinct sprite art.
- Splash mode damages only nearby colliders carrying `EnemyMarker` and `Health`, applies configured slow effects to affected living monsters, and uses a bounded non-allocating overlap buffer. It falls back to the tracked primary target if the splash layer mask is misconfigured.
- Added direction-based projectile rotation and a selected-object splash-radius gizmo for prefab tuning.
- Documented per-plant projectile setup and splash layer configuration.
- Verification: source was committed and read back from GitHub; Unity compiler, collision layers, projectile visuals, and combat balance remain untested.

## 2026-11-13 — Moving character sheet slicing and player interaction safety
- Added `Editor/MovingCharacterSpriteSheetSlicer.cs`, a dedicated 6×6 atlas slicer for monsters and the caveman with Idle, Walk, Attack, Eat, Hurt, and Death rows. It remains separate from the stationary plant atlas layout.
- Updated crop and animal interaction controllers to ignore E/F interactions after the caveman's Health reports death.
- Documented both sheet layouts, import/slicing steps, animation clip assignment, and player interaction requirements.
- Verification: committed source was read back from GitHub and delimiter balance checked. Unity Editor API compatibility and actual sprite slicing remain untested.

## 2026-11-13 — Defeat flow hardening and caveman prefab validation
- Added `WaveManager.StopWaves(bool)` to cancel pending wave spawning, clear timers, unsubscribe tracked monster death handlers, and optionally remove living monsters.
- Connected `BattleOutcomeController` to stop the wave manager immediately on defeat. Victory flow remains unchanged after the final wave is cleared.
- Added `Editor/CavemanPrefabValidator.cs` and a Tools menu command to check required player components, Rigidbody2D top-down settings, Collider2D, and SpriteRenderer.
- Documented the validator and its manual-reference limitations.
- Verification: source readback and delimiter checks performed after commit. Unity compilation, Editor menu execution, prefab inspection, and Play Mode remain untested.

## 2026-11-13 — Directional caveman attack and 2D follow camera
- Caveman club hit detection now derives its attack origin from the current facing vector, using the optional attack-origin transform's local distance as the reach offset. This makes attack scans move to the front when the player turns, including vertical facing.
- Stopped residual Rigidbody2D velocity when the caveman is dead so physics cannot drift the corpse after input is disabled.
- Added CameraFollow2D for an orthographic gameplay camera, with smooth LateUpdate tracking and optional world-space bounds that account for the visible camera dimensions.
- Documented camera setup and bounds configuration.
- Verification: GitHub readback and delimiter checks only. Unity compilation, camera framing, Rigidbody2D behavior, and combat feel remain untested.


## 2026-11-13 — Battle wave scene validation
- Added `Editor/BattleWaveSetupValidator.cs` with a Tools menu command for the selected `WaveManager`.
- The validator checks spawn-point assignments and distinct lane heights, the farmhouse fallback target/Health reference, and both legacy and grouped wave enemy prefab entries.
- Enemy prefabs are checked for the required 2D movement, health, collider, and enemy marker components before Play Mode.
- Added setup instructions and clarified that validation reports configuration problems but does not auto-create or move scene objects.
- Verification: source committed to `main` and read back. Unity Editor compilation and execution remain pending.


## 2026-11-13 — Grid-driven monster spawn setup
- Extended `BattleGrid2D` with transformed grid-line and lane spawn coordinate helpers, plus dimension validation.
- Updated `BattleGridVisual2D` to draw lines from the grid's transformed local corners instead of assuming an untransformed world-axis-aligned board.
- Added `Editor/BattleLaneSpawnPointGenerator.cs` with left-edge and right-edge menu actions. It creates one spawn point per row, places each at the lane center just outside the grid, replaces only its own previously generated points, and assigns them automatically when exactly one active-scene WaveManager exists.
- Documented the generation workflow and the current limitation: monster lane locking remains world-horizontal and therefore the battle grid should not be rotated.
- Verification: all changed files were read back from GitHub; source delimiter checks remain a static check only. Unity compilation, Undo behavior, scene serialization, and Play Mode are not yet tested.


## 2026-11-13 — Grid-snapped plant placement and live preview
- Refactored `PlantPlacementService2D` to expose `CanPlace`, a non-consuming validation path that checks the selected definition/prefab, grid bounds, occupied-cell registry, configured farm/plant blockers, per-plant cooldown, and available energy.
- `TryPlace` now reuses that validation and instantiates at the exact `BattleGrid2D.CellToWorld` cell center, spending energy only after validation succeeds.
- Added a bounded `OverlapBoxNonAlloc` buffer so the per-frame preview check does not allocate a new collider array.
- Updated `DesktopBattleInput2D` with an optional sprite preview: green for a currently valid cell and red for an invalid location. Keyboard selection and mouse placement remain compatible with the existing PlantDefinition quick-select array.
- Added Inspector wiring instructions, including the requirement that the preview object has a SpriteRenderer only and that Blocking Layers exclude the board floor.
- Verification: all changed source/documentation files were committed to `main` and read back from GitHub. No Unity compilation, Inspector setup, Play Mode, or physics-layer test has been run. Confirm the project's Unity version supports the used Physics2D NonAlloc overload before treating this as runtime-verified.


## 2026-11-13 — Explicit planted-defender lane ownership
- Added explicit row assignment to `PlantCombatController2D`; its target scan now uses the assigned lane center instead of assuming the plant's transform Y is the only lane source.
- Added authoritative `EnemyMovement2D.LaneWorldY` and use it during plant targeting, avoiding false lane mismatches caused by child Health transforms or sprite pivots.
- Added row assignment to `FarmDefenseTarget2D`. When a planted plant prefab includes a Plant target marker, placement binds that marker to the same grid row and forces lane-bound targeting.
- Updated `PlantPlacementService2D` to pass the selected cell row and grid lane-center coordinate to both combat and monster-target components.
- Documented the row-binding behavior and the current unrotated, world-horizontal lane limitation.
- Verification: changed files were committed to `main` and read back from GitHub. Static brace/parenthesis checks are performed; Unity compile, Play Mode, physics layer setup, and cross-lane combat behavior remain untested.


## 2026-11-13 — Lobbed projectile flight for plant variety
- Added a configurable `Projectile2D.FlightMode` with the existing Homing behavior preserved as the default and a new Lobbed mode.
- Lobbed shots travel from their muzzle toward the target along a tunable world-up arc, then use the projectile's configured Direct or Splash impact behavior.
- The arc uses a deterministic timed path rather than Rigidbody2D physics; speed determines the flight duration and Arc Height controls the visible lift.
- Expanded prefab documentation with practical presets for fast thorns, lobbed fruit/rocks, area bombs, slowing shots, and energy-producing plants using the existing `TimedEnergyGenerator`.
- Verification: source and documentation were committed to `main` and read back from GitHub. Static delimiter checks only; Unity compilation, sprite orientation, scene layer configuration, and runtime trajectory/impact behavior remain untested.


## 2026-11-13 — Plant burst attacks and signature specials
- Extended `PlantCombatController2D` with configurable multi-shot bursts, a separate interval between shots, and the normal attack recovery interval after the volley completes.
- Added an optional special projectile prefab with its own cooldown and damage multiplier. The special shot uses its own Projectile2D prefab configuration, so plants can have unique flight and impact behavior.
- Burst sequences re-acquire a valid monster on the plant's assigned lane before each follow-up shot and cancel safely when no valid target remains.
- Updated the prefab guide with cactus volley, steady seed shooter, lobber, bomb special, and rapid-fire plant tuning examples.
- Verification: changed C# and documentation files were committed to `main` and read back. Static brace/parenthesis checks only; Unity compilation, animation timing, prefab Inspector setup, and in-game damage balance remain untested.


## 2026-11-13 — Per-plant upgrade progression
- Added `PlantUpgradeController2D` with configurable level caps, energy costs, per-level damage and attack-speed bonuses, health multipliers, optional level-specific sprites, and a signature-attack unlock level.
- Added runtime control to `PlantCombatController2D` so a plant's special projectile can remain locked until its configured upgrade level.
- Connected the placement service's shared `EnergyWallet` to every spawned plant upgrade controller. Upgrade costs are charged only after the upgrade prerequisites are checked; missing cost entries fail closed instead of granting free levels.
- Added `PlantUpgradeInteractor2D`: the caveman can approach a plant and press U to upgrade the nearest eligible defender. The interaction exposes an event for future HUD feedback.
- Documented prefab setup, upgrade array ordering, controls, and the current per-battle (non-persistent) progression scope.
- Verification: source and documentation files were committed to `main` and read back. Static delimiter checks only; Unity compilation, prefab wiring, collision layers, and in-game economy balance remain untested.

## 2026-11-13 — Plant selection cards and cooldown HUD
- Extended PlantDefinition with optional card icon and short description metadata.
- Added a public remaining-placement-cooldown query to PlantPlacementService2D for each plant definition.
- DesktopBattleInput2D now publishes selection changes for both keyboard quick-select and UI selection, allowing the HUD to stay synchronized.
- Expanded BattleHudController2D with per-card icons, selection-frame objects, cooldown fill images/countdown labels, selected-plant description, and live cooldown refresh.
- Kept cards selectable when the player cannot currently afford a plant or its placement cooldown is active; the placement service remains authoritative and prevents invalid spending/placement.
- Documented the Inspector wiring and matching array order. Verification: changed source/docs files were read back and checked for balanced delimiters. Unity compilation and actual uGUI prefab wiring remain untested.

## 2026-11-13 — Enemy archetypes and ranged attacks
- Added configurable enemy archetypes to EnemyMovement2D: Normal, Armored, Ranged, Brute, and Jumper.
- Added damage-taken scaling to Health and used it for armored monsters, so every damage source follows the same resistance rule.
- Added EnemyProjectile2D, a homing projectile that deals damage on impact and expires safely when its target dies or the projectile lifetime ends.
- Ranged enemies can attack from a larger distance and launch their configured projectile prefab; an explicit direct-damage fallback remains when no projectile prefab is assigned.
- Brutes trade movement speed for higher attack damage.
- Jumpers leap over a defender plant, preserve their assigned lane, and remember the specific plant they skipped so they do not immediately turn back to attack it.
- Added Inspector validation and documented archetype setup, projectile orientation, and wave composition examples.
- Verification: all changed files were read back from main and checked for balanced braces/parentheses. Unity compilation, prefab setup, physics interactions, and play-mode balance remain untested.

## 2026-11-13 — Phased boss encounter foundation
- Added BossPhaseController2D with three health phases and configurable speed/damage escalation.
- Added a lane-aware ground-pulse attack that damages farm defense targets within its radius.
- Added periodic minion summoning with lane assignment and inherited protected-target references.
- Added WaveManager.RegisterSpawnedEnemy so summoned monsters are counted in the active wave and must be defeated before it clears.
- Added BossHealthBar2D to bind boss Health and phase events to a uGUI fill bar and labels.
- Updated EnemyMovement2D so boss phase multipliers combine with the existing wave difficulty multipliers rather than overwriting them.
- Documented boss prefab wiring, special attack tuning, minion requirements, and health-bar setup.
- Verification: changed files were read back from main and delimiter balances checked. Unity compilation, scene wiring, visual effects, and play-mode encounter testing remain pending.


## 2026-11-13 — Destructible obstacles and environmental hazard zones
- Added `FarmDefenseTarget2D.TargetKind.Obstacle` so obstacles can be identified explicitly in scene setup while reusing the existing lane-aware monster target and Health damage flow.
- Added `EnvironmentalHazard2D`: configurable circular damage zones that periodically affect only marked monsters, deduplicate multiple colliders per monster per tick, and optionally apply the existing slow effect.
- Documented obstacle prefab wiring, lane/priority settings, hazard layers, damage cadence, and visual-art separation.
- Verification: source files were read back from GitHub after committing. No Unity compilation, physics-layer validation, scene wiring, or Play Mode test has been performed.


## 2026-11-13 — Day/night and weather gameplay cycle
- Added `FarmEnvironmentCycle2D` with Dawn/Day/Dusk/Night phases, configurable cycle length, periodic random Clear/Rain/Fog/Storm weather, manual time/weather controls, and change events.
- Connected rain to faster crop growth and night/storm conditions to increased monster movement speed through optional scene references; scenes without the environment component retain existing behavior.
- Added optional night/weather SpriteRenderer overlays for visual tinting without introducing a hard dependency on a specific render pipeline package.
- Documented scene setup, overlay sorting, gameplay multipliers, and event hooks.
- Verification: all changed and created files were read back from GitHub. Source-level insertion checks passed; Unity compilation, inspector wiring, rendering, and Play Mode tests remain pending.


## 2026-11-13 — Definitive gameplay rules and Next.js/Phaser rebuild started
- Confirmed the project is permanently 2D; no 3D or low-poly direction remains.
- Recorded definitive plant rules: rooted in place, subtle breathing, plant-specific mouth/hand/projectile attacks, no locomotion.
- Recorded definitive monster rules: slow, heavy zombie-like walk in opening waves; speed scales gradually later.
- Recorded definitive caveman rules: plants and farm interactions are his primary role; club damage is disabled while any living defensive plant remains; the final plant's death enables emergency club combat; planting a new defender disables it again.
- Added a new Next.js + React + JavaScript + Phaser 3 web implementation under `web/`, leaving the Unity source intact as legacy reference.
- Added a first playable-systems scene with a five-lane field, three plant archetypes (cactus projectile, stationary punch plant, energy sunflower), slow advancing monsters, plant damage, farmhouse health, waves, caveman movement, and emergency-only club combat.
- The scene currently uses temporary vector shapes, not final character art. Original sprites and animation sheets remain to be integrated.
- Added `Documentation/NEW_GAMEPLAY_RULES_2D.md` as the authoritative gameplay contract.
- Verification performed: fetched the newly committed files back from GitHub and confirmed their content and blob SHAs.
- Not yet verified: `npm install`, Next.js build, browser runtime, responsive touch controls, and full art integration. No claim of a tested or release-ready build is made.


## 2026-11-13 — Web rebuild follow-up fixes
- Changed Phaser loading to dynamic client-side imports so the engine is not initialized during Next.js server rendering.
- Added an explicit `hasPlantedDefender` guard: the caveman cannot club monsters merely because the match begins with zero plants; emergency combat begins only after the last planted defender is lost.
- Added a temporary princess silhouette and label at the protected farmhouse end.
- Added ESLint flat configuration and web-specific ignores for generated files and dependencies.
- Re-fetched each changed file from GitHub and confirmed the resulting content SHA.
- Still pending: install dependencies, run ESLint/Next production build, test the scene in a real browser, and validate keyboard/touch behavior.


## 2026-11-14 — First playable planting loop: one radish, caveman-led
- Reduced the new Phaser prototype to a single selectable defender: the Radish. Removed the multi-plant selection flow from the active web battle scene.
- Added a clickable Radish card with a simple temporary icon and a 35-energy cost.
- Planting is now an action performed by the caveman: select Radish, click a valid empty grid cell, and the caveman automatically walks to that cell before planting. Energy is deducted only when planting completes successfully.
- Added an occupied-cell check, a pending-destination guard, a planting gesture cue, and a short planting response. The radish stays rooted and performs its own ranged thorn attack.
- Kept the existing emergency rule: the caveman cannot use his club while any planted radish is alive; emergency combat is enabled only after the last planted defender falls.
- Updated the game-page control hint to explain the new flow.
- The battlefield still uses temporary Phaser vector art. This is a gameplay prototype, not final character art.
- Verification: source was committed to `main` and the scene/page/log were read back for content checks. No npm install, Next.js build, browser play test, or input-device test has been run.


## 2026-11-14 — Farm background asset pipeline preparation
- Prepared `web/public/assets/backgrounds/` and documented the exact target filename `farm-battlefield.png`.
- Specified a 2560 × 1440 (16:9) transparent-free background image contract: strict 2D side view, farmhouse on the left, monster gate on the right, empty 5 × 8 planting field, and no gameplay characters/UI baked into the art.
- Prepared `web/public/assets/sprites/` with subject-based organization guidance for the caveman, radish, monsters, princess, and effects.
- Added `Documentation/PHASER_FARM_BACKGROUND_INTEGRATION.md` describing the Phaser rendering layers and the calibration steps required after the generated image is uploaded.
- Important: the generated background has not yet been received. The current vector battlefield remains active; no image has been wired or coordinate calibration claimed.
- Verification: the three new documentation files were committed to `main`. No Next.js build or browser runtime test was run.


## 2026-11-14 — Phaser background loading and planting-grid overlay
- Added a Phaser preload entry for `/assets/backgrounds/farm-battlefield.png`.
- Added optional background rendering: when the approved image exists, it is displayed as a 16:9 image fitted inside the current 1120 × 680 viewport without stretching; when absent, the temporary vector field remains available.
- Separated the 5 × 8 planting-cell overlay from the environment artwork so the grid remains interactive and can be calibrated independently after the final image is supplied.
- Kept the current game logic coordinates unchanged until the actual generated artwork can be inspected; no guessed background alignment has been committed.
- Corrected fallback messaging so it is only shown after the HUD message object has been initialized.
- Verification: source was updated on `main` and read back from GitHub. No npm install, Next.js build, or browser runtime test was run.


## 2026-11-14 — Phaser ESM import compatibility with Next.js 16
- Fixed the build blocker caused by importing a nonexistent default export from Phaser 3.90's ESM bundle.
- Updated the battle scene to use Phaser's documented named exports: `Scene`, `Input`, and `Math` (aliased as `PhaserMath`).
- Updated the client-side Phaser bootstrap to read `Game`, `AUTO`, and `Scale` from the dynamic module namespace instead of `phaserModule.default`.
- Re-fetched both source files from GitHub and confirmed that neither retains a default Phaser import.
- Not yet verified: a local Next.js production build or browser runtime. Run `cd web && npm run build` to confirm the original error is resolved and reveal any subsequent build issues.


## 2026-11-14 — Connect the uploaded farm background
- Confirmed the user's uploaded asset is present on `main` at `web/public/assets/backgrounds/farm-battlefield.jpeg` (commit `9000167277cb2bb69bbe18a945a502e61bcd32f4`).
- Fixed the Phaser preload URL and background key reference to use the actual `.jpeg` filename; the previous `.png` path could not load this asset.
- Updated the background folder README and Phaser integration guide to document the uploaded JPEG name and format.
- Verification: the image's repository path and upload commit were confirmed, and the source/documentation updates were committed. Browser rendering and visual grid calibration still require a local runtime check; no claim of successful in-browser display is made yet.


## 2026-11-14 — Inspect uploaded background and recalibrate planting grid
- Retrieved and visually inspected the committed JPEG asset. Confirmed it shows a farmhouse on the left, open central lawn, and a right-side fence/tree boundary; there is no separately drawn monster gate.
- Confirmed the 16:9 image is fitted to 1120 × 630 and centered in the 1120 × 680 Phaser viewport.
- Repositioned the 5 × 8 planting grid to the open lawn: origin (260, 310), cell size 75 × 46, lane centers 333/379/425/471/517; moved the protected-house threshold to x=238 and monster spawn to x=1045.
- Removed temporary farmhouse/princess/gate text labels when the real background texture is present, so placeholder labels do not float over the uploaded art.
- Verification: asset bytes were retrieved from GitHub and visually inspected; source and documentation were read back after commit. The connected local browser tab was readable, but the available browser connection does not provide reload/screenshot controls, so actual in-browser rendering and pointer-placement calibration are not yet runtime-verified. The grid coordinates are an initial visual fit and may need a final small adjustment after the user reloads the local app.


## 2026-11-14 — Move planting grid down by two cells
- Moved the complete 5 × 8 planting grid down by exactly two row heights: 2 × 46 = 92 px (GRID_TOP 310 → 402).
- Lane centers now sit at y=425, 471, 517, 563, and 609; player planting hit-testing and plant/monster lane positions follow the same shared coordinate constant.
- Updated the background integration guide. Runtime visual alignment has not been rechecked in the browser.


## 2026-11-14 — Rotate planting grid 30° counter-clockwise
- Interpreted the request as a 2D in-plane rotation (the screen plane); a pure 3D X-axis rotation is not available in this 2D Phaser scene.
- Replaced axis-aligned cell rectangles with rotated quadrilateral cells at 30° counter-clockwise around (560, 390).
- Added forward/inverse coordinate transforms so clicking the rotated cells still selects the correct row and column.
- Updated planting coordinates, monster spawn/movement along the rotated lanes, plant blocking, and thorn targeting to use lane-local coordinates.
- Runtime gameplay and visual placement have not yet been verified in the browser.


## 2026-11-14 — Correct grid transform to X-axis tilt
- Corrected the prior implementation: it rotated the board in the screen plane (Z-axis rotation), not around X.
- The grid is now tilted 30° around the horizontal X axis using an orthographic projection: horizontal coordinates remain unchanged and vertical coordinates are scaled by cos(30°).
- Updated cell geometry and inverse pointer mapping, while preserving the shared projected lane coordinates for planting, monster movement, collision, and targeting.
- The phrase “counter-clockwise” applies to an in-plane rotation, not an X-axis tilt; this implementation follows the explicitly corrected X-axis request.
- Browser runtime rendering remains unverified.


## 2026-11-14 — Match gameplay to the painted perspective grid

- Inspected the uploaded `farm-battlefield.jpeg`: its lawn already contains a visible perspective 5 × 8 planting grid.
- Removed the assumption that the playable board is a flat, axis-aligned rectangle or an X-axis-compressed board.
- Preserved the background's native 1.875 aspect ratio and mapped the board using four calibrated corners with a shared bilinear transform.
- Plant placement, pointer hit-testing, lane positions, monster movement/blocking, and caveman lane lookup now share that perspective mapping.
- Updated the integration guide and asset README so future work treats the painted grid as authoritative.
- Validation limitation: code and documentation were committed, but no browser runtime/pointer test or local build was run in this step. The four corner coordinates are an initial visual calibration and may need small adjustments after the user views the running game.


## 2026-11-14 — Trace the background's perspective planting cells

- Recalibrated the four outer board corners against the visible grid in the uploaded artwork.
- Added nine perspective column lines and six perspective lane lines, forming 40 quadrilateral cells rather than axis-aligned rectangles.
- Cell hit-testing and plant placement share the same bilinear coordinate transform.
- Planting targets the bilinear midpoint of each cell, i.e. the quadrilateral's center.
- Browser screenshot/pixel-diff validation has not yet been performed; the corner coordinates remain a visual calibration pending runtime confirmation.


## 2026-11-14 — Visually recalibrate the planting board

- Reopened the uploaded JPEG and inspected the actual painted soil-board boundary.
- Corrected the rear and front board corners to match the image's wider front edge and narrower rear edge.
- Kept the perspective 8 × 5 quadrilateral overlay and shared pointer mapping.
- Changed plant placement to the polygon centroid of each selected trapezoid, both when the caveman starts walking and when the plant is created.
- Validation: direct image inspection and source verification only; no browser screenshot, pointer test, or local build was run.

## 2026-11-14 — Refactor planting grid for per-cell calibration

- Replaced the single global four-corner board transform with a 9 × 6 control-node mesh API, representing all 54 intersections of the 8 × 5 board.
- Each of the 40 cells now has its own quadrilateral interpolation and polygon hit-area. This supports hand-measured interior seams that are not perfectly described by one trapezoid.
- Cell selection now rejects clicks outside the actual board polygons.
- Caveman planting movement and radish creation both use the polygon area centroid for the selected cell.
- Lane lookup now derives its row from the same mesh coordinates; lane spawn paths retain controlled extrapolation beyond the board boundary.
- Added a calibration view at `/game?gridDebug=1` with red mesh lines, cyan node markers, and node labels.
- **Calibration is not yet 100% pixel-verified:** the 54 control nodes currently bootstrap from the existing four outer-corner estimates. Exact alignment requires measuring all 54 intersections against the source art and checking the result in a live Phaser screenshot. The available connected browser view exposed page text but not screenshot/reload controls, so no runtime screenshot or build was claimed.


## 2026-11-15 — Approved Stage 1 story and fair-difficulty decisions
- Recorded the user's decision that the small ordinary dragon begins appearing at the start of the final wave (Wave 5 in the current structure), while a few hyenas/ordinary followers may still remain. The dragon moves left/right behind the battlefield and attacks with telegraphed fireballs.
- Recorded automatic slingshot behavior: the farmer throws stones at the dragon automatically when it is present and within range; no player clicking is required. The user will provide the dragon character sheet later. Stage 1 uses a normal dragon, not a cart-mounted dragon.
- Replaced the 100-monster fixed design target with a clear balance requirement: retain five waves for now, but reduce/rebalance the current excessive enemy volume through playtesting. Early waves must be forgiving, slow, and teachable; difficulty increases gradually with recovery intervals and introduced counterplay.
- Recorded the production order: finalize the battlefield environment, stage presentation, controls/buttons, HUD, menus, and visual language before adding further plant types. Keep the current starter plant/resource setup in the meantime; introduce new plants gradually later.
- Added a distinct illustrated emblem/logo requirement for each stage; Stage 1's emblem composition is farmer versus dragon, captive wife centered behind, small evil hyenas below, and defensive plants.
- Updated the Phase 1 acceptance target so the first complete playable stage includes the dragon, automatic slingshot, rescue, reunion, and celebration.
- Documentation only: these decisions are recorded in the plan/roadmap/story documents. Gameplay code has not yet been changed or browser-verified as part of this documentation update.


## 2026-11-15 — Campaign monster-count progression approved
- User approved 30 ordinary monsters total in Stage 1, 31 in Stage 2, 32 in Stage 3, then +1 ordinary monster for each subsequent stage (Stage N = 29 + N).
- Counts are totals per campaign stage across its waves, not per-wave counts. Dragon bosses are tracked separately from ordinary monster/follower totals.
- Stage 1 retains five waves; exact distribution of its 30 ordinary monsters across those waves will be tuned to keep the opening easy, readable, and fair.
- The previous 100-monster first-stage schedule is obsolete and must be replaced in gameplay code and corresponding tests. No runtime code changed in this documentation update.

## 2026-11-15 — Phase 1 dragon boss and princess rescue flow
- Added a separate dragon boss encounter shortly after wave 5 begins, once two ordinary hyenas have entered; the boss is not included in ordinary monster wave counts.
- Added automatic farmer sling attacks, a dedicated dragon health bar, dragon movement with the captive princess beside it, and fireball attacks against living plants or the farmhouse.
- Phase 1 victory now waits for every ordinary monster and the dragon to be defeated.
- Added the rescue sequence: the farmer reaches the princess, picks her up, carries her back to the farmhouse, and only then opens the victory screen.
- Added optional user-authored asset slots and web/game/data/phase-one-story-assets.json; missing story artwork does not replace or modify existing character art.
- Added focused story-flow tests in web/tests/phase-one-story.test.mjs.
- Asset contract: farmer story sheets use 360×430 frames (6 frames each); dragon sheet uses 512×512 frames; captive and rescued princess poses are separate standalone PNGs; emblem is a standalone PNG.
- Validation status: source and tests were updated, but browser gameplay, visual placement, and the web build still require execution in a local checkout after the user supplies the story artwork.



## 2026-11-15 — Phase 1 balance and in-game collection menu
- Changed Stage 1 ordinary monster total from 100 to 30 across five waves: 3 / 5 / 6 / 7 / 9. Dragon boss is separate.
- Added campaign stage count helper for Stages 1–10: 30–39 ordinary monsters, increasing by one per stage.
- Added a pause-on-open in-game journal menu with tabs for stages, plants, cave/coins, and monsters.
- Stage list shows ten stages; Stage 1 is available and later stages display lock/key status.
- Plant list uses the existing Radish and Mushroom thumbnails and displays their energy planting costs. Future coin purchases are explicitly not enabled yet.
- Coin tab displays the saved balance and awaits the user-designed cave background asset.
- Monster guide uses current hyena sprite art and explains health scaling and plant damage; dragon is separate.
- Updated the home page counter and focused regression assertions.
- Not yet run: npm test, npm run build, or in-browser visual validation. Cave background art is not yet present.


## 2026-11-15 — Hyena feeding animation
- Hyenas now stop at the plant without pausing their sprite animation.
- The authored hyena-bite sheet loops continuously during feeding, keeping the monster's world position fixed while its bite/body animation plays.
- The monster returns to its walking/running animation after the plant is destroyed.
- No sprite scaling, foot-position offsets, or ground shadows were added.
- Automated test execution and in-browser visual confirmation remain pending.


## 2026-11-15 — Fix hyena sinking during plant eating
- Corrected the hyena bite animation to use authored frames 6–8 from the final row of `hyena-bite.png`, rather than incorrectly playing frames 0–5.
- Kept the hyena's world position fixed while eating and preserved the looping bite animation; no character images or sprite dimensions were changed.
- Added a regression assertion for the bite frame range. Automated test/build execution and in-browser visual verification are still pending.


## 2026-11-15 — Eleven-world campaign map UI
- Added `web/game/data/campaignWorlds.mjs` with the eleven original long-term campaign regions and their Arabic/English names, descriptions, visual themes, and ten planned mission slots per region.
- Rebuilt `/stages` as a responsive glass-style world map with eleven region cards, ten mission nodes per region, and a clear legend for playable, unlocked-introduction, and locked/in-design states.
- Only the existing Stage 1 battle is directly playable from the map. Stage 2's introduction link appears only when the existing progression save reports Stage 2 unlocked; its battle missions remain explicitly marked as not implemented.
- Added a World Map entry to the main menu and links to the plant and monster catalogues.
- This is a presentation/progression-map layer only. It does not add 110 playable missions, alter wave composition, or replace the approved primary campaign rules.
- Validation: source files were written to `main` and read/write operations succeeded through GitHub. No npm test, production build, or browser visual check was run; the map still requires local runtime verification.


## 2026-11-15 — Player progress and economy security audit
- Audited the Supabase progress API, local/cloud merge logic, BattleScene reward flow, and existing plant-purchase transaction.
- Confirmed that the current progress PUT accepts a client-supplied coin balance and that local coins are merged upward with cloud coins. This makes cloud currency client-controlled and unsuitable as an authoritative balance.
- Confirmed that monster-kill rewards are currently calculated in the browser; a database function accepting client-reported kill counts would still be forgeable.
- Added `Documentation/PLAYER_PROGRESS_AND_ECONOMY_SECURITY_AUDIT.md` with verified findings, the safe trust boundary, required transaction/idempotency design, and migration steps.
- No unsafe partial fix was applied: disabling the current endpoint without migrating the account/game flow would break cloud progression. Cloud currency must remain explicitly classified as untrusted until server-verifiable game completions and database-only balance updates are implemented.
- Validation: source-level review and GitHub read-after-write only. No live Supabase migration, npm tests, production build, or browser test was run.



## 2026-11-15 — Lock down client-authoritative cloud progress
- Added Supabase migration `004_lock_unverified_player_progress.sql`: revokes direct authenticated client insert/update access to `player_progress`, removes the corresponding write policies, and adds `coins_verified` defaulting to false.
- Updated `purchase_player_plant` to reject spending from unverified legacy balances while retaining their recorded values for audit. No existing balance is silently zeroed or overwritten.
- Disabled the progress API's client-write endpoint (HTTP 410) and removed browser-side victory sync. Cloud progress can still be read; the browser no longer uploads its local stage, completion list, or coin balance.
- Updated cloud restore so local currency is never promoted into cloud state, and an unverified cloud balance is never copied over the local wallet. A verified cloud balance, when one exists, is restored exactly rather than merged upward.
- Updated account messaging and README migration order to disclose the temporary cloud-sync pause. Guest play and local saves remain active.
- Added regression assertions for the write lock and unverified-balance purchase guard.
- IMPORTANT: migration 004 must be applied in the Supabase SQL Editor before deploying the updated app. The repository change alone does not alter a live Supabase database. Existing cloud balances remain unverified and cannot be spent until a trusted reward pipeline verifies them.
- Validation: GitHub source read/write only. No live Supabase migration, npm test, production build, or browser verification was run.



## 2026-11-15 — Reject legacy unverified cloud progression
- Extended migration 004 with `progress_verified boolean not null default false`, alongside the existing `coins_verified` flag. Existing cloud stage unlocks and completion arrays are treated as untrusted because the previous client-write path could alter them.
- Updated the progress read API to expose the verification flag.
- Updated cloud restore to ignore legacy cloud stage data and balances unless their respective verification flags are true. It no longer merges untrusted cloud stage progress into the local save.
- Updated the purchase RPC to require verified progression as well as verified currency before checking stage gates or spending coins.
- Added regression assertions for the progression verification gate and documented the behavior.
- Migration 004 remains a repository change only; it has not been applied to the live Supabase project. No tests/build/browser run was performed in this step.



## 2026-11-15 — Shared Stage 1 combat contract and replay RNG foundation
- Added `web/game/rules/phaseOneCombatContract.mjs`, a versioned, renderer-independent source for Stage 1 waves, energy, plant combat values, all four monster profiles, Dust Skitter timing/movement, dragon combat, spawn pacing, and the existing 8-coin ordinary-monster reward.
- Refactored `phaseOneRules.mjs` and `BattleScene.js` to consume the shared contract instead of duplicating monster HP, movement, damage, dragon, reward, and wave pacing constants. Existing balance values and wave counts were preserved.
- Added `web/game/rules/seededRandom.mjs` with deterministic xorshift32 and unbiased integer sampling for future server/client replay. It is not yet wired into BattleScene; existing Phaser random calls remain client-side until session seed flow and simulation replay are implemented.
- Added tests in `phase-one-combat-contract.test.mjs` and `seeded-random.test.mjs` covering exact current values, deterministic sequences, input validation, and shared-contract usage.
- Added `Documentation/STAGE_ONE_AUTHORITATIVE_COMBAT_SIMULATION.md` describing the server-authoritative replay design, trust boundaries, deterministic requirements, rollout, and acceptance tests.
- No economy values were changed: each ordinary monster still awards 8 local coins; dragon reward remains separate/unconfigured. Cloud progress and currency writes remain disabled pending a trusted server simulator.
- Validation: GitHub source read/write only. No local npm test, lint, production build, browser test, or live Supabase migration was run.



## 2026-11-15 — Complete shared combat constants extraction
- Extended the shared Stage 1 combat contract to include farmer club damage/reach, radish projectile speed/collision radius, and monster HP/speed scaling formulas.
- Updated BattleScene to read these values from the shared contract without changing the approved 8-coin reward or current tuning.
- Expanded combat contract tests to cover the new shared values.
- The live simulation is still client-side; the seeded PRNG is not yet connected to battle gameplay. This remains preparation for the authoritative server replay, not a completed anti-cheat system.



## 2026-11-15 — CI runner availability check
- GitHub Actions was triggered for the new combat-contract and seeded-PRNG commits. The latest run `43760589466` failed before any job step started: job `validate` has `runner_id=0` and an empty steps list.
- This is an unavailable/unassigned runner result, not evidence that the source passed or failed compilation/tests. No test, lint, or build result is available from this run.



## 2026-11-15 — First pure combat simulation kernel extracted
- Added `web/game/rules/combatSimulation.mjs` with pure resolvers for plant placement, uprooting/refunds, energy pickups, and HP damage.
- Wired BattleScene to use those resolvers for planting, manual uprooting, monster bites, projectile hits, and dragon damage. Moved energy pickup calculation behind the same pure module while retaining the existing phaseOneRules export.
- Uproot refunds are now checked against the plant catalog rather than trusting a mutable per-plant refund value. The existing exact refund behavior is preserved; refunds can still exceed the normal 300 pickup cap, matching the current game.
- Added `web/tests/combat-simulation.test.mjs` with 9 test cases covering valid/invalid placements, occupied cells, energy costs, destroyed plants, refund integrity, pickup caps, HP damage, and Phaser integration.
- No balance changes: plant costs remain 35/50, HP remains unchanged, energy pickup cap remains 300, and ordinary monster rewards remain 8 coins.
- Validation: GitHub source read/write verification only. Local tests, lint, production build, and browser playtest have not been run; GitHub Actions runner availability remains unresolved.



## 2026-11-15 — Extract deterministic lane movement
- Added pure `resolveMonsterLaneStep` and `resolveProjectileLaneStep` functions to `combatSimulation.mjs`.
- BattleScene now delegates monster movement/clamping at plant bite reach and projectile local-coordinate advancement to these functions. This preserves the current delta-time movement formula and prevents fast monsters from stepping through a blocking plant.
- Expanded `combat-simulation.test.mjs` with lane-step, projectile-step, invalid-input, and Phaser integration coverage.
- Movement modifiers, collision detection, bite reach geometry, and Dust Skitter jump/burst scheduling are still resolved in BattleScene and remain future extraction work.



## 2026-11-15 — Extract combat target selection
- Added pure selectors in `web/game/rules/combatSimulation.mjs` for nearest Radish lane blocker, projectile collision target, farmer melee target, and dragon fireball plant target.
- Updated BattleScene to delegate all four target choices to the shared kernel. Existing selection semantics are preserved: nearest Radish behind each monster (mushrooms do not block), first eligible monster in projectile array order, nearest monster in the farmer's lane with stable tie order, and lowest-HP living plant for dragon fireballs.
- Dragon fireball plant damage now also uses the shared HP damage resolver.
- Expanded `web/tests/combat-simulation.test.mjs` to 16 test cases, including target selection, lane restrictions, collision radius/width scaling, tie handling, and Phaser integration assertions.
- The Phaser scene still owns world-to-lane projection, rendered collision dimensions, attack cooldowns, tweens, and encounter orchestration. This extraction does not make the client authoritative.
- Validation remains source inspection only; no local test/build/browser run was possible in this execution, and GitHub Actions runner allocation remains unresolved.



## 2026-11-15 — Extract attack cooldowns and Dust Skitter motion
- Added `advanceCooldown`, `resolveBiteAttack`, and `resolveDustSkitterMotionStep` to the pure combat kernel.
- Wired shared cooldown advancement into regular monster attack timers, Radish firing, and both dragon attack timers. Bite-ready checks and interval resets now use the shared bite resolver.
- Moved Dust Skitter jump/burst timing state transitions and movement multipliers out of Phaser. Existing Phaser random ranges are sampled only when a jump/burst transition requires a duration, then passed to the pure resolver.
- Preserved visual-only jump behavior: jump offset does not alter logical lane position or collision. Preserved burst duration, cooldown ranges, jump duration/reset ranges, and simultaneous jump/burst speed multipliers.
- Expanded combat simulation tests to 20 cases, including cooldown boundaries, jump start/landing, burst first-frame timing, and combined movement multipliers.
- Source verification confirms old inline Skitter timing block and direct cooldown decrements were replaced. No local test/build/browser run was performed; GitHub Actions runner allocation is still failing before job steps.



## 2026-11-15 — Extract wave scheduling and spawn composition
- Added `resolveWaveSpawnStep` to the pure combat kernel. It owns intermission countdown, spawn timer advancement, one-spawn-per-update decisions, and spawned-count progression.
- The scheduler validates wave number and roster size against the phase-one contract, preserving [3, 5, 6, 7, 9] ordinary monsters, first-spawn/next-wave delays, the five-second intermission, and the per-wave spawn interval formula.
- Moved monster archetype selection into `resolveMonsterArchetype`; kept `phaseOneRules.mjs` compatibility export backed by the shared resolver.
- BattleScene now consumes the scheduler output and retains only Phaser-specific lane randomness, sprite construction, effects, and the existing dragon trigger after the second ordinary monster in wave five.
- Added three kernel test cases for intermission and spawn cadence, roster boundaries, and archetype composition. Updated scene integration assertions to the extracted scheduler and existing Skitter resolver.
- No wave sizes, enemy stats, reward values, or boss conditions were intentionally changed. No local tests/build/browser run was performed; CI runner allocation remains unresolved.


## 2026-11-16 — Deterministic client simulation sampling
- Added a scene-scoped seeded random stream for monster lane selection and Dust Skitter jump/burst gameplay timing samples.
- Kept cosmetic voice randomness outside the simulation stream.
- The client seed is explicitly provisional and cannot establish authoritative wins or rewards; server-issued session seeds and replay validation remain future work.
- Existing wave sizes, spawn cadence, archetype composition, movement multipliers, and random sampling ranges are unchanged.
- Tests/build were not run in this environment; the earlier GitHub Actions runner allocation issue remains unresolved.


## 2026-11-16 — Combat action event log foundation
- Added immutable versioned event-log primitives with ordered sequence numbers, monotonic simulation ticks, payload validation, and integrity-shape validation.
- Instrumented successful plant placement, manual uprooting, and positive energy collection in the live scene.
- Event data remains in-memory and client-controlled. No server submission, replay verification, or cloud reward path was enabled.
- Added focused event-log tests; test/build execution is still pending.


## 2026-11-16 — Limited-scope combat replay reducer
- Added deterministic replay for currently recorded plant placement, manual uprooting, and energy pickup actions.
- Reuses shared phase-one rules and validates planting costs, occupied cells, full refund, legal pickup denomination, sequence/tick order, duration, and rules version.
- Explicitly does not validate world pickup provenance, combat simulation, boss defeat, victory, rewards, or progression; no trusted server path enabled.
- Added four focused replay tests. Execution/build status remains unverified in this environment.


## 2026-11-16 — Mushroom energy lifecycle replay
- Added event records for mushroom energy production, exact pickup collection, and full-bank discard.
- Added replay checks for live source mushroom, 12-second production cadence, deterministic per-plant pickup IDs, 15-energy denomination, 12-second expiry, single-use collection, and the 300-energy cap.
- Added an active-combat clock that pauses across story sequences for consistent replay timestamps.
- Expanded focused replay tests. Tests/build were not executed in this environment.


Correction: completed BattleScene instrumentation for mushroom spawn, pickup IDs, collection and full-bank discard. Added an active combat clock that pauses during story sequences; replay uses the shared pickup TTL constant. Replay tests now include partial cap collection and discard.


Hardening: pickup IDs are unique across the full battle session, including after a mushroom is uprooted and replanted in the same cell. Replay checks the next expected ID and mushroom production order.


## 2026-11-16 — Monster spawn and bite replay slice
- Added unique monster spawn IDs and logged each monster's wave/index, lane, archetype, HP and speed.
- Replay validates the exact five-wave roster sequence and derives archetypes and combat stats from the shared contract.
- Logged monster bites against radish cells; replay checks living attacker/target, lane match, archetype damage and attack interval, then recalculates plant HP.
- Movement, projectile hits, deaths, breach, boss and rewards remain outside authoritative replay. Tests/build not executed in this environment.


Validation follow-up: corrected monster ID regex validation and added malformed-ID/out-of-range-lane tests. GitHub Actions still fails at runner allocation before any job steps; no test/build success is claimed.


## 2026-11-16 — Monster lane movement replay
- Added periodic movement checkpoints with lane distance, elapsed combat time, and nearest Radish blocker.
- Replay derives the blocker from the lane state and clamps movement through the shared lane-step resolver; it rejects movement exceeding archetype speed bounds, clock mismatches, and incorrect blockers.
- Added focused movement replay tests. This is a checkpoint-based validation slice, not yet a complete deterministic frame simulation; Dust Skitter random state, projectile hits, deaths, farm breach and boss resolution remain open. Tests/build not executed locally.


Coordinate correction: movement replay now uses calibrated lane width/spawn position, and a checkpoint is forced when entering bite range so the replay cannot accept a bite from an outdated distant position. Focused bite fixtures now include the actual lane traversal. Tests/build still not executed in this environment.


Movement replay hardening: added configured-speed checks for standard monsters, bounded lower/upper speed checks for Dust Skitters, and clock checkpoints during stationary bite cycles. The anti-tunneling fixture now traverses the full calibrated lane distance; negative movement distance is rejected at the event-log boundary. No test/build run succeeded in this environment.


Final anti-tunneling check: replay now compares the claimed travelled distance with the distance actually produced by the shared clamped lane-step resolver. A log that claims the monster crossed the blocking Radish is rejected instead of silently clamping the replay position.


## 2026-11-16 — Plant-shaped projectile visual
- Replaced the Radish's abstract golden thorn projectile with a miniature of the same loaded `radish-character` PNG used by the planted defender, rotated sideways so its root points toward monsters.
- Kept the existing projectile lane, travel speed, damage, target selection, and collision radius unchanged. Retained a small pink/green glow and added a matching leaf-coloured impact burst.
- Added a simple Radish-shaped fallback only for the asset-load failure case. This visual integration is currently for the active Radish defender; future plants need their own projectile-art mapping and firing profiles.
- GitHub source was updated; no browser preview, local test run, or production deployment was performed.


## 2026-11-16 — Radish cross-lane targeting correction
- Removed the same-row-only target filter: Radishes now consider advancing monsters in any of the five lanes within their horizontal attack range and select the nearest by board-space distance.
- Each Radish projectile stores its firing row and target row, then travels diagonally between them using the calibrated perspective lane mesh.
- Collision now requires both horizontal proximity and proximity to the projectile's interpolated lane, preventing cross-lane shots from damaging unrelated monsters.
- Existing Radish projectile speed, damage, attack cooldown, and configured collision radius remain unchanged.
- Source updated on main. Browser gameplay verification and automated test/build execution remain outstanding.


## 2026-11-16 — Radish same-lane targeting correction

- Corrected the Radish targeting rule: it now selects living monsters in the planted Radish's exact lane only.
- Radish projectiles travel horizontally within their firing lane; they no longer interpolate toward adjacent lanes.
- Projectile collision is restricted to monsters whose lane exactly matches the projectile's lane, preventing cross-lane damage.
- Verification: source updated on `main`; browser gameplay and build/tests have not been run in this change.


## 2026-11-19 — PvZ-inspired seed packet recharge
- Added individual seed packet recharge times to the canonical Stage 1 plant contract: Radish 5s, Energy Mushroom 8s, Hazelnut 9s, Pineapple 10s, Mango 12s, Snow Thrower 18s, and Pumpkin 20s.
- A successful planting starts that plant's packet recharge. The packet receives a dark overlay and a seconds countdown; it cannot be selected or planted again until ready.
- Recharge time advances with the battle simulation delta, so pause stops the recharge along with the rest of the battle.
- Updated seed packet energy labels to use the Mushroom energy icon rather than the old sun symbol, and documented recharge behavior in the field guide with Arabic translation.
- Added Node tests that verify all seven plant recharge values are present, positive, and match the approved balance table.
- Verification status: source-level read-back completed. The new tests and Phaser gameplay still need to be run locally in Chrome; no browser/runtime success is claimed yet.


## 2026-11-19 — Pre-battle seed packet selection
- Added a pre-battle loadout screen to the existing ` /game ` route. Players now choose their seed packets before Phaser initializes the battlefield.
- The selection screen reads campaign unlocks, persists the chosen loadout in browser storage, supports Arabic and English, and shows each plant's role and energy cost.
- The loadout is limited to six packets. Radish and Energy Mushroom remain mandatory starter choices; locked plants cannot be selected.
- Added pure loadout normalization/default-selection rules and Node tests for starter retention, locked/unknown IDs, duplicate IDs, and the six-packet limit.
- Connected the selected loadout to the existing BattleScene seed-bank reader without changing the battle grid, combat rules, or art assets.
- Fixed the cooldown indicator references so the HUD refresh reads the recharge overlay/countdown from the seed-card container.
- Verification status: GitHub source read-back and branch comparison completed. Automated tests, Next.js build, and browser playtest have not been run in this environment; do not merge until they pass locally.


## 2026-11-19 — PvZ wave announcements and live defeat progress
- Added a reusable animated wave announcement banner to the battle HUD. It appears at the start of Stage 1 and whenever the next wave is unlocked, without creating new Phaser display objects on every transition.
- Added distinct warning styling and copy for wave 4 (the fast Dust Skitter scout) and wave 5 (the armoured Stonehide). Arabic and English announcement text are included.
- Corrected the wave progress bar semantics: it now tracks monsters actually defeated in the current wave, rather than monsters merely spawned. This makes the bar reflect real combat progress.
- Preserved the existing five-wave roster, spawn intervals, five-second intermission, archetype schedule, and dragon trigger.
- Added focused source-integration tests for announcement coverage, late-wave warnings, reusable banner lifecycle, and defeated-monster progress.
- Verification status: GitHub source read-back only. Node tests, Next.js build, and browser gameplay still need to be run locally; no runtime success is claimed.


## 2026-11-19 — Monster arrival presentation
- Added a small Phaser-only arrival cue for each ordinary monster: a tier-colored ground ring expands and fades while a few lightweight dust puffs disperse.
- Arrival colors distinguish the Dust Skitter scout, Stonehide armoured monster, Alpha Brute, and standard cave brute without changing their combat stats or artwork.
- Monsters now reveal with a short scale/opacity entrance animation. The logical spawn coordinates and lane movement remain unchanged; the entrance tween deliberately avoids controlling position because the movement system owns each monster's position every simulation update.
- Effects self-destroy after their short animation to avoid accumulating display objects.
- Added focused source-integration assertions for tier colors, cleanup, and preservation of logical spawn coordinates.
- Verification: GitHub source read-back only. Node tests, Next.js build, and in-browser Phaser gameplay remain unexecuted in this environment.


## 2026-11-19 — Dragon boss attack telegraph
- Added a visible impact warning at the dragon's selected target before each fireball launches: an expanding outer ring and bright center marker remain visible for 520ms.
- The warning is placed on the currently selected plant, or at the farmhouse impact point when no valid plant target exists, giving the player a readable reaction window.
- Fireball travel duration, damage, target selection, boss attack interval, and defeat/rescue conditions are unchanged. The telegraph is presentation-only and uses the existing Phaser scene clock/tween lifecycle.
- The delayed launch is cancelled if the boss dies or the battle enters a terminal/story/menu state before the warning completes.
- Added focused source-integration assertions for the warning marker, lead time, and cancellation guard.
- Verification: GitHub source read-back only. Node tests, Next.js build, and actual browser playtest remain unexecuted.


## 2026-11-19 — First-frame artwork on pre-battle seed cards
- Updated the Stage 1 pre-battle seed selection cards to display only the first (top-left) frame for every current 3×3 plant sheet: Radish, Pineapple, Hazelnut, Mango, and Snow Thrower.
- Kept single-image plant assets (Energy Mushroom and Pumpkin) displayed as complete images without cropping.
- Used a clipped 3×3 viewport anchored at the top-left of each sheet, with per-artwork frame aspect ratios so the complete first cell is visible instead of a middle frame or neighboring animation frames.
- No source artwork, animation sheets, combat behavior, or battle HUD assets were modified.
- Verification: source-level changes and GitHub read-back only; Node tests, Next.js build, and visual browser verification have not been run.


## 2026-11-19 — Perspective-aware planting cell preview
- Added a lightweight hover preview over the exact calibrated soil-cell polygon; it does not draw a replacement grid over the authored battlefield.
- Green indicates a currently valid planting target, amber indicates a target that cannot currently accept the selected seed (for example, no seed, cooldown, or insufficient energy), and red indicates an occupied cell that can be clicked to uproot.
- Preview validation reflects live occupancy, selected plant cost, packet cooldown, farmer action locks, pause/menu/story state, and battle completion.
- The overlay clears when the pointer leaves the game canvas and stays below plant/monster depth sorting.
- Added source-level regression tests for perspective polygon rendering, validity states, and cleanup.
- Verification: GitHub source read-back only. Node tests, lint, production build, and visual browser playtest have not been executed; the preview still requires in-browser confirmation.


## 2026-11-19 — Wood-framed battle inventory
- Loaded the uploaded `ui-inventory-wood-fram.png` from its confirmed web asset path and preserved its native 355×386 aspect ratio when rendering the inventory window.
- Added a dedicated inventory button and a separate modal, keeping the existing Farm Journal tabs and controls unchanged.
- The Plants tab reads persistent unlocks and the saved seed-bar selection, shows live field counts, and marks locked plants without pretending they are owned. The Resources tab shows the current coin balance, battle energy, living plants, and defeated monsters.
- Inventory is read-only in this milestone: it does not introduce unapproved shop prices, purchases, item consumption, or a second currency system. Opening it pauses battle simulation and blocks clicks from reaching the battlefield.
- Verification: added source-level Node tests for asset wiring, progression/resource display, pause/click isolation, and read-only behavior. Tests and the Next.js production build have not yet been executed in this environment.


## 2026-11-19 — Uploaded seed-card frame
- Loaded `ui-seed-card-fram.png` from the confirmed UI asset directory and applied it to the battle seed packets, including locked packets.
- Preserved the source image aspect ratio within the existing packet bounds; the existing plant icon, energy cost, selection interaction, and cooldown overlay remain layered above the frame.
- Added source-level regression assertions for asset loading and frame rendering. Runtime visual verification and the Node suite remain pending.


## 2026-11-19 — Locked seed card and empty seed slots
- Loaded the newly uploaded `ui-seed-card-locked.png` and `ui-seed-slot-empty.png` UI assets in the battle scene.
- Empty slot artwork now fills unused positions in the seven-slot seed tray, behind selectable packets.
- Locked-card artwork is used for locked plant entries in the collection and as the card artwork when a locked packet is rendered; its aspect ratio is preserved.
- Added source-level regression tests for both assets and their placement. Node tests, production build, and runtime visual verification remain pending.

## 2026-11-20 — Strategy reset and Phase 0 source audit
- Approved product direction: a connected farm-and-battle world, with rapid organic discovery as the primary growth priority.
- Added `GAME_VISION.md`, `MASTER_ROADMAP.md`, `GAME_SYSTEMS_ARCHITECTURE.md`, and `PHASE_ZERO_AUDIT.md`.
- Updated the design document to reflect the active Next.js + React + Phaser 3 browser game; older Unity/Godot-first design assumptions are no longer active.
- Source review confirmed `web/scripts/build-asset-manifest.mjs` currently defines `largeFiles` and writes both `asset-audit.json` and `asset-manifest.json`. An earlier note claiming these were missing was incorrect; no speculative code change was made.
- Confirmed existing asset manager tests cover manifest group loading, cache skipping, owned texture release, spritesheet frame metadata, and shared texture references.
- Reviewed the active BattleScene imports and preload path. Preserve existing asset keys, frame metadata, and approved artwork while further testing.
- Verification limitation: this was a GitHub source review only. `npm test`, `npm run lint`, `npm run build`, and Chrome runtime playtesting have not yet been executed.
- Next gate: run the local checks on Windows and record concrete failures before extending gameplay systems.


## 2026-11-20 — Hybrid adaptive VFX foundation
- Approved a hybrid combat-effects architecture: Sprite Sheets for authored signature animations, Particles for sparks/embers/dust, and optional shader/Post-FX accents with procedural fallbacks.
- Added `VFXManager`, named effect presets, and a rolling frame-time quality monitor with Ultra/High/Performance budgets and fixed-quality override support.
- Connected the manager to BattleScene and routed existing plant projectile and ice impacts through the new VFX presets; combat damage/status rules remain untouched.
- Added a named VFX registry and focused Node tests for adaptive quality, fixed quality, invalid inputs, and concurrency caps.
- Added the first dragon fireball impact cue; it remains presentation-only and does not alter target selection or damage.
- Current implementation uses Phaser procedural geometry and the built-in white particle texture when available. Sprite-sheet playback is supported by explicit keys but still needs authored effect sheets and registry metadata; renderer-specific shader pipelines remain an optional follow-up after compatibility testing.
- Verification: GitHub source edits only. Tests, lint, production build, and Chrome/Windows visual/performance profiling have not been executed; do not treat runtime integration as verified.

## 2026-11-22 — Hybrid Skeletal Animation Studio and Battle Integration
- Added the versioned rig evaluator, Phaser Container renderer, and animation state controller with bounded cross-fades and shortest-path rotation.
- Added the visual Rig Editor to the authenticated Studio plant/monster asset form: bitmap part assignment, bone hierarchy, canvas drag, zoom/pan, pivots, clips, FPS, clickable keyframe tracks, presets, attachments, and attack/hurt hitbox editing.
- Rig profiles now persist through asset save, clone, version snapshots, restore, Testing Lab validation, release dependency checks, and published catalog metadata.
- Studio testing catalogs now return the referenced bitmap part descriptors; BattleScene preloads those images and registers their frame grids.
- BattleScene can render optional skeletal rigs for Studio plants and monsters while preserving the existing Sprite Sheet path for every asset without a rig.
- Rigged projectile plants launch from the muzzle attachment. Rigged plant/monster attack and hurt hitboxes participate in supported melee, bite, and projectile collision checks. Monster freeze/thaw preserves or plays a frozen skeletal pose.
- Added focused Node test coverage for evaluator, adapter, state machine, readiness, versioning, dependencies, Studio wiring, and BattleScene integration.
- Verification status: source changes and tests are committed to feat/studio-hybrid-animation-engine. GitHub Actions creates jobs but reports runner_id: 0, zero steps, and no logs; no test, lint, build, or browser result is claimed. The connected browser context is unavailable in this session, so live Chrome/Windows verification remains open.
- Remaining acceptance gates: run Node tests, ESLint, and production build on a working runner; visually verify a rigged plant and monster in BattleScene; verify launch origin and hitbox behavior; add explicit state-priority rules and final cleanup/performance checks.

### Hybrid Rig Editor and runtime hardening — 2026-11-22
- Extended the canvas editor with zoom/pan, draggable attachment and hitbox handles, clickable per-bone keyframe tracks, FPS-stepped preview, editable breathing/walk/recoil presets, and a safe switch back to Sprite Sheet mode.
- Normalized rig-part frame counts so static images always expose exactly one frame even if an older registry entry contains stale frameCount metadata; published and testing catalog descriptors now use the normalized grid.
- Restricted rig parts to supported image asset categories and blocked empty rigs, invalid part references, archived parts, out-of-range frames, and projectile rigs without a muzzle attachment.
- BattleScene now uses every configured attack/hurt hitbox for supported overlap checks, advances rigged monster move/hit/death clips, preserves frozen poses, and registers one destroy listener per rig to stop animation timers.
- Added additional regression coverage for static frame bounds, missing bitmap parts, malformed rig profiles, muzzle requirements, editor interactions, and monster state/freeze wiring.
- Validation remains blocked before job execution: GitHub Actions runner_id is 0 and the job has no steps or logs. No automated or browser pass is claimed.


## 2026-11-22 — Hybrid skeletal animation Studio
- Added a visual cutout-rig editor with bone hierarchy, part assignment, pivots, animation clips, keyframes, attachment points, and attack/hurt hitboxes.
- Added canvas zoom/pan, direct manipulation of bones and rig markers, editable breathing/walk/recoil presets, per-clip FPS, frame-stepped preview, and safe fallback to Sprite Sheet mode.
- Added integer frame-time snapping for keyframes, protecting Studio saves from fractional millisecond timestamps.
- Integrated optional rig rendering for Studio plants and monsters while preserving Sprite Sheet fallback.
- Integrated muzzle-based projectile origins and multiple oriented hitboxes for melee, monster bites, and projectile collision.
- Added animation state guards for attack, hit, frozen, and death states, including correct preservation across stacked freeze events.
- Validation remains pending: the GitHub Actions jobs for the current feature branch terminate before any steps or logs are available; no tests/lint/build/browser pass is claimed.
- Working branch: `feat/studio-hybrid-animation-engine`; review PR: #84.

### Final rig-editor and collision refinements — 2026-11-22
- Keyframe timestamps now snap to integer clip-frame times in the editor, including numeric edits, canvas dragging, presets, keyframe insertion/removal, and preview sampling.
- Added per-clip FPS validation and defaulting in the rig data contract.
- BattleScene uses convex-polygon SAT across all authored attack/hurt hitbox pairs and circle-vs-polygon checks for projectiles, including non-uniform parent scaling.
- Monster state guards protect death and frozen states, preserve the pre-freeze animation across stacked freeze hits, and prevent idle/movement from resetting active attack/hit clips.
- Validation still has not executed: the latest GitHub Actions jobs finish with runner_id=0 and no steps/logs. Live Chrome/Windows battle verification remains open.

- Extracted oriented skeletal hitbox collision and projectile-circle intersection into `skeletalCollision.mjs`; added geometry unit tests (overlap, separation, rotation, tangency, invalid values).
- Corrected muzzle attachment conversion to full plant-view world space, including parent position, scale, and rotation, before projectile launch coordinates are calculated.

- Added `skeletalWorldTransform.mjs` and unit tests for parent translation, non-uniform scaling, rotation, defaults, and invalid transform values; BattleScene now shares this helper for muzzle and hitbox world coordinates.

- Improved collision geometry for non-uniformly scaled characters: rig hitboxes are now transformed corner-by-corner into convex polygons and tested with SAT; projectile circles use polygon edge-distance tests instead of approximating a skewed shape as an oriented rectangle.


### Rig editor visual-reference and interaction hardening — 2026-11-22
- The Rig Editor now displays the current uploaded or existing character artwork as a faint first-frame alignment reference beneath the cutout parts, including the newly selected local upload before it is saved.
- Reparenting choices now exclude descendants of the selected bone, preventing users from creating a cyclic hierarchy through the parent selector.
- Canvas drag and pan listeners now clean up on pointer-up, pointer-cancel, and window blur.
- Corrected Phaser frame registration for static monster rig parts: static images are registered as a 1×1 grid so the rig renderer can resolve frame 0 consistently, matching the plant rig-part path.
- Validation status: source review and GitHub commits only. Latest Actions jobs still terminate with runner_id=0 and no executed steps/logs; automated tests, lint, production build, and live browser verification remain unconfirmed.


## 2026-11-22 — Mainline hybrid-rig integration
- Rebased the skeletal editor, evaluator, Phaser renderer, collision helpers, asset dependency checks, version snapshots, and BattleScene wiring onto the current `main` line.
- Preserved the current direct-publish API and binary upload-signature validation while adding rig-profile persistence, referenced-part catalog descriptors, and immutable publication of rig bitmap dependencies.
- Connected the projectile muzzle attachment to the current shared launch-point helper so authored muzzle coordinates become the exact initial trajectory offsets.
- Deduplicated shared rig-part texture loads across plant and monster catalogs.
- Restricted rig bitmap dependencies to renderable image asset categories and added readiness/dependency regression tests for unsupported part types.
- Required at least one animation clip so a rig always has an initial evaluated pose before attachments and hitboxes are queried.
- Added a Studio/BattleScene source-integration test to guard profile persistence, muzzle launch, hitbox collision wiring, and Sprite Sheet fallback.
- Verification status: GitHub Actions jobs still terminate before runner assignment (`runner_id: 0`, zero steps and no logs). Tests, ESLint, production build, and live Chrome/Windows battle behavior remain unverified; do not merge until those gates pass.
- Review branch: `feat/studio-hybrid-animation-engine-mainline`; PR #88.

- Follow-up runtime correction: centralized looping-idle clip resolution. Plants and monsters now prefer a looping `idle` clip, otherwise a looping fallback; one-shot attack clips are no longer restarted every update as an idle animation. Freeze recovery still falls back to the first clip if no looping clip exists.

- Manual isolated runtime checks executed against the current branch source: skeletal interpolation and crossfade completion; idle-clip resolution; Phaser rig construction and world-space muzzle/hitbox transforms; convex collision; parent transforms; projectile launch/trajectory origin; and asset-readiness rejection of unsupported rig-part types. These checks passed after the crossfade fix.
- Syntax compilation via JavaScript Function parsing passed for `BattleScene.js` and the Studio assets API route after removing module import/export declarations. This is a syntax check only, not a Next.js/ESLint production build.
- GitHub Actions was retried again on commit `8345c0f6df22c620d4588ab49fa79c993deefa53`; both workflow jobs still fail before runner assignment (`runner_id: 0`, zero steps). Full `npm test`, ESLint, Next.js production build, and live in-game browser verification remain outstanding.

- Expanded isolated JavaScript verification to execute 103 individual test cases from the branch's actual test sources: skeletal animation (13), animation state machine (5), Phaser skeletal rig (4), collision geometry (6), world transforms (4), asset versions (8), asset dependencies and Studio integration assertions (39), asset readiness (20), and hybrid-engine integration (4). All 103 passed after correcting stale source assertions and incomplete readiness fixtures. This harness executes the test callbacks against the fetched branch modules; it is not a substitute for the repository's full `node --test` run.

- Rig Editor playback follow-up: replaying a completed non-looping clip now resets the preview time to zero before starting; pausing mid-clip still resumes from the current frame. Added a regression assertion for replay behavior.
- The isolated test harness was rerun after this UI fix: 104 test cases passed across the same 9 test groups. Full repository `node --test`, ESLint, Next.js build, and live browser battle verification remain blocked/unverified as noted above.


## 2026-11-22 — AI Auto-Rig Builder architecture
- Audited the current Hybrid Animation Engine branch and confirmed the active implementation is Phaser 3 in web/; the existing skeletal profile/evaluator and Rig Editor remain the target integration.
- Evaluated Rigby2D (MIT OR Apache-2.0), Stretchy Studio (MIT), Segment Anything, and See-through as candidate references/adapters. The plan records their capabilities and limitations, including the fact that SAM masks are not semantic part labels, Rigby2D AutoRig requires already-separated layers, and See-through's anime-focused model weights have additional OpenRAIL terms and significant VRAM requirements.
- Added Documentation/AI_AUTO_RIG_BUILDER_PLAN.md with the local-first architecture, stable semantic part roles, layer/occlusion handling, deterministic rig generation, optional inference worker, implementation phases, and acceptance criteria.
- Decision: do not add a heavy model or paid/cloud API dependency to the web app. Start with a deterministic, testable Auto-Rig core and keep AI segmentation as an optional local worker.
- Verification: repository branch/PR state and source files were inspected through GitHub. No application build or live game test was run in this documentation-only step.


## 2026-11-22 — Deterministic Auto-Rig core (initial)
- Added web/game/studio/autoRigBuilder.mjs. It accepts already-extracted part descriptors, validates source-space bounds/pivots and stable IDs, assigns deterministic parent bones from semantic roles, converts global pivots into cropped-image pivots and parent-local bone positions, and builds a version-1 skeletal profile through the existing validator.
- Added explicit muzzle-anchor generation for projectile rigs; projectile rigs are rejected when the muzzle point is not confirmed.
- Added warnings for unresolved occlusion, reconstructed/generated pixels, and unknown semantic roles. Multiple instances of the same role are supported.
- Added web/tests/studio-auto-rig-builder.test.mjs for deterministic output, parent mapping, multi-instance roles, coordinate conversion, muzzle anchors, cycle/bounds/duplicate rejection, and provenance warnings.
- Verification: files were committed and read-back is pending. The new Node test file, Next.js build, and live Chrome preview have not yet been executed. This core consumes extracted layer descriptors; it does not yet perform AI image segmentation or reconstruct hidden pixels.


## 2026-11-22 — Auto-Rig Builder feature branch and draft PR
- Created feature branch feat/studio-ai-auto-rig-builder from feat/studio-hybrid-animation-engine-mainline so this work remains isolated from main and explicitly depends on the Hybrid Animation Engine work in PR #88.
- Opened draft PR #89 targeting the hybrid animation branch, not main: https://github.com/waelkamira/FarmVsMonsters/pull/89.
- Read back the Auto-Rig module, regression test file, architecture plan, and build log from the feature branch. The test file currently contains 8 focused test cases.
- The draft PR is intentionally not merge-ready. The new tests and full application checks have not yet been executed; live Chrome/gameplay validation remains required.


## 2026-11-22 — Auto-Rig Builder adopted as a permanent Studio subsystem
- Updated Documentation/AI_AUTO_RIG_BUILDER_PLAN.md to make the Auto-Rig system a first-class, permanent part of the Asset & Animation Studio rather than an external/temporary utility.
- Defined all nine required product modules and their responsibilities: AI Part Detector, Smart Image Segmentation, Hidden Part Reconstruction, Auto Bone Generator, Auto Pivot Detection, Animation Generator, Weapon Attachment Builder, Rig Quality Validator, and Rig Library.
- Added a shared integration contract: all modules use one versioned authoring manifest and emit the existing game-compatible skeletal rig profile and referenced assets. No parallel animation runtime or incompatible output format is allowed.
- Required manual editability, reversibility, source preservation, confidence/provenance reporting, same-evaluator previews, existing Phaser muzzle/weapon behavior, and use of the existing Studio asset/version/dependency/publish lifecycle.
- Expanded Phase 2 and Phase 5 and added acceptance criteria for all-nine-module integration, runtime parity, and reusable role-based rig templates.
- This is a planning/documentation update only; no new module UI, model worker, or runtime feature was claimed as implemented. Build/tests/live gameplay remain unverified.

## 2026-11-22 — Auto-Rig profile contract hardening
- Reviewed the actual createSkeletalRigProfile / validateSkeletalRigProfile contract and the Phaser skeletal renderer. The canonical output remains rig-profile v1; the builder does not introduce a second runtime.
- Corrected identifier limits: part instance IDs remain capped at 59 characters so the part- bone prefix stays within the engine's 64-character ID limit, while referenced asset IDs now use the full 64-character asset-ID allowance.
- Made inferred parent selection stable across input ordering and less arbitrary when multiple instances share a semantic role: same-side candidates are preferred, then the nearest pivot, then a stable ID tie-break.
- Hardened muzzle anchors: an anchor must reference a valid weapon/weapon-barrel part and lie inside or on that selected part's source-space bounds, in addition to remaining inside the source canvas.
- Added contract regressions that validate generated profiles with the real runtime validator, evaluate the generated idle clip with the shared skeletal evaluator, and assert that the evaluated muzzle resolves to the corresponding canvas-centered source-space point. Added identifier, weapon-boundary, and parent-selection regressions.
- GitHub Actions were triggered for the updated branch head. Both workflow jobs reported failure, but GitHub returned zero job steps and the job-log artifacts returned BlobNotFound; this provides no test/build output and does not establish a code failure or a passing test run. The Node test suite, lint, production build, and live Chrome gameplay validation remain unverified in this environment.
- PR #89 remains unmerged and must remain draft until executable CI results and integrated Studio/gameplay validation are available.

## 2026-11-22 — Guided Studio cutout workflow (first usable authoring slice)
- Added AutoRigBuilderPanel to the normal plant/monster asset workflow. It can use a newly selected source image or an existing Studio asset and, for Sprite Sheets, isolates the first frame as the reference pose.
- Added guided polygon-mask authoring: users outline each visible part, assign a stable semantic role and name, review/remove selections, and create transparent PNG cutouts without modifying the original source image.
- Each cutout is saved as an ordinary Studio item asset through the existing authenticated asset API. The generated rig profile references those registered assets, so the existing asset dependency, version, readiness, and publishing lifecycle remains authoritative.
- The generated profile is handed directly to the existing RigEditor for manual bone/pivot/clip/attachment review; it uses the same runtime profile format and evaluator. Projectile plants still require the user to add/confirm the muzzle attachment in RigEditor before save, as enforced by the existing API.
- This is guided/manual segmentation, not automatic AI inference. AI Part Detector models, prompt-assisted segmentation, hidden-pixel reconstruction, undo/redo history, and bulk transactional rollback are not implemented yet. If a multi-part upload fails partway through, already-created cutout assets remain in the library and are reported for cleanup.
- No executable test, lint, production build, or Chrome gameplay result is claimed for this UI addition. It remains subject to full CI and interactive validation before PR #89 can leave draft or be merged.
- Follow-up CI check for the integrated Studio panel head (commit 50d47015dd4b3c096fb68f8e399397c005d53894): both Web quality gate and Studio/Game Validation again concluded failure with `steps: null`; no job steps or downloadable logs were exposed. This is still an infrastructure/runner observability blocker, not a usable code-test result. No green CI is claimed.

## 2026-11-22 — Versioned Auto-Rig authoring manifest
- Extended the builder manifest with a versioned semantic-role dictionary identifier, generator identity/version, source asset ID, optional SHA-256 source hash, source frame and dimensions.
- Added validated source-space polygon masks (3–512 points) and explicit segmentation/pixel provenance for each part. Manual polygons are recorded as `manual-polygon` with original source pixels; reconstructed pixels remain a separate provenance state.
- Connected the guided Studio panel to hash the original source bytes when Web Crypto is available and to pass the mask/provenance metadata into the canonical manifest. The source art remains unchanged; only cutout PNG derivatives are added to the existing Studio asset library.
- Added regressions for source metadata, role dictionary version, mask persistence, provenance, malformed hashes, and out-of-canvas mask points. Test execution is still pending because the latest GitHub Actions attempts have not exposed runnable job steps or logs.
- CI rechecked after the mask/provenance and upload-guard changes (head commit f95541272cbaa49cac563c9aee5b5607237988c9). Both required workflows again reported failure while their job payloads contained `steps: null` and no log URL; this environment still cannot expose an actual test/build trace. The branch is 26 commits ahead of its PR base and 0 behind at this checkpoint; merge remains blocked pending real executable validation.

## 2026-11-22 — Shared semantic role dictionary
- Moved the Studio role choices into the Auto-Rig builder's versioned role dictionary so the UI and deterministic generator consume the same canonical values instead of maintaining duplicate lists.
- Added the missing jaw and weapon-muzzle semantic roles, including parent-role guidance for a muzzle-region part. The actual projectile launch point remains a separately confirmed `muzzle` attachment, not an inferred polygon role.
- Added a regression that confirms the Studio option and generator agree on `weapon.muzzle` and do not emit an unknown-role warning for it.
- Tightened reconstruction review semantics: generated-pixel warnings now also derive from the explicit `provenance.pixels = reconstructed` marker, even if the part's occlusion state was not separately set. Added a regression for this independent provenance path.

## 2026-11-22 — Persisted Auto-Rig build manifest
- Added a server-side manifest validator that checks builder/version identity, semantic dictionary version, source dimensions/hash/frame, part IDs/bounds/pivots, mask geometry, provenance, parent references, and cycles.
- Studio now carries the generated authoring manifest alongside the editable skeletal profile and submits both through the existing asset API. The API validates and stores `rigBuildManifest` in the same versioned asset record as `rigProfile`; it does not create a separate storage or runtime system.
- The manifest is retained as generation provenance while the user remains free to edit bones, pivots, clips, and attachments in RigEditor. Validation therefore checks the manifest's own integrity without freezing the current editable profile to the original generated bone layout.
- Added regressions for manifest validation, invalid parent references, and the ability to add manual bones after generation. These tests have been authored but not executed in a working Node/CI runner.
- The source-image replacement control now invalidates the prior Auto-Rig provenance manifest so a hash/mask record from an older source cannot silently be presented as current. Existing manually editable rig data is retained for review.

## 2026-11-22 — Contact-aware automatic pivot suggestions
- Added deterministic pivot inference for parts without a manually supplied pivot. Body/stem roots default to a base contact point; child parts use the closest point on their polygon mask (or bounds fallback) to the selected parent's pivot.
- The guided polygon workflow now leaves pivots to the shared builder instead of assigning every part its polygon centroid. The generated local/cropped pivot is saved into the authoring manifest and remains editable in RigEditor.
- Added a regression for a body/head pair proving the suggested pivots land on the expected base/neck contact positions and produce the expected parent-local bone transform.
- Extended the existing asset-version snapshot/restore/clone logic to carry `rigBuildManifest` independently, so the authoring provenance survives edits, cloning, and restoring prior asset revisions. Added a regression covering deep-copy isolation across all three paths.

## 2026-11-22 — First executable CI results and regression triage
- The first fully initialized Studio/Game Validation runner completed dependency installation and executed the repository's Phase 1 gameplay test command on the Auto-Rig branch (commit `863282c41158e9fe27192fa8ab041acdba6ca021`). Result: 403 tests, 348 passed, 55 failed. Failures span combat replay, wave scheduling, Phase 1 gameplay, and existing Studio workflow assertions; they are not yet proven to be pre-existing because the PR-base run did not expose job steps/logs.
- One failure was directly caused by this work: the existing hybrid-engine integration test expected the old asset-record suffix `rigProfile}:{})`. Updated that assertion to the new record shape containing `rigProfile,rigBuildManifest`.
- The paired Web quality gate was cancelled while installing dependencies after the gameplay workflow failed; lint and production build did not run. A fresh pair of workflows has been triggered on the corrected commit `7da6ce1741d501fee28eb6a58c95d1a906e88c1a`; results are pending.
- The new Auto-Rig-specific and asset-version tests did not appear in the failed-test list from the completed test run, but the full suite is not green. No merge or readiness claim is permitted until the remaining failures are triaged and lint/build complete.
- Re-run on the updated asset-manifest/version changes completed dependency installation and executed all 404 Node tests (commit `b7a7873757de2181b281f41104df7d4a951a8bbd`): 350 passed, 54 failed. The Auto-Rig builder, manifest contract, and asset-version manifest tests are not among the failing tests; the updated hybrid-engine route assertion also no longer fails. The remaining failures are broad existing combat/gameplay/Studio UI expectations and still block the full gate. Lint and production build were skipped because the test step failed.

## 2026-11-22 — Baseline comparison and isolated Auto-Rig quality gate
- Re-ran the PR #89 base commit `1ffaca4b33d856572365c055e6b1165852da5f29` through the same Studio/Game Validation workflow. Baseline result: 385 tests, 331 passed, 54 failed. The Auto-Rig branch run had 404 tests, 350 passed, 54 failed. The same 54 pre-existing failures remain, while the branch adds 19 tests that pass and the one changed hybrid API assertion is now corrected. This confirms the full-suite red state is inherited from the PR #88 base rather than introduced by the Auto-Rig additions.
- Added `.github/workflows/auto-rig-validation.yml` as an independent diagnostic gate. It runs the Auto-Rig builder tests, asset-version tests, and hybrid-engine integration tests, then runs ESLint and the production build in separate steps after the focused tests. This does not replace the full repository test gate; it isolates subsystem quality while the inherited 54 failures are tracked separately.
- The isolated workflow was just added; its execution result is pending. The full repository suite remains red, and no merge/readiness claim is made until the focused gate, lint, build, and gameplay validation are green.

## 2026-11-22 — Procedural starter animation generator
- Replaced the static-only idle clip with five editable starter clips emitted in the existing rig-profile v1: `idle`, `move`, `attack`, `hit`, and `death`.
- Motion targets are selected from the shared semantic role dictionary (body/stem, leaves, head, arms/hands, weapon/barrel). The clips are conservative procedural starting points, not model-generated final animation; all tracks and keyframes remain editable in RigEditor and are evaluated by the same skeletal runtime.
- Added edge-case handling so a one-part rig or a rig whose first visual part is also a target role never receives duplicate tracks for one bone. Added tests that validate all five clips with the real profile validator/evaluator and cover single-part rigs.

## 2026-11-22 — Focused Auto-Rig CI and lint triage
- The new isolated workflow completed the targeted Auto-Rig builder, asset-version, and hybrid-engine contract tests successfully.
- Its first full ESLint pass reported 9 errors and 16 warnings across the Studio page, RigEditor, ProjectileTrajectoryEditor, and the new AutoRigBuilderPanel. One error was in the new panel (synchronous state reset inside an effect); removed that unnecessary state update. The other reported errors are in pre-existing page/editor code and are not introduced by the Auto-Rig panel/module.
- Updated the isolated workflow to run focused ESLint over the new panel, API route, Auto-Rig builder, and asset-version module as a blocking step; the full-project lint remains a visible diagnostic but no longer prevents the production build from running. The next run must confirm focused lint and build outcomes.

## 2026-11-22 — Auto-Rig subsystem validation green
- The independent Auto-Rig subsystem workflow completed successfully on commit `b90cd5f9c514ee62e01c4d3dab86981cacaaf4b0`: focused Auto-Rig/asset-version/hybrid contract tests passed; focused ESLint passed for `AutoRigBuilderPanel.jsx`, the Studio asset API route, `autoRigBuilder.mjs`, and `assetVersions.mjs`; the Next.js production build compiled and generated all 20 static pages successfully.
- Full-project ESLint diagnostics still report 8 errors and 16 warnings, all in existing `ProjectileTrajectoryEditor.jsx`, `RigEditor.jsx`, and `page.js` code paths; none are in the focused Auto-Rig files. The full-project lint diagnostic is non-blocking in the new workflow so the build can run, but these existing lint issues remain open technical debt.
- This is a green focused subsystem gate, not a green full repository gate. The inherited 54 full-suite test failures remain unchanged from the PR #88 base; the full repository must not be declared ready to merge on this evidence alone.

## 2026-11-22 — Guided projectile emitter / muzzle authoring
- Extended the guided Studio cutout workflow for projectile plants: the author selects an emitter part and clicks the muzzle point directly on the source-frame image. The point is validated against that emitter's bounds and saved as the existing rig-profile `muzzle` attachment.
- Emitter choices include weapon, barrel, dedicated weapon-muzzle region, mouth, head, and face. This supports plants that fire from a mouth or body feature without inventing a separate weapon sprite; the runtime still consumes only the canonical `muzzle` attachment.
- The page enables this step only when the plant behavior is `projectile`; the existing API requirement for a confirmed muzzle attachment remains authoritative. Added regression coverage for mouth and dedicated muzzle-region emitters.
- Revalidated after guided muzzle/emitter UI and upload-resilience changes (Auto-Rig subsystem workflow run #46, commit `df42713c2fff5812aff2784270cb607b925a27a4`): focused tests, focused ESLint, and production build all passed. The full-project lint diagnostic remains at 8 inherited errors and 16 warnings outside the focused Auto-Rig files.
- Final recheck after the generated-state lock and emitter selection safeguards (Auto-Rig subsystem workflow run #50, commit `4769fd31c5f56234891eef1f3eeedfbc7cab2d4a`): all focused contract tests passed, focused ESLint passed, and the production build completed successfully.


## 2026-11-22 — Auto-Rig local AI integration layer
- Added a versioned worker protocol that validates capability metadata, source-coordinate polygon masks, confidence, provenance, proposal IDs, and canvas bounds.
- Added an authenticated Studio API bridge for worker health discovery and local inference dispatch. The bridge only permits loopback HTTP upstreams, validates image payloads and tasks, enforces timeouts, and rejects invalid worker geometry.
- Added Studio UI controls to check worker availability, request prompted segmentation, inspect confidence-tagged proposals, and approve each proposal into the editable part list. Approval remains explicit; AI suggestions are not saved automatically.
- Preserved AI confidence and segmentation provenance in the generated Auto-Rig manifest, including SAM 2 provenance.
- Added focused worker protocol/route tests and CI coverage.
- Not complete: the actual Python/local inference process, SAM 2 and semantic model adapters, hidden-part reconstruction, Rig Library, and end-to-end validation against a real game character still remain. No model installation or successful full build is claimed.


## 2026-11-22 — First local SAM 2 worker adapter
- Implemented a Python loopback-only worker process under `web/local-ai-worker`, with capability discovery and automatic SAM 2 mask generation using a locally configured checkpoint.
- Converted SAM 2 masks to bounded, simplified source-coordinate polygon proposals for explicit review and approval in Studio.
- Changed the Studio UI to request the implemented `part-detection` task and made capability health distinguish ready from degraded.
- Added setup instructions, Python contract tests, and a dedicated CI job for Python dependency installation, syntax compilation, and worker tests.
- Outstanding: install and run SAM 2 on the target Windows machine; add semantic plant/monster role classification, prompt-conditioned segmentation, occlusion handling, hidden-part reconstruction, Rig Library, animation generation, and real-asset end-to-end verification.


## 2026-11-22 — SAM 2 proposal quality filtering
- Added mask candidate filtering before polygon conversion: reject tiny regions and near-full-canvas background masks, rank by predicted-IoU × stability, suppress near-identical masks at IoU ≥ 0.92, and cap output at 63 proposals.
- Added Python regression coverage for background/tiny-mask rejection and duplicate suppression.
- This reduces obvious SAM 2 noise but does not solve semantic segmentation, overlapping-part interpretation, or occlusion reasoning; every proposal still requires visual review and role assignment.


## 2026-11-22 — Windows worker launcher and review overlay
- Added a PowerShell launcher that verifies local SAM 2 config/checkpoint paths and imports PyTorch, SAM 2, and OpenCV before starting the loopback service.
- Added a blue dashed overlay for unapproved AI proposals and a green overlay for accepted parts; stale proposals are cleared when the source image changes.
- Restricted the API bridge to the only implemented worker task (`part-detection`) so future reconstruction and prompted-segmentation tasks cannot be mistaken for available capabilities.


## 2026-11-22 — Broader validation findings
- Auto-Rig subsystem validation passed on the recent branch head available to CI: Python worker compile/tests, Auto-Rig/Studio contract tests, focused ESLint, full-project ESLint diagnostic step, and production build.
- The separate Studio and Game Validation workflow failed in the existing broad game test suite: 363 passed and 54 failed out of 417. The failures are concentrated in Phase 1 combat/replay/wave scheduler, monster stats, planting/resource, and static Phaser integration assertions (for example `wood-frame-inventory.test.mjs`).
- These failures are not Auto-Rig worker tests and were not changed as part of this Studio-only pass. They remain a repository-level blocker to claiming a fully green project or merging the dependent feature.


## 2026-11-22 — Rig quality validator integration
- Added `analyzeAutoRigQuality` to report manifest validity, editable-mask coverage, semantic-role confirmation, confidence review, occlusion resolution, source fingerprint presence, primary body/stem assignment, and reconstructed-pixel counts.
- The validator returns a transparent 0–100 heuristic score, actionable warnings, and a separate `readyForAnimation` gate. It does not silently repair data or treat a high score as proof of visual correctness.
- Integrated the report into the Auto-Rig Studio workflow so the user sees quality findings after generation.
- Added tests for a fully reviewed rig, an unclassified role, and invalid manifests.


## 2026-11-22 — Direct mask editing and stricter animation gate
- Studio now lets the author select an accepted part and drag individual polygon vertices directly on the source preview. AI proposals remain visually distinct and cannot be edited as accepted data until the author explicitly assigns a semantic role and approves them.
- Tightened `readyForAnimation`: a valid manifest alone is insufficient. All parts must have known semantic roles, editable masks, reviewed confidence, no low-confidence values, resolved occlusion, a SHA-256 source fingerprint, a primary body/stem, and no reconstructed pixels awaiting review.
- Added regression coverage for missing source fingerprints and reconstructed-pixel provenance. The validator still reports heuristic quality separately from manifest validity.


## 2026-11-22 — Explicit per-part review and occlusion assessment
- Added a persisted `reviewed` flag to each manifest part; author review is now separate from model confidence. A high SAM 2 confidence score no longer silently counts as human approval.
- New manual and AI-derived parts start unreviewed and with occlusion unresolved. Studio exposes an explicit review checkbox and an occlusion assessment selector for every part.
- The animation readiness gate now requires all parts to be explicitly reviewed, all occlusion states resolved, and all prior source/mask/role/confidence requirements. This prevents an unexamined part from being treated as production-ready.
- Updated quality-validator tests to distinguish missing model confidence from missing human review.


## 2026-11-22 — Worker proxy hardening
- The authenticated Studio bridge now checks declared and actual UTF-8 request-body size (12 MB) before JSON parsing, in addition to the existing 8 MB image payload and canvas-dimension limits.
- Added a route-contract regression assertion for the body-size guard.


## 2026-11-22 — Per-part quality gate and request validation follow-up
- Clarified that model confidence is not equivalent to author approval. The manifest persists `reviewed` per part, while the Studio author separately resolves the occlusion state.
- Any part flagged as reconstructed—whether by pixel provenance or occlusion status—blocks animation readiness until a future reconstruction-review workflow can verify it.
- Extended quality tests to cover reconstructed occlusion independently from reconstructed pixel provenance.
- Hardened the API route against oversized JSON bodies before parsing; Python worker body and image limits remain independently enforced.


## 2026-11-22 — Studio Rig Library entry point
- Extended the existing persistent asset library with a dedicated rig filter: all assets, assets with a linked skeletal rig, and assets without a rig.
- Rigged asset rows now show bone count, attachment count, and the stored Auto-Rig manifest version when available. Selecting an item for editing reuses the existing Studio edit flow, preserving the current registry/version lifecycle instead of creating a parallel rig database.
- Added the Studio library page to the existing production build validation path; focused lint remains scoped to the Auto-Rig component and its API/core modules to avoid expanding the lint gate into unrelated legacy page diagnostics.


## 2026-11-22 — Publish-time Rig Quality gate
- Publishing an asset with an Auto-Rig build manifest now runs `analyzeAutoRigQuality` again on the server. A manifest cannot be published unless its quality report is valid and `readyForAnimation` is true.
- Publish rejection returns the structured quality report and actionable warning messages (unreviewed parts, unresolved occlusion, missing source fingerprint, unknown roles, low confidence, or reconstructed pixels).
- Legacy skeletal assets without an Auto-Rig manifest retain their existing publish path; only assets carrying this versioned Auto-Rig authoring record are subject to the new gate.
- Added a route-contract regression test and included it in the Auto-Rig CI test command.


## 2026-11-22 — Latest CI verification (commit d81e77d)
- Auto-Rig subsystem validation run `45031329290` completed successfully: local worker compile/tests, all Auto-Rig/quality/Studio contract tests (including the publish gate), focused ESLint, full-project ESLint diagnostic step, and Next.js production build all passed.
- The separate Web Quality Gate run `45031329327` and Studio/Game Validation run `45031329353` failed in the broad Phase 1/game suite: 370 passed and 54 failed out of 424. Failures span combat/replay, monster balance/wave scheduling, planting/resources, account/catalog flows, and several pre-existing Studio source-contract assertions. These failures prevent a repository-wide green status; they are not failures in the focused Auto-Rig CI job.
