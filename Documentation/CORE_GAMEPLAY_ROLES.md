# Core gameplay roles and battle rules

## Farm defense fantasy
The player is a caveman farmer who cultivates crops and raises animals around a beautiful rural farmhouse. The princess sits safely at the far end of the farm, near the farmhouse. Monsters approach from the opposite side and try to reach the farm, eating planted crops and attacking animals and other vulnerable farm targets.

## Unit roles
- **Plants:** stationary defenders placed in grid cells. They never walk. Each plant has its own attack identity and fires its own projectile type or performs a specialized stationary attack. Examples: a cactus spits/launches thorns from its mouth; other plants use their own seed, fruit, sap, spores, or elemental shots. Each plant prefab assigns its own projectile prefab, sprite, damage, speed, cadence, range, and optional status effect.
- **Monsters:** mobile enemies that advance along lanes toward the farm and attack/eat plants, animals, and the protected farm target. Their animation set includes Walk, Attack/Eat, Hurt, and Death.
- **Caveman farmer (main playable hero):** the only regular player-controlled mobile defender. He moves around the farm battlefield and strikes monsters with his club. His animation set includes Idle, Walk/Run, Club Attack, Hurt, and Death.
- **Princess:** a non-combat protected story character located near the farmhouse at the far end of the battlefield. She is not a plant and does not move between defensive grid cells.

## Battle field and win/loss
- Monsters enter from the side opposite the farmhouse and move toward the protected farm area.
- Planted defenders occupy fixed cells and attack monsters in their own lane/range; they do not chase enemies.
- Monsters can stop to eat/attack a plant or animal in reach, then continue advancing when the target is destroyed.
- The caveman can move to intercept monsters and protect vulnerable targets.
- The farmhouse/princess protection objective is the final loss condition. Exact target selection and whether animals/crops have individual health are to be implemented as separate target types, not hard-coded as plants.
- Victory occurs when the planned monster waves are defeated; defeat occurs when the protected farm objective is destroyed or the defense condition fails.

## Animation-sheet rules
- Plant atlas: 6x6 = Idle, Attack, Hurt, Block/Impact, Death, Special. No Walk row.
- Monster atlas: must include a Walk cycle and Attack/Eat, Hurt, Death, plus any special action.
- Caveman atlas: must include Idle, Walk/Run, Club Attack, Hurt, Death, and interactions.
- Do not force every entity into one universal sprite-sheet row mapping; use entity-specific atlas layouts when required.
