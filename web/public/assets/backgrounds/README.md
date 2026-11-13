# Farm battlefield background

Place the generated, approved battlefield image in this folder using this exact filename:

`farm-battlefield.jpeg`

## Required image contract
- JPEG, preferably 2560 × 1440 (16:9), opaque background.
- 2D cartoon farm artwork with a clearly visible perspective planting board.
- House/protected area on the LEFT; monster entrance on the RIGHT.
- The artwork itself must visibly contain five planting lanes and eight columns (40 positions), with the same perspective seams retained.
- Keep all 40 planting cells empty and visually readable.
- No plants, monsters, caveman, princess, UI, text, buttons, health bars, or icons.
- Keep the playable soil area unobstructed.
- The image supplies both the environment and the visible planting-cell artwork. Phaser maps invisible interactive hit regions to those painted cells, then draws characters, plants, monsters, projectiles, HUD, and effects separately.

Do not resize/crop the image after generation without recalibrating the four board corners in Phaser. Gameplay coordinates must follow the image's perspective grid; never overlay a second straight rectangular grid.
