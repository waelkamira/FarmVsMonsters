# Hyena Sprite Sheet Layout

The original PNG artwork under `web/public/assets/characters/monsters/hyena/` is kept unchanged. Phaser slices the sheets at load time; no generated or cropped files are written back to the asset directory.

| Animation | Source image | Image size | Phaser crop | Frames used |
|---|---|---:|---|---:|
| Idle | `hyena-idle.png` | 1080×894 | 3 columns × 3 rows, 360×298 | Up to 4 |
| Walk | `hyena-walk.png` | 1080×894 | 3 columns × 3 rows, 360×298 | Up to 9 |
| Run | `hyena-run1.png` | 1101×894 | 3 columns × 3 rows, 367×298 | 7 (3 + 3 + 1) |
| Jump | `hyena-jump.png` | 1080×894 | 5 frames across row one (216×447), 3 across row two (360×447) | 8 |
| Bite | `hyena-bite.png` | 1080×894 | 3 columns × 3 rows, 360×298 | Frames 6–8 |
| Hit | `hyena-hit.png` | 1080×894 | 3 horizontal frames, 360×894 | Up to 3 |
| Death | `hyena-death.png` | 1080×894 | 3 columns × 2 rows, 360×447 | Up to 6 |

## Run sheet recrop

The updated running artwork is `hyena-run1.png`, not the older `hyena-run.png` sheet. Its canvas is exactly 1101×894, so the correct crop is 367×298 per frame. The seven authored frames occupy the first three cells of row one, all three cells of row two, and the first cell of row three. The final two cells are intentionally unused. The run animation uses all seven frames at 10 FPS.

Dust Skitters now use the run animation throughout their normal advance, making the corrected crop easy to observe during a regular battle. Other hyena types continue using the walk animation.

The jump sheet has an irregular two-row layout. It is loaded as an image and receives eight explicit Phaser texture frames so that each source rectangle matches the authored artwork. Bite, hit, and death are one-shot reactions; idle, walk, and run are movement/standby animations. The hit and death sheets are optional; missing optional sheets do not disable the required hyena artwork.
