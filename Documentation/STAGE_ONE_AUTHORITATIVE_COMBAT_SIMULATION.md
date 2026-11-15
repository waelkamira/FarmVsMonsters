# Stage 1 Authoritative Combat Simulation — Implementation Contract

Status: design and shared combat configuration only. The live game is still client-simulated.

## Why a server result must be replayed

The browser currently decides:
- when monsters spawn and which lane they enter;
- player plant placement, uprooting, energy collection, and farmer club attacks;
- projectile collisions, monster damage, deaths, and the local 8-coin reward;
- the dragon encounter, damage, and the rescue sequence.

A client can edit JavaScript or submit invented events. A session ID alone cannot prove a victory. The server must independently run the same rules against a validated input timeline and derive the outcome itself.

## Shared contract now in the repository

`web/game/rules/phaseOneCombatContract.mjs` is a renderer-independent, versioned rules module. Phaser consumes it, and a future server simulator can import the same module.

Version 1 centralizes:
- Stage 1 wave sizes: 3, 5, 6, 7, 9 ordinary monsters;
- starting and maximum energy;
- radish and energy mushroom combat/economy values;
- all four monster archetype health, speed, attack, armor, and Dust Skitter movement parameters;
- dragon health, farmer sling damage/cadence, fireball damage and timing;
- farmer club damage/reach, radish projectile speed/collision radius, monster scaling formulas;
- 8 coins per ordinary monster defeat;
- spawn pacing and inter-wave delay.

The current tuning is intentionally preserved. This refactor does not change the reward amount or the number of enemies. The dragon remains a separate boss and does not receive an ordinary-monster reward.

## Proposed trusted session flow

1. Authenticated player requests a Stage 1 run.
2. Server creates a session row containing: random server-generated seed, user ID, stage, combat-contract version, server start time, expiry, status, and a unique session ID. The browser cannot choose the seed or reward.
3. Browser submits only player commands: plant at a valid grid cell, uproot a living plant, collect an available energy pickup, or perform an allowed farmer action. Commands have a session sequence number; clients do not submit damage, HP, kills, currency, wave completion, or victory.
4. The server validates each command against its current simulation state and authoritative server time. It rejects out-of-order, duplicated, too-fast, impossible, or unaffordable actions.
5. The deterministic simulator advances the world from server time using the server seed. Monster lanes, archetypes, spawn timing, burst/jump intervals, targeting, collision, HP, attacks, boss behavior, and terminal state are derived by the simulator.
6. The server persists a compact event log or periodic state checkpoints. A reconnect resumes from server state, not from browser-reported HP or coins.
7. Completion is accepted only when the server simulation reaches the Stage 1 terminal predicate: all 30 ordinary monsters defeated, dragon defeated, and rescue sequence's gameplay gate satisfied. The cosmetic rescue animation itself is not trusted as proof.
8. A single database transaction locks the player's progression row, locks the session, verifies ownership/expiry/contract version/status, marks the session completed exactly once, inserts reward ledger entries, adds exactly 8 coins per ordinary monster confirmed by simulation, and updates the stage completion/unlock state. Repeated completion requests return the existing result and never grant again.

## Determinism requirements

- Use a documented seeded PRNG with stable integer arithmetic; never use `Math.random()` or Phaser random helpers inside authoritative simulation.
- Use fixed simulation ticks (for example, 50 ms) and a stable event ordering for actions, spawns, movement, bites, projectiles, deaths, and victory checks.
- Define numeric precision and rounding rules. Use integer fixed-point units for movement/health where practical.
- Bind each session to one immutable combat-contract version. A later balance update must not silently change an active session's replay.
- Keep visual animation, sound, particles, tweens, screen coordinates, and language outside the simulation.

## Important gaps before this can be implemented safely

The shared contract and seeded PRNG are foundations, not the simulator. The PRNG is deliberately not yet wired into the live battle. BattleScene still contains gameplay behavior that must be extracted and modelled:
- grid-to-lane geometry and collision reach;
- player action validation and energy economy;
- monster targeting and bite cadence;
- projectile movement and collision ordering;
- Stonehide brace state;
- Dust Skitter deterministic random schedule;
- dragon targeting and fireball resolution;
- loss and victory terminal rules.

Current row selection, burst/jump timings, and several cosmetic effects still use Phaser random values. These must be separated: authoritative random choices use the server seed; cosmetic-only random effects remain client-side.

## Rollout and legacy balances

- Keep guest play and local saves working.
- Do not upload local currency or stage unlocks.
- Do not mark old cloud values verified based on local storage.
- Do not enable plant purchases from unverified balances.
- Run the server simulator in shadow mode against recorded, consented test sessions before granting cloud rewards.
- Enable authoritative cloud rewards only after replay tests, duplicate-request tests, concurrency tests, and cross-account authorization tests pass.

## Acceptance tests

- Same contract version + same seed + same ordered commands always produces the same final state and event digest.
- Invalid grid coordinates, unaffordable plants, duplicate sequence numbers, forged timestamps, and impossible actions are rejected.
- A client cannot submit a kill, HP value, reward amount, completed-wave count, or victory flag.
- Every ordinary monster is rewarded at most once; dragon reward policy remains separate and unchanged until explicitly approved.
- Two concurrent completion requests produce one completion and one reward grant.
- A defeat cannot unlock the next stage.
- A replay using an old, expired, other-user, or different-contract session cannot grant currency.


## First extracted simulation kernel (implemented)
`web/game/rules/combatSimulation.mjs` now owns pure, renderer-independent resolution for:
- planting validation (known plant type, valid 8×5 grid coordinate, unoccupied living cell, and sufficient energy);
- authoritative plant record creation and exact energy deduction;
- manual uproot validation and catalog-derived refund (rejects a modified/forged stored cost);
- energy pickup cap calculation;
- hit-point damage clamping and defeat detection.

`BattleScene.js` now delegates planting, uprooting, monster bite damage, projectile damage, and dragon damage to these pure functions. The existing 8×5 grid, 35/50 planting costs, full manual refund behavior, 300 energy pickup cap, damage amounts, and 8-coin ordinary-monster reward remain unchanged.

This is a first kernel extraction, not a complete simulation. Monster movement, target selection, collision geometry, projectile travel, wave scheduling, Dust Skitter gameplay randomness, dragon targeting, and victory/loss transitions still need to move into deterministic simulation functions. The client still owns the live battle and local reward display; cloud rewards remain disabled.
