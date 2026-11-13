# Phaser Farm Background Integration

## Purpose
Prepare the 2D Phaser battlefield to receive the generated farm background without baking gameplay objects into the artwork.

## Approved background location
`web/public/assets/backgrounds/farm-battlefield.jpeg`

The public URL used by Phaser will be:
`/assets/backgrounds/farm-battlefield.jpeg`

## Art requirements
- 2560 × 1440 JPEG recommended (16:9).
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

## Uploaded artwork inspection and current grid calibration

The uploaded JPEG was fetched from the repository and visually inspected. It is a colorful farm scene with a farmhouse on the left, an open lawn in the center, and a wooden fence/tree boundary on the right. It does **not** contain a distinct monster gate; monsters currently enter from the right-hand fence edge.

The image is 16:9 and is displayed at 1120 × 630 inside the 1120 × 680 Phaser viewport, centered vertically (25 px top/bottom offset). The interactive planting grid has been moved off the old oversized placeholder coordinates and onto the open lawn:

- Grid origin: x=260, y=402 (moved down by two cell heights)
- Cell size: 75 × 46
- Columns: 8 (right edge x=860)
- Lanes: 5 (bottom edge y=632)
- Lane centers: y=425, 471, 517, 563, 609
- Protected farmhouse threshold: x=238
- Monster spawn: x=1045

These are an initial visual alignment based on the uploaded artwork, not pixel-perfect perspective calibration. The artwork's lawn has perspective and painted paving seams, while the game uses straight horizontal lanes; validate placement in the running browser and adjust the cell bounds if needed.
