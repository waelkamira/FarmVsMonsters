# Godot visual asset import

All imported files are byte-for-byte copies of existing tracked assets. Their originals remain in `web/public/assets/`.

| Godot path | Original source | Use | Frame contract |
|---|---|---|---|
| `assets/characters/farmer/farmer-idle.png` | `characters/farmer/farmer-idle.png` | Farmer idle | 2×2, 4 frames; measured 1080×720 |
| `assets/characters/monsters/hyena/hyena-idle.png` | `characters/monsters/hyena/hyena-idle.png` | Shared Stage 1 monster base | 3×1, 3 frames; measured 1080×298 |
| `assets/monsters/hyena/hyena-walk.png` | `characters/monsters/hyena/hyena-walk.png` | Standard monster movement | 3×2, 6 frames; measured 1080×894 |
| `assets/monsters/hyena/hyena-run.png` | `characters/monsters/hyena/hyena-run.png` | Dust Skitter movement | 3×2, 6 frames; measured 1080×889 |
| `assets/monsters/hyena/hyena-bite.png` | `characters/monsters/hyena/hyena-bite.png` | Plant-biting attack | 3×2, 6 frames; measured 1080×894 |
| `assets/monsters/hyena/hyena-hit.png` | `characters/monsters/hyena/hyena-hit.png` | Damage reaction | 3×2 assumed; measured 1080×894 |
| `assets/monsters/hyena/hyena-death.png` | `characters/monsters/hyena/hyena-death.png` | Defeat animation | 3×2 assumed; measured 1080×894 |
| `assets/plants/radish-level-1.png` | `plants/radish-level-1.png` | Radish idle/attack | 3×3, 9 frames; measured 908×1079 |
| `assets/plants/mushroom.png` | `plants/mushroom.png` | Energy Mushroom | Static image; measured 353×400 |
| `assets/plants/pumpkin.png` | `plants/pumpkin.png` | Pumpkin blocker | Static image; measured 500×500 |
| `assets/plants/pineapple-level-1.png` | `plants/pineapple-level-1.png` | Pineapple idle/attack | 3×3 assumed; verify dimensions and cell gutters |
| `assets/plants/hazelnut-level-1.png` | `plants/hazelnut-level-1.png` | Hazelnut idle/attack | 3×3 assumed; verify dimensions and cell gutters |
| `assets/plants/mango-level-1.png` | `plants/mango-level-1.png` | Mango idle/attack | 3×3, 9 frames; measured 1080×806 |
| `assets/projectiles/radish-bomb.png` | `plants/radish-level-1-bomb.png` | Radish projectile | Static; 70×63 |
| `assets/projectiles/pineapple-bomb.png` | `plants/pineapple-level-1-bomb.png` | Pineapple projectile | Static; 168×103 |
| `assets/projectiles/hazelnut-bomb.png` | `plants/hazelnut-level-1-bomb.png` | Hazelnut projectile | Static; 97×94 |
| `assets/projectiles/mango-bomb.png` | `plants/mango-level-1-bomb.png` | Mango projectile | Static; 163×90 |

## Integration notes

- Atlas frames are generated at runtime with `AtlasTexture`; no source sheet is cropped or overwritten.
- The first atlas cell is used as the resting pose. Remaining cells are played as the plant attack animation on projectile launch.
- The imported hyena sheets are temporarily shared across monster archetypes. Cave Brute/Stonehide/Alpha Brute use walk, bite, hit and death states; Dust Skitter uses the faster run sheet. Archetype-specific tint/scale is only a visual placeholder, not a replacement character design.
- Pineapple and Hazelnut frame slicing is provisional until their sheet dimensions, spacing and frame boundaries are verified in the editor.
- The farm battlefield image is deliberately not imported into the active scene yet: the current straight-grid input coordinates do not match its perspective soil cells. Calibrate the board mapping before using that background.
- Re-check frame margins, transparent padding, pivots/baselines, filtering and visual scale before final production sign-off.
