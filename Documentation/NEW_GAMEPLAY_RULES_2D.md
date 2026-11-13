# Farm Vs Monsters — Definitive 2D gameplay rules

These rules supersede conflicting earlier gameplay descriptions and must be applied by every future system.

## Visual and platform direction
- The game is 2D only. No 3D, low-poly, or 3D character pipeline is planned.
- Approved art: original hand-drawn cartoon characters, readable outlines, expressive faces, painted shading, and a warm farm palette. The visual language may evoke classic lane-based cartoon tower defense, but all characters, sprites, animation, UI, and environments remain original.
- The rebuilt browser game uses Next.js + React + JavaScript + Phaser 3. Windows PC is the first play target; mobile and packaged desktop support follow after the core loop is stable.
- The old Unity implementation remains in the repository as a legacy reference during migration. Do not delete it until equivalent systems have been rebuilt and verified.

## Plants
- A defensive plant is rooted to its selected soil cell for its entire life. It never walks, chases, dodges, or changes cells by itself.
- Idle animation is subtle breathing: gentle body rise/fall, leaf movement, blinking, and small expression changes.
- Attacks animate only the relevant anatomy while the root remains fixed: mouth/projectile launch, arm/fist punch, thorn release, spores, fruit, sap, or another plant-specific action.
- Each plant has a distinct attack identity and projectile/impact behavior. A cactus may launch thorns from its mouth; a punch-based plant attacks with its hands. Do not reuse one generic projectile for all plants.
- Plants can take damage, show a hurt reaction, and die in place.

## Monsters
- Monsters are the mobile attacking force. They enter from the side opposite the farmhouse and advance through lanes toward the protected end.
- Their default movement should evoke slow, heavy, slightly awkward zombie-like walking: alternating footfalls, body/head sway, delayed arm swing, and a readable walk cycle. This is an animation reference only; do not copy protected characters or frames.
- The opening stages are deliberately slow. Increase movement speed gradually as waves/stages progress. Fast archetypes are special later-stage variants, not the baseline.
- Monsters stop to attack/eat a plant or another valid farm target in their lane, then continue when it is destroyed. If the lane is clear, they advance toward the farmhouse/princess objective.
- Monster classes can have distinct movement/attack profiles, but the first-stage baseline must remain slow and readable.

## Caveman farmer
- The caveman is responsible for planting defensive plants and tending the farm.
- While one or more living defensive plants remain, the caveman must not attack monsters. Do not trigger club damage, auto-attacks, or combat targeting in this state.
- When the final living defensive plant dies, switch to emergency mode and enable direct club combat.
- The caveman attacks with a physical club swing, not projectiles or ranged weapons.
- If a new defensive plant is successfully planted during emergency mode, immediately return to plant-defense mode and disable the caveman's combat attacks.
- The caveman may still move and perform farming/planting interactions; movement is not permission to attack.

## Battle objective and implementation order
1. Keep the farmhouse and princess at the protected end; monsters enter from the opposite side.
2. Validate stationary planting and plant-specific attacks.
3. Validate slow monster walking and lane targeting.
4. Enforce the final-plant emergency transition and club-only combat.
5. Add enemy archetypes, waves, bosses, structures, farming, and persistence only after the core loop behaves correctly.

## Animation requirements
- Plant: Idle/Breathing, Attack (plant-specific), Hurt, Death, optional Special. No Walk row.
- Monster: Idle, slow Walk, Attack/Eat, Hurt, Death, optional Special.
- Caveman: Idle, Walk, Plant/Interact, Club Attack, Hurt, Death.
- Never stretch one universal animation sheet across every entity type.


## Current prototype interaction scope (2026-11-14)
The first web gameplay slice uses one defender only: the Radish. The player controls the caveman directly. Clicking the Radish card selects it; clicking a valid empty soil cell sends the caveman to that cell, where he performs the planting action. Do not implement instant remote planting from the HUD. The radish remains rooted and attacks independently after planting.
