# Hyena Sprite Sheet Layout

The original PNGs in `web/public/assets/characters/monsters/hyena/` are kept unchanged. Phaser slices each sheet at load time; no generated or cropped files are written back to the asset directory.

| Animation | Image size | Frame layout | Frames |
|---|---:|---|---:|
| Idle | 1080×894 | 2 columns × 2 rows, 540×447 | 4 |
| Walk | 1080×894 | 3 columns × 3 rows, 360×298 | 9 |
| Run | 1101×894 | 3 columns × 3 rows, 367×298 | 7 used |
| Jump | 1080×894 | 5 frames across the first row, 3 across the second | 8 |
| Bite | 1080×894 | 3 columns × 2 rows, 360×447 | 6 |
| Hit | 1080×894 | 3 horizontal frames, 360×894 | 3 |
| Death | 1080×894 | 3 columns × 2 rows, 360×447 | 6 |

The jump sheet is intentionally registered as an image and receives eight explicit Phaser texture frames because its two rows use different frame widths. The run sheet contains two unused cells at the end of its final row; only the seven populated frames are played.

All hyena artwork faces right in the source files, so the in-game sprite is horizontally flipped to face the farmhouse on the left. The sprite animation is visual only: existing lane movement, collision, attack timing, archetype balance, and coin rewards remain authoritative.
