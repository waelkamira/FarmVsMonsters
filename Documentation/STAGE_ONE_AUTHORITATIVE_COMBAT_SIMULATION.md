# Stage 1 combat simulation

Stage 1 is a five-wave battle containing exactly 30 ordinary enemies, all using the approved Monster 01 profile. Wave sizes are 3, 5, 6, 7, and 9.

Victory is reached when the fifth wave has spawned and every ordinary enemy has been defeated. The game then opens the normal victory screen. There is no separate boss encounter, boss health bar, boss projectile system, captive-character sequence, or rescue-animation gate in the active game.

The shared combat contract remains responsible for plant costs and health, energy, wave timing, Monster 01 statistics, movement, attacks, projectiles, and damage resolution. Phaser remains responsible for rendering, input, effects, and presentation.

A future boss can be added only as a separately approved feature with its own artwork, combat contract, runtime implementation, and regression tests. No boss assets or runtime references are included in the current build.
