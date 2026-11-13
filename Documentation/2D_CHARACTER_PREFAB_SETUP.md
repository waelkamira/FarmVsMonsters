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
1. Add SpriteRenderer and a 2D collider configured as a trigger if required by the projectile implementation.
2. Add Projectile2D and configure its speed, lifetime and hit behavior in the Inspector.
3. Ensure the collider/layer setup is compatible with the project's Physics2D collision matrix.
4. Assign the prefab to PlantCombatController2D. Do not add a 3D Rigidbody or 3D collider to this projectile.

## Battle board
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