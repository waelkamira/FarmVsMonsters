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
- hit-point damage clamping and defeat detection;
- monster lane movement with plant bite-reach clamping (prevents tunnelling through a blocker);
- projectile lane advancement using elapsed simulation seconds.

`BattleScene.js` now delegates planting, uprooting, monster bite damage, projectile damage, and dragon damage to these pure functions. The existing 8×5 grid, 35/50 planting costs, full manual refund behavior, 300 energy pickup cap, damage amounts, and 8-coin ordinary-monster reward remain unchanged.

This is a first kernel extraction, not a complete simulation. Monster movement, target selection, collision geometry, projectile travel, wave scheduling, Dust Skitter gameplay randomness, dragon targeting, and victory/loss transitions still need to move into deterministic simulation functions. The client still owns the live battle and local reward display; cloud rewards remain disabled.


## Target selection extraction (implemented)
The pure combat kernel now also owns target selection:
- nearest living Radish blocker in the monster's row and behind its current position; Energy Mushrooms remain non-blocking;
- first eligible monster in the projectile's lane and collision radius, preserving monster-array first-match behavior and per-monster width scaling;
- nearest eligible monster in the farmer's current lane and melee reach, preserving stable tie order;
- living plant with the lowest HP for dragon fireballs, preserving stable tie order.

BattleScene supplies current world-to-lane positions and visual collision dimensions, while the pure functions decide which entity is selected. This is intentionally a boundary step: Phaser still owns coordinate projection, sprite bounds, projectile presentation/tweens, attack cooldowns, and the actual encounter loop. Dragon fireball plant damage now also uses the shared HP resolver.


## Attack timing and Dust Skitter motion extraction (implemented)
- `advanceCooldown` now handles elapsed-time advancement for ordinary monster bites, Radish firing, and both dragon attack timers.
- `resolveBiteAttack` owns the bite-ready decision and interval reset while the scene retains the existing damage/audio/visual side effects.
- `resolveDustSkitterMotionStep` owns jump/burst state transitions, elapsed durations, jump visual offset, and combined movement multipliers. The scene samples the existing Phaser random duration ranges only at transition boundaries and passes those samples into the pure resolver; random behavior has not yet been replaced with the server-seeded RNG.
- Jumping remains presentation-only: it changes the sprite's vertical offset and movement multiplier, not lane coordinates or collision geometry. Bite-range interruption and the current jump/burst timing values are preserved.
- The Phaser scene still owns spawn timing, random sampling, audio, dust effects, and animation playback. This is not yet a deterministic or server-authoritative battle.


## Wave scheduling and spawn composition extraction (implemented)
The pure combat kernel now resolves the Stage 1 spawn schedule:
- It consumes the current wave, configured roster size, spawned count, intermission, spawn timer, and elapsed milliseconds.
- It returns whether exactly one monster should spawn this update, the next spawned count, remaining intermission, and next spawn timer.
- Wave sizes and intervals are validated against the central phase-one contract; the five-second preparation window and the existing first/next spawn delays are preserved.
- Monster archetype composition is also resolved in the kernel (Cave Brute, Dust Skitter, Stonehide, Alpha Brute). The legacy `phaseOneRules.mjs` export remains as a compatibility alias.
Phaser still chooses the visual lane using its current random source, creates sprites/effects, and starts the dragon encounter after the second ordinary spawn in wave five. Lane selection is not yet deterministic or server-authoritative.


## Client-seeded random sampling (implemented as a development boundary)
- `BattleScene` now creates one client-local unsigned 32-bit seed when a battle scene starts and uses `createSeededRandom` for monster lane selection and Dust Skitter initial/transition jump and burst timing samples.
- This makes those gameplay-affecting random choices reproducible when the same local seed is supplied to the same scene logic. The seed is not accepted from a player as proof and is not trusted by a server.
- Cosmetic voice timing/selection, animation, and incidental presentation randomness remain separate from the simulation stream.
- The next authoritative step is to issue the seed from a server-created session and move the same deterministic rules into a server replay validator. Until then, client combat outcomes and locally generated seeds remain untrusted; cloud rewards and progression writes stay disabled.


## Ordered player-action event log (first client instrumentation step)
- Added a versioned, immutable combat event log with a session seed, rules version, contiguous sequence numbers, and nondecreasing millisecond ticks.
- The live scene records successful plant placement, manual uprooting, and positive energy collection actions. Failed actions and zero-value pickups are not recorded.
- Event payloads are normalized and bounded to the current 8×5 battlefield and the two implemented plant types. The log is currently retained in scene memory only.
- This is instrumentation, not a replay validator: monster outcomes, autonomous energy generation, combat damage, wave/boss state, and terminal outcomes are not yet replayed or verified. Client event logs remain untrusted and must not grant currency or progression.


## First deterministic action replay reducer (limited scope)
- Added a pure replay reducer for the currently instrumented player actions: plant placement, manual uprooting, and energy pickup.
- Replay starts from the phase-one initial energy, reuses the shared placement/uproot/pickup resolvers, enforces the 8×5 board, occupied-cell checks, planting costs, full manual refund, event order, duration bound, and exact rules version.
- Energy collection is provisionally restricted to the current 15-energy mushroom pickup denomination. This still does not prove a pickup existed; world-generated pickup provenance must be simulated before energy events can be considered authoritative.
- The reducer does not yet simulate autonomous mushroom production, monster movement/attacks, projectiles, wave spawns, dragon combat, farm damage, kill rewards, or victory. A successful replay means only that the supported player-action subset is internally consistent, never that the stage was won.
- No server endpoint, database writes, cloud rewards, or progression unlocks are enabled by this work.


## Mushroom energy production and collectible replay
- The battle scene now records each mushroom energy spawn with its source cell and deterministic per-plant pickup ID; collection references that exact pickup rather than trusting a claimed amount alone.
- Replay now verifies that the source mushroom was planted and remains alive, the 12-second production interval elapsed, the pickup ID and 15-energy value match the plant's production sequence, the pickup has not expired (12-second TTL), and the pickup has not already been collected.
- Collected energy is derived from the replayed bank and the 300-energy cap; the event's claimed gain must match the computed gain. Clicking a pickup at full energy is recorded as a discard so the replay cannot leave a phantom collectible.
- A separate combat clock advances only during active battle updates, avoiding story-sequence elapsed time from falsely advancing mushroom production.
- This remains a limited action/economy replay: monster combat, kills, boss victory, and rewards are not yet authoritative. No server rewards or cloud progression are enabled.


Implementation correction: the battle scene now records production/collection/discard events using the active-combat clock, which does not advance during story sequences. Pickup IDs are assigned per mushroom and production cycle. The replay reads the 12-second pickup lifetime directly from the shared combat contract.


Pickup identity hardening: collectible IDs are now globally monotonic for the battle session rather than derived from a board cell, preventing an uprooted/replanted mushroom at the same cell from reusing an older still-active pickup ID. Replay independently derives the expected ID sequence and enforces production ordering across live mushrooms.


## First monster replay slice
- Each ordinary monster spawn is recorded with a session-unique ID, wave/index, lane, archetype, and combat stats. Replay checks the exact five-wave roster sequence, archetype schedule, HP and speed against the shared combat contract.
- Each monster bite is recorded against a specific radish cell. Replay verifies that the attacker exists and is alive, the target is a living radish in the same lane, damage matches the archetype profile, and bite intervals are respected; plant HP and destruction are recalculated.
- This is not yet a full monster simulation: lane movement, target proximity, projectile damage, monster deaths, breach/farm defeat, and rewards still require deterministic replay. Client event claims remain untrusted until those steps are implemented and server-side replay is authoritative.
