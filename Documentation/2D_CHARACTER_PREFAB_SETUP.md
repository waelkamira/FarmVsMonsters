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
4. Assign Idle, Walk, Attack, Hurt and Death clips as they become available.
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


## Standard 6x6 character sheet slicing
The project includes an Editor utility at `Assets/Editor/CharacterSpriteSheetSlicer.cs`.

1. Import the generated PNG anywhere under `Assets/`.
2. Select the texture asset in the Unity Project window.
3. Run **Tools → Farm Vs Monsters → Slice Character Sheet (6x6)**.
4. The utility validates that the image dimensions divide evenly into six columns and six rows, then creates 36 named Sprite sub-assets with bottom-center pivots.
5. The first five rows are named `Idle_01..06`, `Walk_01..06`, `Attack_01..06`, `Block_01..06`, and `Hurt_01..06`. The final row is named `Death_01..05` and `Victory_01`.
6. Drag the resulting Sprite sub-assets into the matching `SpriteAnimation2D.AnimationClip.frames` arrays in playback order. Configure Idle/Walk as looping; Attack/Block/Hurt/Death/Victory as non-looping unless a design specifically requires otherwise.

**Important:** the slicer expects a tightly packed, exact 6x6 atlas with equal-sized cells and no gutters. If the image generator adds borders, uneven cell spacing, or decorative margins, crop/normalize the atlas first rather than accepting misaligned slices. A visually transparent checkerboard is not real alpha transparency.
