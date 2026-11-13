# Farm Vs Monsters — Web prototype

This is the 2D browser-game implementation using Next.js, React, JavaScript, and Phaser 3. The older Unity implementation remains in the repository as a legacy reference; the active web prototype is 2D and does not require Unity.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000.

## Current prototype controls

- Click the RADISH card, then click an empty soil cell: the caveman walks there and plants the radish.
- WASD or arrow keys: move the caveman.
- Space: emergency club attack only after all planted defensive plants have been destroyed.
- The radish stays rooted and fires thorns at monsters in its lane.

## Gameplay invariants

- Plants remain fixed in their planting cells. They can breathe/idle and animate their own attacks, but never walk or chase.
- Monsters enter from the right and move left toward the farmhouse.
- The caveman plants defenders and cannot attack while at least one defensive plant is alive.
- When the last plant dies, emergency club combat becomes available. Planting a new defender ends the emergency state.
- The farmhouse is the protected objective at the left end of the field.

## Art assets

- Battlefield background target: `public/assets/backgrounds/farm-battlefield.png`
- Character and effect sprites: `public/assets/sprites/`
- The background must contain environment art only. Phaser draws the grid, plants, caveman, monsters, projectiles, HUD, and effects independently.
- See `../Documentation/PHASER_FARM_BACKGROUND_INTEGRATION.md` for the integration contract.

The current scene still uses temporary Phaser-drawn shapes for the battlefield and characters. The generated background and approved original sprite sheets will be integrated as they are supplied.
