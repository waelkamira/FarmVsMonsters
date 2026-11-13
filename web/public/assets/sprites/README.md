# Character and object sprites

Keep original artwork supplied for Farm Vs Monsters in this directory, organized by subject:

- `caveman/` — player animations
- `plants/radish/` — radish plant animations
- `monsters/` — monster animations
- `princess/` — princess artwork
- `effects/` — projectiles, impacts, particles

Use transparent PNG sprite sheets. Do not flatten characters into the battlefield background.

Suggested animation states:
- Caveman and monsters: idle, walk, attack, hurt, death.
- Plants: idle, attack, hurt, impact, death, special. Plants do not have a walk animation because they remain rooted in their cells.

Record each sheet's frame count, columns, rows, frame dimensions, and animation frame rate in its subject folder before wiring it into Phaser.
