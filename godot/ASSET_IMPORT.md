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
| `assets/characters/farmer/farmer-plant.png` | `characters/farmer/farmer-plant.png` | Planting action | 6×1, 6 frames; measured 2160×430 |
| `assets/characters/monsters/hyena/hyena-idle.png` | `characters/monsters/hyena/hyena-idle.png` | Shared Stage 1 monster base | 3×1, 3 frames; measured 1080×298 |
| `assets/monsters/hyena/hyena-walk.png` | `characters/monsters/hyena/hyena-walk.png` | Standard monster movement | 3×3, 9 frames; measured 1080×894 |
| `assets/monsters/hyena/hyena-run.png` | `characters/monsters/hyena/hyena-run.png` | Dust Skitter movement | 3×3, 9 frames; measured 1080×889 |
| `assets/monsters/hyena/hyena-bite.png` | `characters/monsters/hyena/hyena-bite.png` | Plant-biting attack | 3×2, 6 frames; measured 1080×894 |
| `assets/monsters/hyena/hyena-hit.png` | `characters/monsters/hyena/hyena-hit.png` | Damage reaction | 3×1, 3 frames; measured 1080×894 |
| `assets/monsters/hyena/hyena-death.png` | `characters/monsters/hyena/hyena-death.png` | Defeat animation | 3×2, 6 frames; measured 1080×894 |
| `assets/plants/radish-level-1.png` | `plants/radish-level-1.png` | Radish idle/attack | 3×3, 9 frames; measured 908×1079 |
| `assets/plants/mushroom.png` | `plants/mushroom.png` | Energy Mushroom | Static image; measured 353×400 |
| `assets/plants/pumpkin.png` | `plants/pumpkin.png` | Pumpkin blocker | Static image; measured 500×500 |
| `assets/plants/pineapple-level-1.png` | `plants/pineapple-level-1.png` | Pineapple idle/attack | 3×3, 9 frames; 1254×1254 source, 418×418 cells |
| `assets/plants/hazelnut-level-1.png` | `plants/hazelnut-level-1.png` | Hazelnut idle/attack | 3×3, 9 frames; 1024×1024 source, 341×341 cells |
| `assets/plants/mango-level-1.png` | `plants/mango-level-1.png` | Mango idle/attack | 3×3, 9 frames; measured 1080×806 |
| `assets/projectiles/radish-bomb.png` | `plants/radish-level-1-bomb.png` | Radish projectile | Static; 70×63 |
| `assets/projectiles/pineapple-bomb.png` | `plants/pineapple-level-1-bomb.png` | Pineapple projectile | Static; 168×103 |
| `assets/projectiles/hazelnut-bomb.png` | `plants/hazelnut-level-1-bomb.png` | Hazelnut projectile | Static; 97×94 |
| `assets/projectiles/mango-bomb.png` | `plants/mango-level-1-bomb.png` | Mango projectile | Static; 163×90 |

## Integration notes

- Atlas frames are generated at runtime with `AtlasTexture`; no source sheet is cropped or overwritten.
- The first atlas cell is used as the resting pose. Remaining cells are played as the plant attack animation on projectile launch.
- The imported hyena sheets are temporarily shared across monster archetypes. Cave Brute/Stonehide/Alpha Brute use walk, bite, hit and death states; Dust Skitter uses the faster run sheet. Archetype-specific tint/scale is only a visual placeholder, not a replacement character design.
- Pineapple uses exact 418×418 cells; Hazelnut uses the original 341×341 integer frame contract (one unused pixel at the far sheet edge).
- The battlefield background is rendered with the Phaser-approved 1120×680 source-canvas transform and its original 8×5 piecewise-bilinear control-point mesh. Input tests the actual 40 cell polygons; plants, monsters and projectiles follow perspective lane points. The background already contains the soil grid, so no second grid is drawn.
- Farmer movement uses the established 115 px/s keyboard speed and 0.78 touch-control speed factor. Planting trips use the Phaser board-coordinate route at 320 px/s, the 6-frame plant action, and a 420 px/s return sprint. Tapping an occupied cell uproots that plant and refunds its full energy cost. Club combat unlocks only after a Radish has been planted and all living Radishes have been lost. The club uses the canonical 42 damage and 112 px reach.
- Re-check frame margins, transparent padding, pivots/baselines, filtering and visual scale before final production sign-off.
