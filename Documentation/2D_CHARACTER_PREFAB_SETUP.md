# 2D Character Prefab and Scene Wiring

This is the Unity Inspector wiring guide for the current 2D battle code. It does not replace the required Unity compile and Play Mode verification.

## Shared sprite setup
1. Import the approved transparent character PNG into Assets/Art/Characters/Individual/.
2. Confirm the importer applied Sprite (2D and UI), Single, 100 PPU, Uncompressed, Bilinear, no mipmaps, and Bottom Center pivot.
3. Create a prefab root at the intended ground-contact position.
4. Add a SpriteRenderer to the root and assign the character sprite. Use the project's character sorting layer/order consistently.
5. Add SpriteAnimation2D to the same root. Assign one AnimationClip entry per available state and drag sliced frames in playback order.
6. Set Idle as the starting state. Use loop for Idle and Walk; normally disable loop for Attack, Hurt and Death.

## Monster prefab
Required root components:
- Transform
- SpriteRenderer
- Health
- EnemyMarker
- EnemyMovement2D
- SpriteAnimation2D
- CharacterAnimationDriver2D
- A 2D collider configured for the battle lane and projectile hit detection

Inspector setup:
1. Set Health maximum health for the monster type.
2. Set EnemyMovement2D move speed, attack range, damage and attack interval.
3. Assign the root SpriteRenderer to EnemyMovement2D, or allow it to discover a child SpriteRenderer.
4. Assign Idle, Walk, Attack, Eat, Hurt and Death clips as they become available. The Eat clip is used when the monster damages a crop, plant or animal.
5. Ensure the enemy's 2D collider is on a layer included in plant targetLayers.
6. WaveManager must spawn this prefab and call its 2D target setup so EnemyMovement2D receives the protected target and target Health.

## Plant prefab
Required root components for an attacking plant:
- Transform
- SpriteRenderer
- PlantCombatController2D
- SpriteAnimation2D

Optional health/animation reaction components:
- Health
- CharacterAnimationDriver2D (requires Health and SpriteAnimation2D on the same root)

Inspector setup:
1. Create a child Transform named Muzzle and position it at the mouth/barrel of the plant.
2. Assign Muzzle and the Projectile2D prefab to PlantCombatController2D.
3. Tune attack range, interval, damage and targetLayers.
4. Add an Idle clip; add Attack to show the firing/recoil animation.
5. If the plant can be damaged, add Health and CharacterAnimationDriver2D, then assign Hurt and Death clips.

## Projectile prefab
1. Add a SpriteRenderer and assign the projectile sprite.
2. Add Projectile2D and configure its speed and lifetime in the Inspector.
3. The current Projectile2D homes directly toward its assigned Health target and applies damage on arrival; it does not currently depend on a collider or Rigidbody.
4. Assign the prefab to PlantCombatController2D. Do not add unnecessary 3D physics components.

## Battle board
- Add BattleGrid2D to the board root and add BattleGridVisual2D to the same object to render runtime cell guides. Tune line color, width, sorting layer and sorting order in the Inspector.
- Use an orthographic camera.
- Place BattleGrid2D on the board root and configure the intended columns, rows, cell size and origin.
- Keep the current prototype defaults at 9 columns × 5 rows unless the scene design requires a deliberate change.
- Give the board surface a Collider2D if the desktop input's raycast/placement adapter needs to hit it.
- Place the protected target at the monster approach end and configure the wave manager's target reference.
- Ensure plant placement, monster movement, projectile layers and Physics2D collision settings agree.

## Required smoke test in Unity
1. Open the project with the pinned Unity 6.3 LTS editor version.
2. Wait for import, then resolve all Console compile errors before testing.
3. Spawn one monster and confirm it walks, flips direction correctly, attacks the protected target, reacts to damage and plays Death once.
4. Place one plant and confirm it idles, fires at a marked monster and plays Attack.
5. Confirm projectile damage, slow effect (if configured), monster death and wave completion.
6. Test with missing optional Attack/Hurt clips; the animation driver should fall back to locomotion rather than remain stuck.
7. Only after this passes should the prefab be used in the full wave/battle scene.

## Important wiring constraints
- CharacterAnimationDriver2D must be on the same GameObject as Health and SpriteAnimation2D.
- SpriteAnimation2D requires a SpriteRenderer on that same GameObject.
- EnemyMovement2D and PlantCombatController2D look for CharacterAnimationDriver2D on their own GameObject.
- SpriteAnimation2D frame arrays are assigned in the Inspector after slicing. The code does not slice images automatically.
- No Unity compile, prefab validation, physics validation or Play Mode test has yet been performed.
## Five-lane monster spawning
- Create one spawn Transform per battle row and assign them to WaveManager.spawnPoints in top-to-bottom or bottom-to-top order. The same order should be used consistently for the board and spawn configuration.
- Each 2D monster receives the world Y coordinate of the spawn Transform through EnemyMovement2D.SetLane and is constrained to that lane while moving horizontally.
- Keep spawn transforms at the intended row center. Do not place them above/below the row center and expect the grid to correct the position automatically.
- The protected target should be positioned at the farm-side end of the board. EnemyMovement2D currently approaches the target along X and attacks when within attackRange.
- WaveManager exposes StartDelayRemaining; BattleHudController2D displays the initial countdown before Wave 1.
- Configure at least one non-null wave, one spawn point, and enemy prefabs with Health and EnemyMovement2D. Missing wave/spawn configuration produces a warning and does not silently start.
## Per-wave difficulty tuning
Each Wave entry in WaveManager can independently tune the spawned 2D monsters:
- enemyHealthMultiplier scales both maximum and current health while preserving the current health ratio.
- enemySpeedMultiplier scales horizontal movement speed.
- enemyDamageMultiplier scales melee damage against the protected target.
Keep early waves close to 1.0 and increase values gradually. These are per-wave multipliers, not automatic wave-index scaling; tune each wave deliberately in the Inspector. Values are clamped at runtime to avoid zero or extreme combat stats.

## Wave composition, spawn selection, and rewards
- A wave can use the legacy Enemy Prefabs list (each entry spawns once), the new Enemy Groups list (set a prefab and count), or both. Group counts are clamped to 1–500 at runtime.
- WaveManager supports RoundRobin spawn selection to distribute monsters evenly across configured row spawn points, or Random selection to vary the lane. Random selection avoids choosing the same spawn point twice in a row when multiple points exist.
- Configure spawn points at the center Y of each of the five lanes. EnemyMovement2D locks each spawned monster to that row.
- Set Inter Wave Delay to create a readable pause between cleared waves. The HUD displays the remaining seconds.
- Set Energy Reward On Clear to grant energy only after all tracked enemies in that wave are defeated. The configured EnergyWallet must be assigned to WaveManager.
- Every spawned enemy prefab must have a Health component. Prefabs missing it are logged as errors and destroyed rather than being counted as cleared enemies.


## Standard 6x6 planted-defender sheet slicing
The project includes an Editor utility at `Assets/Editor/CharacterSpriteSheetSlicer.cs`.

1. Import the generated PNG anywhere under `Assets/`.
2. Select the texture asset in the Unity Project window.
3. Run **Tools → Farm Vs Monsters → Slice Plant Character Sheet (6x6)**.
4. The utility validates that the image dimensions divide evenly into six columns and six rows, then creates 36 named Sprite sub-assets with bottom-center pivots.
5. For planted defenders, the six rows are named `Idle_01..06`, `Attack_01..06`, `Hurt_01..06`, `Block_01..06`, `Death_01..06`, and `Special_01..06`. Plants are stationary and must not be given a Walk cycle. Monster and caveman sheets need a separate locomotion-oriented layout.
6. Drag the resulting Sprite sub-assets into the matching `SpriteAnimation2D.AnimationClip.frames` arrays in playback order. Configure Idle/Walk as looping; Attack/Block/Hurt/Death/Victory as non-looping unless a design specifically requires otherwise.

**Important:** the slicer expects a tightly packed, exact 6x6 atlas with equal-sized cells and no gutters. If the image generator adds borders, uneven cell spacing, or decorative margins, crop/normalize the atlas first rather than accepting misaligned slices. A visually transparent checkerboard is not real alpha transparency.


## Plant-specific projectile rule
Use `PlantCombatController2D` for planted defenders. Assign a distinct projectile prefab to each plant type; the prefab's SpriteRenderer supplies that plant's projectile appearance (for example, thorn sprites launched from a cactus mouth). Tune projectile speed, lifetime, damage, range, firing interval, and optional slow effect per plant. Do not attach the caveman's melee controller to a plant. `MeleePlantCombatController2D` is retained as an experimental/legacy component and is not part of the standard planted-defender setup.


## Caveman farmer player prefab
The caveman is the mobile player-controlled defender; planted units never use movement input.
1. Create a player root with `Rigidbody2D` (gravity scale 0, freeze rotation), `Health`, `SpriteRenderer`, `SpriteAnimation2D`, `CharacterAnimationDriver2D`, and `CavemanFarmerController2D`.
2. Set the Rigidbody2D body type to Dynamic and configure collision constraints/layers for the battle arena.
3. Assign the caveman sprite renderer, club attack origin (a child transform near the club head), monster layer mask, movement bounds, club range, damage, and cooldown.
4. The prototype reads Horizontal/Vertical axes and Space through the legacy Input Manager. WASD/arrow keys move; Space swings the club.
5. The caveman animation clip set should include Idle, Walk, Attack (club swing), Hurt, and Death. Do not reuse the plant atlas layout for the caveman.
6. Monsters must have `EnemyMarker`, `Health`, and colliders on a layer included in Monster Layers. A swing damages the nearest monster in front of the caveman within club range.


## Monster farm-target setup (crops, plants, animals, farmhouse)
1. Add `Health`, a Collider2D, and `FarmDefenseTarget2D` to each object monsters may eat or attack.
2. Set Target Kind to Crop, Plant, Animal, Farmhouse, or Princess.
3. Set Monster Priority (higher numbers are preferred); use lane-bound for crops/plants and disable lane-bound for shared targets such as a farmhouse.
4. Put the target collider on a layer included by the monster's Farm Target Layers mask.
5. Keep the monster's fallback Target and Target Health assigned to the final farm objective through `WaveManager`. Nearby marked targets are attacked first; after they are destroyed, monsters resume advancing toward the fallback target.
6. Each monster needs `EnemyMarker`, `Health`, `EnemyMovement2D`, and a Collider2D. Set its spawn point to the intended lane.


## Stationary plant projectile prefabs
Every plant is rooted in its assigned grid cell. Do not add a movement controller or a Walk clip to plant prefabs. Configure each plant's `PlantCombatController2D` with its own projectile prefab and muzzle Transform. For a cactus, place the muzzle at the mouth and use a thorn projectile sprite/prefab. Different plants may use seeds, spores, sap, fruit, or other distinct projectiles, each with its own speed, damage, range, cooldown, and status effect. Ensure the projectile prefab has `Projectile2D` and a visible SpriteRenderer.


## 2D crop plot setup
1. Create a plot root with a Collider2D, `Health`, `FarmDefenseTarget2D`, and `FarmCropPlot2D`. Add a child SpriteRenderer for the crop visual.
2. Set the target kind to Crop, lane-bound to match the plot row, and priority to the desired monster preference. Disable `FarmDefenseTarget2D` initially for empty plots; the plot script enables it when planted and disables it when harvested.
3. Create a `FarmCropDefinition2D` asset via **Assets → Create → Farm Vs Monsters → 2D → Crop Definition**. Assign its growing and ready sprites, seed cost, growth duration, harvest yield and crop health.
4. Add `FarmResourceWallet2D` to the battle scene and assign it plus the crop definition to a `FarmPlotInteractor2D` on the caveman. Add a Collider2D to each plot on a layer included in Plot Layers.
5. Move next to a plot and press E: empty = plant, growing = water once (accelerates growth), ready = harvest into Produce. Starting seed/produce amounts and capacity are configurable on the wallet.
6. The crop definition's Crop Health value is applied to the plot Health component each time a new crop is planted. Put the plot collider on a layer included in both Plot Layers (player interaction) and Farm Target Layers (monster detection).


## 2D animal pen setup
1. Create an animal root with a Collider2D, `Health`, `FarmDefenseTarget2D`, and `FarmAnimal2D`; add a SpriteRenderer for its art.
2. Set the target kind to Animal, choose its lane behavior and monster priority, and include its collider layer in the monster's Farm Target Layers.
3. Create an `FarmAnimalDefinition2D` asset via **Assets → Create → Farm Vs Monsters → 2D → Animal Definition**. Assign idle/ready sprites, feed cost, production duration, produce yield, and health.
4. Add `FarmAnimalCareController2D` to the caveman and assign the shared `FarmResourceWallet2D`, selected animal definition, and animal collider layer.
5. Press F near a hungry animal to spend Feed and start production. Wait for Ready, then press F again to collect Produce. Monsters can attack and kill the animal while it is in the pen.
6. Configure starting Feed on `FarmResourceWallet2D`; Feed and Produce are bounded resources. Animal production currently advances only while the scene is running (no offline production yet).

## Live resource HUD
1. Add a uGUI Canvas to the battle scene and create three Text labels (or TextMeshPro labels with a small adapter) for Seeds, Feed, and Produce.
2. Add `FarmResourceHud2D` to a HUD object, assign the scene's shared `FarmResourceWallet2D`, and connect the three uGUI Text fields.
3. The HUD subscribes to `FullResourcesChanged`, refreshes immediately when enabled, and unsubscribes when disabled. Keep the same wallet assigned to the caveman's `FarmPlotInteractor2D` and `FarmAnimalCareController2D`.
4. This controller currently targets legacy uGUI `Text`; if the project UI uses TextMeshPro, either use uGUI Text for these three labels or add a TMP-specific presentation adapter. Do not attach two resource wallets for the same battle.

## Final farmhouse and princess protection
1. Add `Health`, Collider2D, and `FarmDefenseTarget2D` to the farmhouse root. Set Target Kind = Farmhouse, Lane Bound = off, and Blocks Monster Movement = on.
2. Add the same components to the princess root. Set Target Kind = Princess, Lane Bound = off, and Blocks Monster Movement = on. Position her beside the farmhouse at the protected end of the farm.
3. Add `FarmHomeProtection2D` to the battle manager (or another persistent scene object). Assign the farmhouse target, princess target, and the scene's `BattleOutcomeController`.
4. Assign the farmhouse Transform and Health as the fallback target on `WaveManager`, so monsters continue toward the home after destroying nearby crops, plants, or animals. Include both farmhouse and princess layers in the monster Farm Target Layers mask.
5. The protection relay listens only to the two explicitly typed final objectives. Destruction of a crop, plant, or animal does not directly end the battle. Keep `BattleOutcomeController`'s Protected Target Health assigned to the farmhouse Health if you want the existing direct farmhouse fallback as an additional safety path; the outcome controller ignores duplicate defeat reports after the first result.
6. Ensure the princess is not accidentally assigned Target Kind = Crop/Plant/Animal, and keep the home/princess colliders reachable by the monster target scan.

## Distinct plant projectile behavior
Every planted defender keeps its own `Projectile2D` prefab, SpriteRenderer art, muzzle position, speed, lifetime, damage, and optional slow settings. The projectile now supports two impact modes:
- **Direct** — damages only the monster it tracked. Use for cactus thorns, single seeds, darts, and focused shots.
- **Splash** — damages every marked monster inside the configured Splash Radius at impact. Set Splash Layers to the monster layers only; non-monster colliders are ignored by the component. Use for explosive fruit, seed clusters, or spore bursts.
The splash query uses a bounded non-allocating collider buffer. If its target layer mask is accidentally missing the tracked monster, the projectile still applies its primary hit. Tune each plant's projectile prefab independently; do not make all plants share one generic projectile asset.
