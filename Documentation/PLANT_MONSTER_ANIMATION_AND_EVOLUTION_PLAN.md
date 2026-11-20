# Plant & Monster Animation and Evolution Plan

## Product direction

FarmVsMonsters should feel like a living, expressive farm battlefield. Plants and monsters must communicate personality through motion, readable combat reactions, and visible progression. The goal is to learn from the clarity and charm of the Plants vs. Zombies genre while building original FarmVsMonsters characters, animation language, and effects.

This plan is additive. Preserve approved artwork, the current Phaser 3 runtime, existing combat rules, and the VFX Engine. Godot remains out of scope.

## Existing foundation audited

- The active game is Phaser 3 in `web/`; Godot is archived/experimental.
- `BattleScene.js` already registers several authored plant throw animations and hyena idle/walk/run/bite/hit/death animations.
- The hybrid VFX runtime is in `web/game/vfx/`, with a registry, event bus, renderer, object pool, and plant/projectile profiles.
- Current playtest plant set: radish, energy mushroom, electric mushroom, pumpkin, pineapple, hazelnut, mango, snow-thrower.
- Current implemented monster set: dust-skitter, cave-brute, stonehide, alpha-brute.
- Monster hit response already uses a restrained projectile-colored edge glow and reduced recoil. Preserve this approved treatment; do not restore large white flashes or oversized death explosions.
- Existing hyena-run1 crop and animation is approved and must remain unchanged unless explicitly requested.

## Six delivery tracks

### 1. Animation foundation
- Inventory all current sprite sheets and their actual dimensions/frame layouts before cropping.
- Define idle, anticipation, attack, recovery, hit, defeat, and celebration states per character.
- Add subtle, staggered idle motion only where the artwork supports it.
- Use animation-complete transitions and safe fallbacks; never assume an optional sheet exists.
- Avoid changing approved frame crops or timings without visual review.

### 2. Combat feel
- Give each plant a recognizable wind-up, launch, projectile path, impact, and recovery.
- Give each projectile its own color, silhouette, trail, and impact language.
- Give monsters differentiated hit reactions based on archetype and damage type.
- Keep hit glow narrow, on the silhouette edge, and in the projectile's color.
- Death presentation should be readable and satisfying without a large generic explosion.

### 3. Plant evolution
Three visual tiers for each playable plant:
1. Base identity and current attack.
2. Stronger visual details plus improved anticipation/follow-through.
3. Signature ability with a unique animation and VFX identity.

Progression must be visible, but balance changes are separate and require combat-contract updates and focused tests. No invented asset keys or fake sprites; use authored assets or restrained procedural fallback.

### 4. Monster evolution
Three visual tiers for each implemented monster:
1. Base silhouette and behavior.
2. Visible armor/scar/elemental progression and stronger movement language.
3. Signature attack tell and phase behavior.

Prioritize Stonehide armor damage stages, Dust Skitter speed readability, Cave Brute hit/roar personality, and Alpha Brute boss-scale phase changes.

### 5. Signature abilities
- Add one distinct signature ability per plant after its level 1–2 presentation is approved.
- Add clear pre-attack tells for special monsters and bosses.
- Separate visual event dispatch from combat resolution so cosmetic failure never changes damage, timing, or win/loss state.

### 6. Living battlefield
- Add lightweight dust, leaf, frost, and ground responses to meaningful events.
- Reuse pooled particles and cap concurrent effects.
- Use quality tiers and reduced-motion/performance fallbacks.
- Avoid continuous expensive post-processing.

## Character matrix

| Plant | Motion personality | Evolution direction |
|---|---|---|
| Radish | quick and bouncy | charged volley |
| Mushroom | soft and magical | spreading spore field |
| Pumpkin | steady and protective | defensive pulse and staged shell wear |
| Pineapple | heavy and proud | area impact artillery |
| Hazelnut | compact and sturdy | piercing shot |
| Mango | swinging and playful | radiant splash |
| Snow Thrower | calm and precise | chained freeze |
| Electric Mushroom | bright and sparky | branching electric impact and chain lightning |

| Monster | Reaction personality | Evolution direction |
|---|---|---|
| Dust Skitter | quick and light | dust wake and evasive dash |
| Cave Brute | balanced and readable | scars, roar, charge tell |
| Stonehide | heavy and armored | visible cracking armor |
| Alpha Brute | massive and powerful | rage and multi-phase attacks |

## Implementation status

### Foundation slice — in progress
- [x] Add data-driven animation personality profiles for all eight playable plants, including Electric Mushroom.
- [x] Add archetype-specific hit-reaction profiles for all four implemented monsters.
- [x] Define three-stage visual evolution paths for current plants and monsters, including Electric Mushroom.
- [x] Add focused profile coverage tests.
- [x] Wire monster reaction profiles into the live Phaser hit response.
- [ ] Audit every current sprite sheet and map real frames to states.
- [x] Add a subtle per-plant attack anticipation motion without changing approved artwork.\n- [x] Add staggered, profile-driven idle breathing for all living plants (runtime wiring complete; Chrome visual review pending).\n- [ ] Verify idle/attack/recovery coexistence and complete recovery behavior in Chrome.

- [x] Register Electric Mushroom as a temporary eighth seed-bank playtest option with its 512×512 3×3 artwork. Reuse Mango's dimension-derived crop helper to register nine Phaser frames, render frame 0 while idle, and play frames 0–8 on each attack. Add it to the Stage 1 plant encyclopedia, combat rules, cyan projectile, and electric charge/trail/impact VFX profile. Visual tuning remains pending hands-on Chrome review.

### Next vertical slice
Use Radish + Cave Brute as the first end-to-end reference pair. Verify idle → anticipation → attack → projectile → impact → monster reaction → recovery. Then validate Snow Thrower + Stonehide for elemental accumulation/freeze and armor response. Expand only after both are visually approved in Chrome.

## Acceptance criteria
- Character identity is readable even when no attack is occurring.
- Attack anticipation and recovery are synchronized with actual projectile creation.
- Monster hit response varies by archetype and damage source without hiding the sprite.
- Visual upgrades are distinguishable at a glance and do not silently change balance.
- Missing optional assets never break gameplay.
- VFX are pooled, bounded, and cosmetic-only.
- Existing approved sprite crops and the subtle edge-glow direction remain intact.
- Test the actual result in Chrome before marking an animation or effect visually complete.
