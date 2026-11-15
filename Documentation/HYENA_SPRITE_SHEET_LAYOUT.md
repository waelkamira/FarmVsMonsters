# Hyena Sprite Sheet Layout

The original PNG artwork is kept unchanged. The walk sheet is an exact 3-column × 3-row grid, so Phaser can slice it directly without custom rectangles or overlapping adjacent rows.

| Animation | Image size | Frame layout | Frames |
|---|---:|---|---:|
| Idle | 1080×894 | 2 columns × 2 rows, 540×447 | 4 |
| Walk | 1080×894 | 3 columns × 3 rows, 360×298 | 9 |
| Run | 1101×894 | 3 columns × 3 rows, 367×298 | 7 used |
| Jump | 1080×894 | Retained as an unused source asset | 8 |
| Bite | 1080×894 | 3 columns × 2 rows, 360×447 | 6 |
| Hit | 1080×894 | 3 horizontal frames, 360×894 | 3 |
| Death | 1080×894 | 3 columns × 2 rows, 360×447 | 6 |

The walk sheet uses Phaser's regular 360×298 frame grid. Each of the nine frames is read from its own cell; no frame extends into the next row. The run sheet contains two unused cells at the end of its final row; only the seven populated frames are played.

The jump asset is not loaded, registered, or played by the current game build. Monster locomotion is restricted to walk and run. The source artwork faces right, so the in-game sprite is horizontally flipped to face the farmhouse on the left. No ground shadow is created beneath hyenas.
