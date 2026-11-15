# Hyena Sprite Sheet Layout

The original PNG artwork under `web/public/assets/characters/monsters/hyena/` is kept unchanged. Phaser slices the sheets at load time; no generated or cropped files are written back to the asset directory.

| Animation | Image size | Frame layout | Frames |
|---|---:|---|---:|
| Idle | 1080×894 | 2 columns × 2 rows, 540×447 source cells | 4 |
| Walk | 1080×894 | 3 columns × 3 rows, 360×298 | 9 |
| Run | 1101×894 | 3 columns × 3 rows, 367×298 | 7 used |
| Jump | 1080×894 | 5 frames across row one (216×447), 3 across row two (360×447) | 8 |
| Bite | 1080×894 | 3 columns × 3 rows, 360×298; grounded bite cycle uses frames 6–8 | 3 played |
| Hit | 1080×894 | 3 horizontal frames, 360×894 | 3 |
| Death | 1080×894 | 3 columns × 2 rows, 360×447 | 6 |

The jump sheet has an irregular two-row layout. It is loaded as an image and receives eight explicit Phaser texture frames so that each source rectangle matches the authored artwork. The run sheet contains two unused cells at the end of its final row; only the seven populated frames are played.

Dust Skitters use the jump animation during short hops. Their logical lane position and collision coordinates remain grounded; the hop is visual only and does not let them pass through plants or avoid damage. Bite, hit, and death remain one-shot reactions; idle, walk, and run are movement/standby animations.
