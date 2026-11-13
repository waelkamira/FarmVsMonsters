# Farm Vs Monsters — Web prototype

This is the new 2D browser-game implementation using Next.js, React, JavaScript, and Phaser 3. The previous Unity implementation remains in the repository as a legacy reference while gameplay systems are rebuilt and migrated; it is not deleted.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000.

## Prototype controls

- `1`: select cactus (ranged thorn attack)
- `2`: select punchroot (stationary close-range punches)
- `3`: select sunflower (generates energy)
- Click an empty soil cell: plant the selected defender
- `WASD` or arrow keys: move the caveman
- `Space`: club attack only after every living defensive plant has been destroyed

## Gameplay invariants

- Plants are rooted to their cell. They only breathe/idle and animate their own attack; they never walk or chase.
- Monsters enter from the right and advance left with a slow, heavy walk cycle. Their speed rises gradually with wave progression.
- The caveman plants defenders and does not attack while at least one defensive plant is alive.
- When the last plant dies, emergency club combat becomes available. Planting a new defender ends emergency combat.
- The farmhouse is the protected objective at the left end of the field.

The current scene uses temporary Phaser-drawn shapes to validate the gameplay loop. Replace these with approved original sprite sheets, frame animations, backgrounds, and effects before art completion.
