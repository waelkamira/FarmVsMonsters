# Hyena Sprite Sheet Layout

The original PNG artwork is kept unchanged. Phaser loads the walk sheet as an image and registers explicit frame rectangles so the first two rows retain the complete paw silhouettes.

| Animation | Image size | Frame layout | Frames |
|---|---:|---|---:|
| Idle | 1080×894 | 2 columns × 2 rows, 540×447 | 4 |
| Walk | 1080×894 | 3 columns × 3 rows; row starts y=0, 298, 596; heights 310, 310, 298 | 9 |
| Run | 1101×894 | 3 columns × 3 rows, 367×298 | 7 used |
| Jump | 1080×894 | Retained as an unused source asset | 8 |
| Bite | 1080×894 | 3 columns × 2 rows, 360×447 | 6 |
| Hit | 1080×894 | 3 horizontal frames, 360×894 | 3 |
| Death | 1080×894 | 3 columns × 2 rows, 360×447 | 6 |

The walk sheet's first two frame rows extend 12 pixels into the transparent gap below each row. This prevents the paws from being clipped while keeping the three columns aligned. The run sheet contains two unused cells at the end of its final row; only the seven populated frames are played.

The jump asset is not loaded, registered, or played by the current game build. Monster locomotion is restricted to walk and run. The source artwork faces right, so the in-game sprite is horizontally flipped to face the farmhouse on the left. No ground shadow is created beneath hyenas.
