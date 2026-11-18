# Godot Migration Audit — Source-to-Target Matrix

**Audit status:** Initial source and path inventory completed; visual/semantic asset review and runtime parity remain in progress.
**Branch:** `migration/godot4-android`
**Rule:** This matrix records known source files and intended Godot destinations. It is not a claim that any row has already been ported or tested.

| Source/reference | What it contains | Intended Godot destination | Verification |
|---|---|---|---|
| `web/game/scenes/BattleScene.js` | Current Phaser battle runtime: asset loading, grid, entities, combat presentation and stage flow. Large monolithic scene. | Split into `scenes/battle/Battle.tscn`, `BattleController.gd`, board, HUD, plant, monster, projectile and boss scenes/scripts. | Scene-level tests plus complete Stage 1 playthrough. |
| `web/game/scenes/PauseScene.js` | Pause overlay, resume/restart/settings/menu actions and audio controls. | `scenes/ui/PauseMenu.tscn`, `PauseMenu.gd`, settings service. | Verify all simulation timers/entities freeze and resume correctly. |
| `web/game/rules/phaseOneCombatContract.mjs` | Versioned canonical Stage 1 values: board, energy, waves, plants, monsters, farmer, dragon and timing. | `data/rules/phase_one_rules.tres` and typed rule resources/scripts. | Table-driven tests compare every migrated value and boundary. |
| `web/game/rules/combatSimulation.mjs` | Pure placement, uproot, energy, damage, targeting, movement and spawn rules. | `scripts/rules/combat_rules.gd` and focused rule modules. | Deterministic unit tests for valid/invalid inputs and edge cases. |
| `web/game/rules/phaseOneRules.mjs` | Wave completion, victory, progression, wallet and purchase helpers. | `scripts/rules/progression_rules.gd`, save/progression services. | Unit tests for victory, unlocks, wallet and invalid saves. |
| `web/game/rules/combatEventLog.mjs` | Validated, bounded combat event log. | `scripts/combat/combat_event_log.gd` if replay/debug tooling remains in scope. | Validate event ordering, payload bounds and malformed logs. |
| `web/game/rules/combatReplay.mjs` | Deterministic replay state and event application. | `scripts/combat/combat_replay.gd` (after core gameplay parity). | Replay fixture produces identical state snapshots. |
| `web/game/data/stageOnePlants.mjs` | Stage 1 plant roster, localized names, costs, statuses and descriptions. | `data/plants/*.tres` and plant encyclopedia data. | Check all displayed roster facts against gameplay resources. |
| `web/game/data/monsterRoster.mjs` | Monster roster and implementation status. | `data/monsters/*.tres` and encyclopedia data. | Only verified implemented monsters are selectable/playable. |
| `web/game/data/campaignWorlds.mjs` | Campaign world identities and localization. | `data/campaign/worlds/*.tres`. | World map and stage unlocks use the same IDs. |
| `web/game/data/projectileDesigns.mjs` | Plant-specific projectile art contracts; explicitly does not guarantee every image exists. | `data/projectiles/*.tres` plus reviewed textures/scenes. | Confirm source artwork exists and projectile identity matches each plant. |
| `web/game/rules/combatEventLog.mjs`, `combatReplay.mjs` | Audit/replay support for combat behaviour. | Optional debug/replay subsystem, not a dependency of normal battle startup. | Debug tools cannot break offline gameplay. |
| `Documentation/NEW_GAMEPLAY_RULES_2D.md` | Definitive gameplay constraints and character behaviour. | Godot architecture and gameplay acceptance tests. | Manual rule-by-rule review. |
| `Documentation/GAME_DEVELOPMENT_ROADMAP.md` | Detailed original scope and acceptance criteria. | Reconcile with the newer Godot Android plan. | Latest owner decision overrides former Phaser/Windows-first assumptions. |
| `Documentation/GLOBAL_GAME_SUCCESS_MASTER_PLAN.md` | Product vision, campaign arc, quality requirements and long-term goals. | Product/design constraints for all Godot phases. | Review each stage against product requirements. |
| `web/public/assets/**` | Current web runtime art/audio assets (inventory and licensing/approval review still required). | `godot/assets/**`, preserving source filenames and recording import settings. | Asset manifest, visual review and missing-resource scan. |
| Legacy Unity project | Historical C# scenes, scripts, prefabs and assets referenced by existing documentation. Exact tree and reusable components still require a dedicated inventory. | Reference only; selectively translate verified rules/assets. | No direct copy of Unity-specific code; verify each migrated behaviour. |

## Findings from the first pass

1. The repository default branch is `main`; the project is private and the connected GitHub account has push/admin permission.
2. The existing web client is Next.js 16 + React 19 + Phaser 3.90, under `web/`.
3. The repository root has no `project.godot` file at the expected root path; the dedicated Godot project should be created under `godot/`.
4. The current Stage 1 contract defines 5 waves of 3, 5, 6, 7, and 9 ordinary monsters (30 total), an 8-column × 5-row board, and starting/capped energy of 150/300.
5. Stage 1 plant rule data currently includes Radish, Energy Mushroom, Pumpkin, Pineapple, Hazelnut and Mango. The separate roster file distinguishes active/implemented entries from planned entries; do not assume every configured plant is approved for the first playable slice.
6. The monster roster describes Cave Brute, Dust Skitter, Stonehide and Alpha Brute; the Stage 1 dragon is a separate boss contract.
7. Combat rules and replay/event-log modules are already separated from the large Phaser battle scene. Prioritize those pure rules for direct, testable translation before reproducing presentation code.
8. Several docs still describe Phaser and Windows-first delivery. The README and the new Godot migration plan now record the latest approved decision; the older documents remain useful for gameplay requirements but no longer define engine/platform priority.
9. The complete art inventory, Unity project tree, actual Android minimum-version target, exact pinned Godot patch version, and physical-device test matrix remain open audit items.

## Open audit checklist

- [x] Enumerate tracked art/audio paths and record the initial inventory in `Documentation/GODOT_ASSET_INVENTORY.md`; image dimensions, frame grids, licensing and approval review remain open.
- [x] Inspect the tracked legacy `Assets/` source footprint. The tree contains C# source files but no tracked `.unity`, `.prefab`, `.asset`, `ProjectSettings/` or `Packages/manifest.json`; a complete Unity editor project is not established by the current tree.
- [x] Read the complete Stage 1 contract exports and identify the related JavaScript regression tests. Full field-by-field port and edge-case parity are still pending.
- [ ] Review campaign, save, settings, and localization data contracts.
- [ ] Reconcile old roadmap requirements with the current Android-first release scope.
- [x] Add the initial Godot 4 project foundation using Compatibility rendering and landscape canvas. Exact stable patch and Android export toolchain remain unpinned until an editor/export validation environment is available.
- [ ] Agree a minimum Android OS/device profile using physical-device testing, not assumptions.
