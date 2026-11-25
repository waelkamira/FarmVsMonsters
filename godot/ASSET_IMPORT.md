# Godot visual asset import

All imported files are byte-for-byte copies of existing tracked assets. Their originals remain in `web/public/assets/`.

| Godot path | Original source | Use | Frame contract |
|---|---|---|---|
| `assets/backgrounds/farm-battlefield.jpeg` | `backgrounds/farm-battlefield.jpeg` | Approved battlefield environment | Static JPEG; 1080×599, displayed in the calibrated 1120×597.333 source viewport |
| `data/farm_grid_calibration.json` | `game/data/farm-grid-calibration.json` | 8×5 perspective planting mesh | 6 rows × 9 control points; 40 user-approved cell polygons |
| `assets/characters/farmer/farmer-idle.png` | `characters/farmer/farmer-idle.png` | Farmer idle | 2×2, 4 frames; measured 1080×720 |
| `assets/characters/farmer/farmer-walk.png` | `characters/farmer/farmer-walk.png` | Farmer movement on touch controls | 8×1, 8 frames; measured 2880×430 |
| `assets/characters/farmer/farmer-run.png` | `characters/farmer/farmer-run.png` | Farmer keyboard movement | 6×1, 6 frames; measured 2160×430 |
| `assets/characters/farmer/farmer-attack.png` | `characters/farmer/farmer-attack.png` | Emergency club attack | 6×1, 6 frames; measured 1080×360 |
| `assets/characters/farmer/farmer-plant.png` | `characters/farmer/farmer-plant.png` | Planting action | 6×1, 6 frames at 8 FPS; 360×430 cells, measured 2160×430 |
| `assets/characters/farmer/farmer-uproot.png` | `characters/farmer/farmer-uproot.png` | Uproot action (source bytes currently identical to the plant sheet) | 6×1, 6 frames at 8 FPS; 360×430 cells, measured 2160×430 |
| `assets/characters/farmer/farmer-collect.png` | `characters/farmer/farmer-collect.png` | Energy collection action | 6×1, 6 frames at 8 FPS; 180×360 cells, measured 1080×360 |
| `assets/characters/farmer/farmer-jump.png` | `characters/farmer/farmer-jump.png` | Jump action | 5×1, 5 frames at 6 FPS; 216×720 cells, measured 1080×720 |
| `assets/characters/farmer/farmer-hit.png` | `characters/farmer/farmer-hit.png` | Damage reaction | 6×1, 6 frames at 8 FPS; exact 152×430 cells, measured 914×430 (2 px trailing remainder intentionally unused) |
| `assets/characters/farmer/farmer-death.png` | `characters/farmer/farmer-death.png` | Death action | 6×1, 6 frames at 6 FPS; exact 152×430 cells, measured 914×430 (2 px trailing remainder intentionally unused) |
| `assets/plants/radish-level-1.png` | `plants/radish-level-1.png` | Radish idle/attack | 3×3, 9 frames; measured 908×1079 |
| `assets/plants/mushroom.png` | `plants/mushroom.png` | Energy Mushroom | Static image; measured 353×400 |
| `assets/plants/pumpkin.png` | `plants/pumpkin.png` | Pumpkin blocker | Static image; measured 500×500 |
| `assets/plants/pineapple-level-1.png` | `plants/pineapple-level-1.png` | Pineapple idle/attack | 3×3, 9 frames; 1254×1254 source, 418×418 cells |
| `assets/plants/hazelnut-level-1.png` | `plants/hazelnut-level-1.png` | Hazelnut idle/attack | 3×3, 9 frames; 1024×1024 source, 341×341 cells |
| `assets/plants/mango-level-1.png` | `plants/mango-level-1.png` | Mango idle/attack | 3×3, 9 frames; measured 1080×806 |
| `assets/plants/snow-thrower-level-1.png` | `plants/Snow-thrower-level-1.png` | Snow Thrower idle/attack | 3×3 runtime atlas; measured 1080×869; frame edges/padding still need visual sign-off |
| `assets/projectiles/radish-bomb.png` | `plants/radish-level-1-bomb.png` | Radish projectile | Static; 70×63 |
| `assets/projectiles/pineapple-bomb.png` | `plants/pineapple-level-1-bomb.png` | Pineapple projectile | Static; 168×103 |
| `assets/projectiles/hazelnut-bomb.png` | `plants/hazelnut-level-1-bomb.png` | Hazelnut projectile | Static; 97×94 |
| `assets/projectiles/mango-bomb.png` | `plants/mango-level-1-bomb.png` | Mango projectile | Static; 163×90 |
| `assets/projectiles/snow-thrower-bomb-level-1.png` | `plants/Snow-thrower-bomb-level-1.png` | Snow Thrower freeze projectile | Static; 142×174 |

## Integration notes

- Atlas frames are generated at runtime with `AtlasTexture`; no source sheet is cropped or overwritten.
- The first atlas cell is used as the resting pose. Remaining cells are played as the plant attack animation on projectile launch.
- Pineapple uses exact 418×418 cells; Hazelnut uses the original 341×341 integer frame contract (one unused pixel at the far sheet edge).
- The battlefield background is rendered with the Phaser-approved 1120×680 source-canvas transform and its original 8×5 piecewise-bilinear control-point mesh. Input tests the actual 40 cell polygons; plants, monsters and projectiles follow perspective lane points. The background already contains the soil grid, so no second grid is drawn.
- Farmer movement uses the established 115 px/s keyboard speed and 0.78 touch-control speed factor; club combat unlocks only after the player has planted a defender and all Radishes have been destroyed. The club uses the canonical 42 damage and 112 px reach.
- Re-check frame margins, transparent padding, pivots/baselines, filtering and visual scale before final production sign-off.


## Audio import


## Approved ordinary monster

- `assets/characters/monsters/01/01.png` is the single approved ordinary enemy image, mirrored at `web/public/assets/characters/monsters/01/01.png`.
- The Godot battle loads this image once and uses it for idle, movement, bite, hit, death, and frozen display states until dedicated Monster 01 animation sheets are authored.
