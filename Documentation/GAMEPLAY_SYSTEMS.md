# Gameplay Systems

## Prototype systems
- Farmer movement and camera control.
- Resource/energy collection and spending.
- Grid or lane-aware placement for defensive units.
- Plant targeting, projectile/melee attacks, damage, health, and status effects.
- Enemy navigation, wave spawning, boss behavior, and defeat handling.
- Stage objectives, win/loss states, and reward calculation.
- Farm upgrades, inventory, and persistent save data.

## Design constraints
All combat units expose consistent health/damage/team interfaces. Wave definitions and unit balance are data-driven. Placement validates range, occupancy, and resource cost. Rewards are granted once per completed stage, including safe handling of retries and reloads.

## Acceptance path
A player can complete a stage from start to finish, receive rewards exactly once, return to the farm, spend a reward on an upgrade, save, restart, and recover the saved state.