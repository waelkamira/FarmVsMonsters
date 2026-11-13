# Phaser Farm Background Integration

## Purpose
Prepare the 2D Phaser battlefield to receive the generated farm background without baking gameplay objects into the artwork.

## Approved background location
`web/public/assets/backgrounds/farm-battlefield.png`

The public URL used by Phaser will be:
`/assets/backgrounds/farm-battlefield.png`

## Art requirements
- 2560 × 1440 PNG recommended (16:9).
- Strict side-view 2D composition.
- Farmhouse/protected objective at the left.
- Monster gate at the right.
- Five horizontal planting lanes × eight columns.
- Empty planting area: no plants, characters, monsters, UI, labels, or buttons.
- Keep foreground gameplay silhouettes readable.

## Layer ownership
1. Background image: environment art only.
2. Phaser gameplay layer: grid hit areas, plants, caveman, monsters, projectiles, impacts.
3. HUD layer: energy, wave, health, plant selection, messages.

The background must never contain interactive hit targets. The 5 × 8 grid remains data-driven in Phaser.

## Integration checklist after image upload
- [ ] Confirm exact image dimensions and aspect ratio.
- [ ] Inspect the artwork and locate the battlefield bounds.
- [ ] Add the image to the Phaser asset preload pipeline.
- [ ] Scale/crop it to the 1120 × 680 game viewport without distorting characters or cells.
- [ ] Calibrate grid origin, cell width, lane centers, farmhouse target, and monster spawn point to the image.
- [ ] Ensure the caveman, radish, monsters, and projectiles render above the background.
- [ ] Test mouse/touch cell selection against the calibrated grid.
- [ ] Keep a vector fallback if the image fails to load.

## Current prototype coordinates
The current placeholder scene uses a 1120 × 680 viewport and a 5 × 8 grid. The background must be calibrated to the generated image; do not assume the current placeholder coordinates match the final artwork exactly.
