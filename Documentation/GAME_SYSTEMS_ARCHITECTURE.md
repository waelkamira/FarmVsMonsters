# FarmVsMonsters — Game Systems Architecture

## Active runtime

- Next.js + React provide the browser application shell and player-facing screens.
- Phaser 3 owns the active gameplay scene, world rendering, input-to-gameplay interaction, combat entities, and battle timing.
- Shared gameplay rules should remain in framework-independent modules under `web/game/rules/` where practical.
- Asset loading and lifecycle are coordinated through `web/game/services/assetManager.mjs`.
- Combat presentation effects are orchestrated by `web/game/vfx/VFXManager.mjs`, with presets and adaptive quality profiles under `web/game/vfx/`.
- Godot remains paused; it is not an implementation target for new features.

## System boundaries

| System | Responsibility | Must not own |
|---|---|---|
| App shell | Routing, localization, menus, browser lifecycle | Combat simulation |
| Battle scene | Compose battle systems and render current state | Persistent account authority |
| Combat rules | Deterministic placement, targeting, damage, wave and outcome decisions | Phaser display objects |
| Plant definitions/runtime | Plant identity, stats, cooldowns, attacks and visuals | Monster wave orchestration |
| Monster definitions/runtime | Archetypes, movement, attacks, health and death | Farm economy |
| Progression rules | Unlocks, rewards, discoveries and stage gates | UI-only state |
| Farm system (planned) | Plots, growth, harvest, buildings and farm resources | Battle frame loop |
| Asset manager | Load groups, track references, release owned resources | Gameplay balance |
| VFX manager | Compose sprite-sheet cues, particle bursts, procedural shapes and optional Post-FX; adapt quality to frame time | Damage, status rules, combat outcomes |
| Persistence adapter | Versioned save/load and migration | Rendering |
| Analytics adapter (planned) | Privacy-conscious gameplay events and performance signals | Authoritative game state |

## Data flow

1. UI/input expresses a player action.
2. Gameplay rules validate the action and produce a result/event.
3. Runtime systems apply the result to the current scene.
4. Progression rules calculate unlocks and rewards.
5. Persistence stores versioned progress through one adapter.
6. Analytics records non-sensitive events without becoming a gameplay dependency.

## Engineering rules

- Keep pure rules testable without Phaser wherever possible.
- Avoid placing all new farm, collection, and social logic inside `BattleScene.js`.
- Use stable IDs for plants, monsters, stages, items, and buildings.
- Separate permanent farm currency from temporary battle energy.
- Treat reward granting and save updates as one logical transaction in the persistence layer.
- Version save data and test migrations before changing its schema.
- Load assets by group/need; release only resources owned by the manager and no longer referenced.
- Avoid duplicate asset keys and implicit key renames.
- Record sprite-sheet source dimensions and frame layout before choosing frame sizes.
- Keep UI display scaling separate from source sprite dimensions.
- VFX are presentation-only: never apply damage, freeze duration, or status logic inside VFX modules.
- Sprite-sheet effects are opt-in by registered asset/animation key; missing sheets fall back to procedural visuals.
- Particle counts and concurrent effects must respect the active adaptive quality profile. Optional Post-FX must fail safely on unsupported renderers.
- Keep social features asynchronous initially; real-time networking requires a separate product and technical justification.

## Feature completion contract

A feature is complete only when:
- Its design and dependencies are documented.
- Its code is integrated into the active Phaser/Next.js project.
- Relevant automated tests pass.
- The feature is exercised in Chrome on Windows at representative screen sizes.
- Save/reload behavior is verified when the feature changes persistent state.
- Asset load and memory behavior are checked when the feature adds assets.
- The build log records what changed and what remains limited.


## Hybrid character animation (incremental)

The active Phaser runtime keeps Sprite Sheet animation as the compatibility baseline and adds an optional versioned skeletal/cutout profile. The pure profile evaluator lives in `web/game/studio/skeletalAnimation.mjs`, with a Phaser Container adapter in `web/game/studio/phaserSkeletalRig.mjs`; it validates the bone graph and references, samples keyframes, composes hierarchical transforms, and resolves attachment/hitbox transforms. Studio asset records preserve this profile through revision snapshots, cloning, and restore. Published catalogs carry the rig profile and descriptors for its referenced bitmap-part assets.

The evaluator does not render Phaser objects or own combat rules. The next runtime/editor phases must use the same evaluated pose for visible parts, weapon/projectile attachments, and hitboxes. Assets without a rig profile continue through the existing Sprite Sheet animation path unchanged.
