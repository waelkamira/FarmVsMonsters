# Hyena Sprite Sheet Layout

The original PNG artwork under `web/public/assets/characters/monsters/hyena/` is kept unchanged. Phaser slices the sheets at load time; no generated or cropped files are written back to the asset directory.

| Animation | Image size | Phaser frame layout | Frames used |
|---|---:|---|---:|
| Idle | 1080×894 | 3 columns × 3 rows, 360×298 | Up to 4 |
| Walk | 1080×894 | 3 columns × 3 rows, 360×298 | Up to 9 |
| Run | 1101×894 | 3 columns × 3 rows, 367×298 | 7 |
| Jump | 1080×894 | 5 frames across row one (216×447), 3 across row two (360×447) | 8 |
| Bite | 1080×894 | 3 columns × 3 rows, 360×298 | Frames 6–8 |
| Hit | 1080×894 | 3 horizontal frames, 360×894 | Up to 3 |
| Death | 1080×894 | 3 columns × 2 rows, 360×447 | Up to 6 |

The jump sheet has an irregular two-row layout. It is loaded as an image and receives eight explicit Phaser texture frames so that each source rectangle matches the authored artwork. The run sheet contains two unused cells at the end of its final row; only the seven populated frames are played.

Dust Skitters use the jump animation during short hops. Their logical lane position and collision coordinates remain grounded; the hop is visual only and does not let them pass through plants or avoid damage. Bite, hit, and death are one-shot reactions; idle, walk, and run are movement/standby animations. The hit and death sheets are optional; missing optional sheets do not disable the required hyena artwork.
