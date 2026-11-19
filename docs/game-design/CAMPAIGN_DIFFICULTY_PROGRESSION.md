# FarmVsMonsters Campaign Difficulty & Learning Curve

Status: Stage 1 tuning implemented; Stage 2 onward is the approved design plan, not yet live gameplay.
Reference model: the original Plants vs. Zombies Adventure Mode. This borrows its teaching rhythm, not its exact proprietary level data.

## Design principles

1. Teach one new rule or enemy at a time.
2. Give the player a safe opportunity to understand it before combining it with an older threat.
3. Increase only a small number of pressure variables per stage: enemy count, health, speed, spawn cadence, lane coverage, or enemy mix.
4. Keep the first encounter with a new enemy sparse; later encounters can combine it with familiar enemies.
5. Reward completion with a new plant/tool or meaningful choice so the player feels progress.
6. Avoid difficulty spikes: the next stage should be a modest step up, not a sudden multiplication of health and enemy count.
7. The dragon boss is a separate encounter and is not included in ordinary-monster counts below.

## Lessons from original Plants vs. Zombies

- 1-1 teaches planting, collecting sun, and defending one lane with only Peashooter against a few basic zombies.
- 1-2 expands to three lanes and introduces the Sunflower economy and the flag/wave warning.
- 1-3 adds only a modest increase in basic enemies plus the tougher Conehead, so the player learns how to respond to armour.
- Faster and more durable enemy types arrive later, followed by multiple waves and more complex combinations.
- The fifth level is a bonus/mini-game in the original campaign structure; it breaks up the standard combat rhythm.

The lesson for FarmVsMonsters: don't introduce a fast scout, an armoured brute, a giant, and a boss all at once.

## Stage 1 — onboarding (LIVE)

Goal: teach basic planting, energy management, projectile timing, and then one new enemy behaviour at a time.

Ordinary monsters: **20**, in five waves. The dragon boss remains separate.

| Wave | Ordinary enemies | Composition | Intended lesson |
|---|---:|---|---|
| 1 | 2 | 2 Cave Brutes | Learn placement and projectile impact; generous time to react |
| 2 | 3 | 3 Cave Brutes | Establish a second defensive line and collect energy |
| 3 | 4 | 4 Cave Brutes | Sustain a simple defence over a longer wave |
| 4 | 5 | 4 Cave Brutes + 1 Dust Skitter (last) | First fast enemy; only one, clearly isolated |
| 5 | 6 | 5 Cave Brutes + 1 Stonehide (last) | First armoured enemy; familiar enemies provide context |

Spawn spacing remains wave-based. Keep the first three waves slow and predictable; don't shorten spawn intervals just because the wave number increases.

### Stage 1 enemy health and speed

Cave Brute health is deliberately readable in Radish hits. Radish projectile damage is 25.

| Wave | Cave Brute HP | Radish hits to defeat | Base movement speed |
|---|---:|---:|---:|
| 1 | 125 | 5 | 8.00 |
| 2 | 133 | 6 | 9.35 |
| 3 | 141 | 6 | 10.70 |
| 4 | 149 | 6 | 12.05 |
| 5 | 157 | 7 | 13.40 |

Special enemies retain their existing archetype multipliers:
- Dust Skitter: 0.52× the wave baseline HP, 1.7× movement speed, 8 plant damage. Stage 1 has one, in wave 4.
- Stonehide: 2.2× the wave baseline HP, 0.62× movement speed, and 0.7× incoming damage. Stage 1 has one, in wave 5.
- Alpha Brute: not used in Stage 1; reserve it for a later campaign reveal.

### Stage 1 plant / weapon balance (LIVE contract values)

Damage is per projectile. Cooldown is the minimum time between attacks; the throw animation may add its own visible wind-up.

| Plant | Role | Damage / effect | Cooldown | Energy cost |
|---|---|---:|---:|---:|
| Radish L1 | Starter shooter | 25 damage | 1,450 ms | 35 |
| Pineapple L1 | Heavy projectile | 42 damage | 2,100 ms | 70 |
| Hazelnut L1 | Balanced projectile | 38 damage | 1,950 ms | 65 |
| Mango L1 | Heavy projectile | 40 damage | 2,100 ms | 70 |
| Snow Thrower L1 | Control / freeze | Freeze projectile; no direct damage value | 3,600 ms | 90 |
| Pumpkin | Defensive wall | 520 HP | — | 75 |
| Energy Mushroom | Economy | +15 energy per pickup; every 12,000 ms | 12,000 ms production | 50 |

Stage 1 starts with 150 energy (maximum 300). These are the current shared combat-contract values, not invented balance estimates.

## Stage 2 — introduce tactical choices (PLANNED, NOT LIVE)

Goal: teach the player to combine two familiar enemy behaviours and use the plant roster deliberately.

Ordinary monsters: **25**, suggested wave sizes **3 / 4 / 5 / 6 / 7**.

| Wave | Count | Planned composition | Teaching purpose |
|---|---:|---|---|
| 1 | 3 | 3 Cave Brutes | Warm-up; reinforce Stage 1 |
| 2 | 4 | 3 Cave Brutes + 1 Dust Skitter | Revisit the scout in a mixed wave |
| 3 | 5 | 4 Cave Brutes + 1 Stonehide | Revisit armour with support |
| 4 | 6 | 4 Cave Brutes + 1 Dust Skitter + 1 Stonehide | First deliberate mixed threat |
| 5 | 7 | 5 Cave Brutes + 1 Dust Skitter + 1 Stonehide | Longer final wave, still no Alpha Brute |

Planned Stage 2 durability targets:
- Cave Brute: 150–175 HP (6–7 Radish hits).
- Dust Skitter: 0.52× the Cave Brute wave baseline; never more than two in one wave.
- Stonehide: 2.0× the Cave Brute wave baseline and 0.7× incoming damage; at most one in the first three waves and two in the final wave.
- No Alpha Brute and no new boss in Stage 2.

Stage 2 should not secretly buff every weapon. Keep the Stage 1 damage values initially, then playtest whether the new combinations are fair. If Stage 2 is too hard, first reduce enemy count or spawn pressure before increasing weapon damage.

## Campaign count targets (PLANNED)

These counts are ordinary enemies per stage; they are pacing targets for the 10-stage campaign, not a claim that all stages are implemented.

| Stage | Ordinary enemies | New learning focus |
|---|---:|---|
| 1 | 20 | Planting, energy, basic shooter, one scout, one armoured enemy |
| 2 | 25 | Mixed familiar enemies and tactical plant choice |
| 3 | 30 | Introduce one new enemy ability |
| 4 | 36 | Teach counterplay to that ability |
| 5 | 42 | Mid-campaign challenge / bonus-style breather |
| 6 | 48 | Combine two previously learned abilities |
| 7 | 55 | Introduce Alpha Brute sparingly |
| 8 | 62 | Enemy combinations and lane pressure |
| 9 | 70 | Multi-wave endurance and resource planning |
| 10 | 80 | Final campaign challenge and boss finale |

## Playtest acceptance criteria

- A first-time player can understand the core loop before the first wave becomes threatening.
- Stage 1 waves 1–3 can be won with the starter Radish and sensible placement.
- The first Dust Skitter and first Stonehide are isolated enough that their behaviour is legible.
- A failed attempt feels recoverable: the player can identify what to improve rather than feeling overwhelmed.
- Do not raise monster HP, movement speed, and spawn frequency together in one stage.
- Tune after real playtests; the numeric targets above are a starting balance, not a substitute for observed win rates and player comprehension.
