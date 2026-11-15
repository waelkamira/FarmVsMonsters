# Farm Vs Monsters — Global Success Master Plan

**Status:** Official strategic product and development reference  
**Repository:** `waelkamira/FarmVsMonsters`  
**Target branch:** `main`  
**Current runtime:** Next.js + React + JavaScript + Phaser 3 in `web/`  
**First release target:** Windows/desktop browser; mobile and packaged desktop follow after the core game is stable  
**Art direction:** Original hand-drawn 2D cartoon art. Plants vs. Zombies is a design reference for clarity, pacing, readability, charm, and strategic depth—not a source of copied characters, art, audio, names, levels, or proprietary content.

> This document is the strategic master plan. It governs product direction, phase order, success criteria, and scope. The detailed implementation checklist remains in `GAME_DEVELOPMENT_ROADMAP.md`. If older documentation conflicts with this plan or with the current approved 2D Phaser implementation, this master plan and the latest explicit user decisions take precedence. Update the detailed roadmap and build log when implementation changes.

---

## 1. Product vision

Farm Vs Monsters is an original 2D strategy-defense game about protecting a living farm from increasingly dangerous monster invasions, then growing that farm into a thriving home. The player commands a farmer, plants, useful farm creatures, tools, and upgrades. Battles deliver immediate tactical excitement; the persistent farm gives rewards meaning and creates a longer journey.

The intended emotional promise:

**“Every battle protects something you have built. Every victory helps your farm grow. Every new threat asks you to think differently.”**

The game should be instantly understandable, charming to watch, satisfying to master, and substantial enough to support a long single-player journey. The objective is a high-quality game players choose to revisit—not manipulative or compulsive design.

### Design reference: Plants vs. Zombies

Learn from the reference in these areas:
- One clear battlefield and readable lanes.
- Simple click/tap actions with immediate visual feedback.
- Distinct units whose roles are understood by appearance and behavior.
- Resource decisions that create tension without overwhelming the player.
- Gradual introduction of mechanics, then combinations that create strategy.
- Strong humor, expressive animation, memorable sound, and satisfying impacts.
- Short levels, clear objectives, visible progress, and a fair difficulty curve.
- New mechanics introduced before they are combined in harder encounters.

Do not copy its characters, plant designs, monster designs, animations, sounds, level layouts, UI identity, names, or other protected expression. Farm Vs Monsters must have its own world, characters, tone, progression, and signature mechanics.

---

## 2. The ten success factors and how this game will apply them

These ten factors are product requirements. Every major phase should improve at least one and must not damage the others.

### 1) A fun core loop from the first session
- Teach one action at a time: choose a plant, choose a valid cell, let the farmer plant it, observe its behavior, collect resources, survive a wave.
- Make the first useful action happen quickly; avoid long opening text.
- Give immediate feedback for planting, hits, eating, collection, kills, wave completion, victory, and defeat.
- Make the first encounter forgiving enough to teach, but not so passive that the player becomes bored.
- Measure how quickly a new player understands the objective and performs their first successful defense.

### 2) Easy to learn, deep to master
- Introduce one new rule at a time.
- Give each plant and monster a clear role, counter, strength, and weakness.
- Create strategic trade-offs: economy now versus defense now; one powerful lane versus balanced coverage; cheap units versus specialist counters.
- Later levels should test combinations and timing, not merely inflate enemy health.
- Avoid hidden rules and unexplained damage.

### 3) Memorable characters and a distinctive world
- Give the farmer, every plant, every monster, animal, and boss a recognizable silhouette, personality, animation language, and sound.
- Build a consistent visual language for health, damage, danger, armor, stun, slow, resource generation, and interactable objects.
- Use original hand-drawn 2D art and reviewed sprite sheets.
- No shadows beneath any character. Do not replace authored character artwork with procedural placeholder characters as a permanent fallback.
- Keep animations grounded: correct foot baseline, origin, frame dimensions, depth sorting, and no clipping or sinking below the ground.

### 4) Meaningful variety and tactical choices
- Each new plant must add a genuinely different decision, not just a stronger copy.
- Each monster must change how the player defends: speed, armor, eating behavior, special movement, resistance, or lane pressure.
- Add environmental and level modifiers only when they are visually clear and teachable.
- Create memorable combinations and counters. Never make a supposedly special enemy impossible to counter with the tools available at that point.
- Do not add complexity merely to increase the feature count.

### 5) Visible, rewarding long-term progression
- Connect battle rewards to permanent farm improvements, unlocks, new regions, animals, buildings, tools, and cosmetic personalization.
- Give every reward a clear purpose and show what it unlocks.
- Use milestone rewards and meaningful choices rather than endless low-value currency collection.
- Save progress reliably and make it recoverable.
- Keep the core campaign playable without requiring account creation or payment.

### 6) Fair challenge and trustworthy economy
- Tune difficulty through enemy composition, timing, lane pressure, and tactical constraints before relying on inflated health.
- Make losses understandable and retrying worthwhile.
- Never sell mandatory power or create pay-to-win progression.
- If monetization is later introduced, it must be transparent, optional, age-appropriate, and separated from competitive balance. No deceptive timers, punitive streak loss, or pressure tactics.
- Prevent duplicated rewards, negative balances, free purchases, and save corruption.

### 7) A substantial campaign and reasons to return
- Build a coherent world map, regions, level themes, boss milestones, optional challenges, and replayable encounters.
- Add daily/weekly challenges only after the main game and progression are stable.
- Add rotating events and collections only when the team can maintain quality and fairness.
- Never punish players for taking breaks. No streak reset threats or time-limited pressure as the primary retention mechanism.
- Every repeat activity should offer a new tactical twist or a meaningful goal.

### 8) Excellent visual, animation, and audio feedback
- Use a unified art bible: proportions, outline weight, palette, lighting, texture, scale, animation timing, and background depth.
- Prioritize readable silhouettes and clear action over decorative detail.
- Build a coherent sound identity: planting, harvesting, projectile launch, impact, monster eating, damage, death, rewards, menus, and music.
- Use layered feedback: animation + sound + UI response, without excessive flashes or visual noise.
- Review sprite sheets and contact sheets before replacing approved runtime assets.

### 9) Reliable controls and performance on target devices
- First make the desktop experience precise and stable.
- Then design touch controls intentionally; do not merely shrink desktop buttons.
- Support common resolutions, aspect ratios, safe areas, pause/resume, and audio lifecycle.
- Optimize sprite atlases, asset loading, memory use, frame rate, and scene cleanup.
- Do not claim platform support until tested on real target devices.

### 10) Evidence-led development and continuous improvement
- Test with people unfamiliar with the game, observe confusion, and fix causes rather than explaining around them.
- Track completion, retries, level abandonment, crashes, performance, and optional return behavior only with a clear privacy-conscious policy.
- Use small experiments for tutorial, difficulty, UI, and level pacing.
- Make decisions from observed play, not assumptions or vanity metrics.
- Release only builds that pass defined acceptance gates.

---

## 3. Fixed foundations and rules

These are approved constraints unless the user explicitly changes them.

### Product and technology
- Current playable rebuild: Next.js + React + JavaScript + Phaser 3 in `web/`.
- The legacy Unity/C# project is a reference during migration, not proof that its systems exist in the Phaser game.
- Main target first: Windows desktop browser. Android, iOS, and packaged desktop come later.
- Main branch: `main`.
- The art direction is 2D hand-drawn cartoon with original characters. The old 3D direction is superseded.
- The farmer and hyena sprite sheets are user-created assets. Do not crop, recolor, resize, or replace them without a clear request.

### Battlefield and combat
- Battlefield grid: 5 lanes × 8 columns (40 cells), aligned to the approved perspective battlefield art. Cells are not assumed to be perfectly square.
- Plants are rooted in cells; monsters travel along lanes.
- The farmer physically travels to a selected cell to plant, performs the planting action, then returns as designed. Planting must not overlap other farmer actions.
- A Radish is the first defensive plant. It stays rooted and attacks automatically.
- The Energy Mushroom is a resource producer, not a defensive blocker. It does not stop monsters or prevent emergency combat.
- The farmer must not fight while a living defensive plant remains. Emergency club combat is available only after the last defender is destroyed; planting a new defender ends emergency combat.
- Monster kills award Coins, not energy.
- Energy is a separate resource used for planting.
- Hyenas stop at a living plant and eat it. They must not pass through or stand on top of the plant while eating. Jumping over plants is a possible future mechanic for a specifically designed later enemy/level, not part of the current behavior.
- Do not add shadows beneath any character.
- No permanent procedural fallback characters in place of missing authored monster artwork. Missing critical art should produce a clear diagnostic/loading state, not a different character.
- First campaign wave schedule currently defined as 10 / 15 / 20 / 25 / 30 monsters (100 total). Victory only after all scheduled monsters have spawned and every living monster is defeated. Defeat occurs when farmhouse health reaches zero.
- Restart must reset all battle entities, timers, counters, projectiles, input locks, audio state, and result flags.

### Signature victory ritual: the treasure cave (approved concept)

This is a high-priority, distinctive reward moment and must not be forgotten during implementation.

After the player wins a stage:
1. Show the farmer carrying a visibly heavy sack of golden coins over his shoulder.
2. The farmer walks from the victory area toward the treasure cave.
3. The cave entrance opens with the iconic phrase **“Open Sesame”** (Arabic presentation may use **«افتح يا سمسم»**). The phrase should be presented as an original game interaction, with fitting animation and sound.
4. The farmer deposits the stage's earned gold inside the cave.
5. Show the growing accumulated treasure/wealth total clearly, so the player can see the fortune being built across completed stages.
6. The amount deposited must match the stage reward and the player's actual reward ledger exactly. The ceremony must never create or duplicate currency.
7. The sequence should feel celebratory and satisfying, while remaining skippable or brief on replay so it does not slow repeated play.

**Art dependency:** The user will create/provide the treasure cave artwork later. Until those assets are supplied and approved, implement only the documented flow/data/UI hooks when its scheduled phase arrives; do not invent or replace the cave artwork. The farmer's carrying-sack animation may also require user-provided frames or a separately approved animation plan.

**Economy distinction:** Stage earnings are awarded according to the approved reward rules. The cave is the visual treasury/presentation of the player's accumulated wealth; it must not accidentally count the same reward twice. Decide and document whether the cave total mirrors the player's spendable Coins or represents a separate non-spendable lifetime treasure statistic before implementing the economy connection. Do not silently merge these concepts.

### Current art and behavior priorities
- Preserve user-authored farmer and hyena sprite sheets and their approved direction.
- Correct sprite frame counts, frame spacing, foot baseline, origins, scale, and depth before tuning decorative effects.
- The recent hyena issue—sinking below ground during plant eating—must be resolved and visually verified before the battle phase is considered complete.
- A missing/short idle sheet must be handled safely according to actual available frames; do not crash due solely to an expected count mismatch.
- Keep the previously approved fix that prevents a procedural monster fallback from replacing hyena art.
- Keep the stronger hyena hit flash previously requested; do not increase character scale during eating.
- During eating, hyena size and ground position must remain stable; its mouth/bite animation may move only as the authored frames require.
- The monster must stop before the plant, face it, and remain at ground level. The plant should show readable eating damage/flash feedback and a matching eating sound.

---

## 4. The complete phased development plan

Phases are sequential. A later phase must not begin in earnest until the previous phase passes its exit gate. Small preparatory research or asset planning is allowed, but do not build major dependent systems on an unstable foundation.

## Phase 0 — Product baseline, repository truth, and production pipeline

**Goal:** one reliable source of truth and a repeatable way to build the game.

Work:
- Audit the current `main` branch, current Phaser runtime, assets, docs, rules, and tests.
- Identify which systems are actually implemented, partially implemented, legacy-only, or merely planned.
- Reconcile contradictory old 3D/Unity documentation with the current 2D Phaser product direction.
- Maintain a feature inventory: feature, owner file/module, status, dependencies, acceptance criteria, test evidence.
- Establish consistent naming and asset-folder conventions for plants, farmer, monsters, animals, UI, backgrounds, audio, and effects.
- Ensure the production build, lint, and pure-rule test commands are documented and repeatable.
- Record known bugs separately from planned features.

Exit gate:
- One accurate status baseline exists.
- A clean install/build path is documented.
- No planned feature is described as implemented without evidence.
- The master plan and detailed roadmap are linked from the README.

## Phase 1 — Finish the first complete battle (highest priority)

**Goal:** make one full battle satisfying, understandable, stable, and replayable before expanding the game.

Scope:
1. Main menu → How to Play → battle → pause → victory/defeat → retry/menu.
2. Calibrate the 5×8 grid against the actual background at supported desktop resolutions.
3. Verify farmer movement, planting, return-to-start, foot anchor, facing, scale, animation, and input locks.
4. Verify Radish selection, valid placement, automatic attack, projectile, health, damage, death, and cell release.
5. Verify Energy Mushroom production, collectible appearance, collection, expiry, energy cap, and feedback.
6. Verify hyena Idle/Walk/Run/Bite/Hit/Death sheets and transitions. Fix the eating-ground-position bug first. Keep the hyena in front/behind the correct scene objects using consistent depth sorting.
7. Verify that hyenas stop at plants, never overlap/pass them while eating, damage the plant over time, play the eating sound, and resume movement only after the plant is destroyed.
8. Verify monster variants and size/health/damage/speed relationships without unintended scale changes during animations.
9. Verify emergency club combat starts only when no living defensive plant remains and stops immediately after a new defender is planted.
10. Verify all five waves, exact total of 100 monsters, spawn pacing, wave counters, home damage, victory and defeat conditions.
11. Verify Pause truly freezes timers, movement, attacks, spawns, projectiles, and relevant audio; Resume does not jump timers or duplicate sound.
12. Verify complete restart cleanup and no duplicate listeners, stale callbacks, or entities.
13. Verify all key sounds and actual volume sliders.
14. Verify asset loading failures are visible and recoverable.

Required manual play matrix:
- Full victory run.
- Deliberate defeat run.
- Pause/resume during movement, eating, projectile flight, and between waves.
- Restart during active combat.
- Multiple plants in one lane and in different lanes.
- Mushroom collection at full and near-full energy.
- Last defender destroyed → emergency combat → new defender planted.
- Hyena eating and plant destruction.
- All monster size variants and animations.

Exit gate:
- Production build passes.
- No blocking console/runtime errors.
- At least three complete real-browser playthroughs are recorded (victory, defeat, restart).
- The hyena remains grounded and never overlaps the plant while eating.
- No critical stuck animation, broken transition, duplicate reward, or unrecoverable battle state.
- Phase checklist is signed off in the build log.

**Do not add more defensive plants, a shop, daily challenges, or a farm-management screen before this gate.**

## Phase 2 — Battle feel, balance, and first-session experience

**Goal:** make the completed battle feel excellent, not merely functional.

Work:
- Tune farmer speed, planting timing, plant durability/attack cadence, projectile speed, monster speed/damage/health, bite timing, and home durability.
- Tune wave pacing so each wave has a readable rhythm: introduction, pressure, short relief, escalation.
- Improve hit reactions, eating feedback, projectile impacts, death, reward collection, wave transition, victory, and defeat.
- Make UI feedback precise: selected plant, insufficient energy, occupied cell, pickup available/expired, monster breach, objective danger, and wave completion.
- Add short contextual tutorial prompts and a first-session learning flow; allow replay or disabling of basic hints.
- Improve the first 5–10 minutes: introduce the objective, resource, first defender, first monster, and first tactical decision in sequence.
- Design the post-stage treasure-cave victory ritual: farmer carries the earned gold sack on his shoulder, walks to the cave, the entrance opens with “Open Sesame” / «افتح يا سمسم», deposits the reward, and the accumulated wealth counter updates. Use temporary neutral presentation only until the user supplies the cave art; do not fabricate final cave assets.
- Define the reward ledger and decide whether the cave displays spendable Coins or a separate lifetime-wealth total. Ensure exact-once reward credit and prevent duplicate deposits on replay/retry.
- Add difficulty options only if testing demonstrates a need; keep the intended default balanced.

Exit gate:
- New players can explain the objective and perform the core actions without coaching.
- Testers can identify why a defense failed.
- No single dominant tactic trivializes the whole first campaign.
- The battle is enjoyable across repeated runs, not only the first run.

## Phase 3 — Plant roster and strategic ecosystem

**Goal:** expand player decisions while preserving clear roles.

Work:
- Design a plant roster document before coding. For every plant define: role, cost, health, range, target rules, attack/production interval, damage/effect, counters, upgrade path, animation states, sound, UI icon, unlock point, and balance limits.
- Add one plant at a time and complete its entire lifecycle before adding the next.
- Candidate roles (final roster to be approved): energy producer, rapid single-target attacker, heavy attacker, area attacker, slowing/support plant, durable blocker, trap or delayed-damage plant, and specialist counter.
- Keep Radish as the original first defensive plant and Energy Mushroom as a resource producer.
- Ensure every plant has a unique readable silhouette and behavior.
- Add selection, placement rules, cooldowns, plant damage, death, replacement/removal rules, and any upgrade interactions.
- Add a pre-battle loadout so players make a limited strategic choice rather than always carrying every plant.
- Introduce synergies only when they create understandable combinations.

Exit gate:
- Every unlocked plant has a distinct strategic purpose and has been tested against the current monster roster.
- No plant is mandatory for every encounter.
- No plant breaks cell occupancy, lane logic, depth sorting, resource accounting, or save data.

## Phase 4 — Monster bestiary, special behaviors, and bosses

**Goal:** make encounters require adaptation and create memorable threats.

Work:
- Build a bestiary with visual silhouette, behavior, stats, telegraph, counter, reward, animation, and sound for each monster.
- Expand beyond hyena variants into distinct archetypes, introduced gradually:
  - basic lane walker;
  - fast/light monster;
  - large/high-health monster;
  - armored monster;
  - plant-eating specialist;
  - ranged or support monster;
  - shield/defensive monster;
  - disruptive or sneaky monster;
  - boss and boss minions.
- Preserve the hyena as an identifiable signature monster; size variants must have corresponding stat changes and readable special traits.
- Make special attacks telegraphed and counterable. Any future jump-over-plant ability must be introduced as a distinct mechanic with a clear warning and counter, not silently added to ordinary hyenas.
- Bosses need multiple readable phases, attack warnings, a clear health UI, and satisfying defeat/reward sequences.
- Build encounter combinations and lane compositions rather than simply raising stats.

Exit gate:
- Every monster has a counter available at its introduction.
- Every special ability is readable before it causes major damage.
- Boss encounters are memorable, fair, and tested.
- Monster variety changes player decisions.

## Phase 5 — Persistent farm and the larger game loop

**Goal:** make the farm the player's long-term home and connect battles to meaningful growth.

Core loop:
Prepare farm → collect/produce resources → tend crops/animals → craft or trade → prepare defenses → choose a battle → survive waves/boss → earn rewards → return to farm → build/unlock/upgrade → explore the next region.

Work:
- Create a persistent farm hub with clear navigation and an understandable layout.
- Add crop plots and a non-combat crop-growing/harvesting loop, distinct from battle plants.
- Add animals with care, production, personality, and useful outputs. Initial candidates from the earlier concept include two animals; final species and functions need approval.
- Add buildings with meaningful roles: storage, workshop/crafting, animal shelter, market/trade, and upgrade structures. Start with a small set and expand only when the loop is fun.
- Add tools that change farm tasks in useful ways.
- Add crafting recipes and trade only where they create meaningful decisions; avoid busywork and excessive clicking.
- Connect battle rewards to farm materials, unlocks, and upgrades.
- Integrate the treasure cave as the player's visible long-term treasury: stage rewards are deposited through the post-victory farmer animation, and the accumulated wealth is saved and displayed. Preserve the distinction between spendable Coins and any lifetime treasure total.
- Keep battle plants distinct from ordinary farm crops unless a clearly explained mechanic connects them.
- Build inventory, storage limits, item definitions, production timers, crafting costs, and reward tables as data-driven systems.
- Make offline progression conservative and transparent if later required; do not introduce timers merely to slow the player.

Exit gate:
- A player can complete a meaningful farm → battle → reward → farm upgrade loop.
- Every resource has at least one understandable use.
- Farm systems save/load correctly and cannot duplicate or lose items.
- The farm adds purpose and variety rather than becoming mandatory repetitive chores.

## Phase 6 — Campaign, world map, level design, and progression

**Goal:** create a long, well-paced single-player adventure.

Work:
- Design a world map with distinct regions, visual themes, enemy ecology, and progression.
- Create a level template: objective, lanes/grid, background, enemy schedule, special rule, available loadout, reward, difficulty target, and completion criteria.
- Build a campaign progression that introduces mechanics before testing them in combinations.
- Add optional challenge stages, bonus objectives, hidden discoveries, and replay goals.
- Introduce bosses as region milestones and major story beats.
- Add a progression map for plants, tools, animals, buildings, and regions.
- Use difficulty curves based on tactical complexity, not only larger health bars.
- Provide clear previews of upcoming threats where preparation is expected.
- Ensure a player can replay earlier levels for fun or resources without making repetitive grinding the optimal path.

Exit gate:
- Campaign pacing has been tested by players unfamiliar with the game.
- New mechanics are introduced, practiced, and then combined.
- No progression gate requires unreasonable grinding or payment.
- Rewards and unlocks remain consistent across replay, retry, and save/load.

## Phase 7 — Meta progression, collections, achievements, and return play

**Goal:** provide optional long-term goals without manipulative retention.

Work:
- Add a collection/bestiary showing discovered plants, monsters, animals, and lore.
- Add achievements for meaningful mastery and exploration, not only repetitive counts.
- Add farm customization and cosmetic unlocks.
- Add daily and weekly challenges with rotating tactical conditions and fair rewards.
- Add a weekly boss or special encounter only when there is enough high-quality content to support it.
- Add limited-time events only if they are generous, understandable, and do not punish absence.
- Add optional goals for returning players: continue campaign, improve a prior score, complete a challenge, expand the farm, or discover a new collection entry.
- Keep all core content available without streak pressure. Never remove earned permanent content because the player did not log in.
- Make challenge generation data-driven and testable; avoid random combinations that are impossible with the allowed loadout.

Exit gate:
- Return activities offer real gameplay variety.
- Rewards are balanced against the main economy.
- Players understand what is optional and what is required.
- No punitive streaks, deceptive scarcity, or pay-to-win mechanics.

## Phase 8 — UI/UX, accessibility, localization, and device support

**Goal:** make the game comfortable and understandable across supported devices.

Work:
- Complete consistent menus, transitions, HUD, map, farm, collection, inventory, shop (if approved), settings, and result screens.
- Design touch-first controls for Android/iOS: tap selection, tap placement, clear drag behavior only where useful, large targets, no accidental placement, and safe-area support.
- Support desktop mouse and keyboard without sacrificing precision.
- Add resolution/aspect-ratio adaptation, scalable UI, readable text, and contrast options.
- Add accessibility options: independent music/effects, reduced screen shake/flashes, readable UI scale, color-independent status indicators, and control remapping where feasible.
- Establish localization infrastructure early enough to avoid hard-coded UI text. Arabic and English should be considered initial languages; validate right-to-left layout properly rather than merely translating strings.
- Test on real target devices and slower hardware.
- Package Windows desktop only after browser behavior is stable; mobile builds only after touch and performance tests pass.

Exit gate:
- Complete supported gameplay on each declared platform.
- No UI is clipped or inaccessible at supported resolutions.
- Touch actions are reliable and comfortable.
- Localization and RTL behavior are reviewed by native readers.

## Phase 9 — Quality, security, performance, and release candidate

**Goal:** turn the complete game into a stable product.

Work:
- Unit-test deterministic rules: costs, rewards, wave schedule, damage, health, unlocks, crafting, inventory, progression, save/load, and boss state transitions.
- Integration-test complete flows: start battle, plant, collect, kill, finish wave, win/lose, retry, return to farm, purchase/unlock, save, reload.
- Add end-to-end browser tests for critical screens and flows where stable automation is possible.
- Run manual playtests on target hardware and browsers.
- Profile frame rate, memory, asset loading, audio, scene cleanup, and long sessions.
- Verify no duplicated rewards, negative resources, lost progress, stale callbacks, dead input locks, or corrupted saves.
- Test offline/refresh behavior and recoverable save migration.
- Prepare privacy policy, terms, credits, third-party asset/license inventory, and data disclosures before any online accounts, analytics, ads, or purchases.
- Keep telemetry minimal, disclosed, and privacy-conscious.
- Create release candidate builds and regression checklists.

Exit gate:
- No known critical crash, progression blocker, or data-loss defect.
- All release-critical test cases pass.
- Performance meets agreed target-device budgets.
- All assets and audio have documented ownership/licenses.
- Support, privacy, and release materials are ready.

## Phase 10 — Launch, updates, and sustainable live operations

**Goal:** launch responsibly and maintain quality.

Work:
- Release a stable first version with a defined content scope.
- Monitor crash reports and voluntary feedback with transparent privacy practices.
- Fix stability and balance issues before rushing new content.
- Plan content updates around completed, tested features.
- Add new regions, plants, monsters, bosses, farm content, and challenges in coherent updates.
- Consider optional monetization only after players value the game and the economy is stable. Keep it fair, transparent, and non-essential.
- Maintain a public changelog and regression process.
- Do not promise multiplayer, guilds, chat, PvP, or live services as launch features; these are deferred until the single-player game succeeds and the team can support them.

Exit gate:
- Updates are stable, tested, and sustainable.
- Player feedback influences priorities without destabilizing the product.
- The team can maintain the game without compromising core quality.

---

## 5. Product systems inventory

This is the intended complete product map. Items are targets, not claims that they already exist.

| System | Purpose | Depends on |
|---|---|---|
| Main menu and navigation | Entry point and access to modes | Phase 1 |
| Battle grid and input | Precise lane/cell decisions | Phase 1 |
| Farmer movement and planting | Physical player interaction | Phase 1 |
| Plants and combat | Defense, production, damage, lifecycle | Phases 1–3 |
| Monster AI and bestiary | Lane pressure and special threats | Phases 1 and 4 |
| Energy and Coins | Separate tactical and reward economies | Phases 1–2 |
| Waves and bosses | Encounter pacing and milestones | Phases 1, 4, 6 |
| Battle HUD and results | Readability and feedback | Phases 1–2 |
| Audio and animation | Game feel and character | Phases 1–2 |
| Persistent save/progression | Preserve player investment | Phases 5–7 |
| Farm hub | Long-term home and resource loop | Phase 5 |
| Crops, animals, buildings, tools | Farm activity and production | Phase 5 |
| Inventory, crafting, trade | Resource conversion and choices | Phase 5 |
| World map and campaign | Long-form adventure | Phase 6 |
| Unlocks and loadouts | Strategic growth | Phases 3, 5, 6 |
| Collection and achievements | Mastery and discovery | Phase 7 |
| Daily/weekly challenges | Optional return goals | Phase 7 |
| Settings/accessibility/localization | Usable global experience | Phase 8 |
| Touch and desktop controls | Platform access | Phase 8 |
| Telemetry/privacy/release operations | Responsible quality improvement | Phases 9–10 |
| Monetization | Optional sustainable support | Post-core quality gate |

---

## 6. Development rules and phase governance

1. Work on `main` only according to the user's current repository workflow instructions. Inspect the actual branch and working state before editing.
2. Before implementing a feature, inspect current code and assets. Do not infer implementation from old documents.
3. Keep changes focused. Fix the root cause; do not hide gameplay bugs with visual offsets or unrelated rewrites.
4. A feature is not complete because code was committed. It is complete only after its acceptance criteria are tested.
5. Keep gameplay rules data-driven and separate from rendering wherever practical.
6. Keep asset loading, animation definitions, game rules, UI, audio, and persistence clearly separated.
7. Every UI action must lead to a real implemented behavior. No decorative/inert buttons.
8. Every economy change must be tested for exact costs, rewards, duplication, and invalid states.
9. Never silently replace approved art with unrelated placeholder characters.
10. No character shadows beneath sprites.
11. Do not start a later major phase while the current phase has unresolved exit-gate blockers.
12. Update `GAME_DEVELOPMENT_ROADMAP.md`, the relevant system document, and `BUILD_LOG.md` when implementation status changes.
13. Record evidence: commit, test command/result, browser/device tested, and remaining known issues.
14. Preserve approved user-created art; request explicit approval before destructive asset edits.
15. If an idea is attractive but not needed for the current phase, add it to the backlog rather than interrupting the phase.

### Definition of Done for every feature
- Its purpose and player-facing behavior are documented.
- Its dependencies and data ownership are clear.
- Valid and invalid actions are handled.
- It has appropriate rule/integration tests.
- Its UI, animation, sound, and feedback are complete for its scope.
- It does not regress existing gameplay.
- It has been tested in the running game where visual/runtime behavior matters.
- The build log records the result and any limitations.

---

## 7. Success metrics and playtest gates

Use these as initial hypotheses, then recalibrate with real playtest data. They are not promises or universal industry benchmarks.

### First-session comprehension
- Most new testers can state the objective and place their first defender without help.
- Target: 80% understand the basic objective within 3 minutes.
- Target: 70% complete the first meaningful defense action within 2 minutes after control begins.

### Fun and replay
- Ask testers whether they voluntarily want another round, and why.
- Initial target: at least 60% of testers choose to replay after their first completed attempt.
- Investigate any level where players quit repeatedly without understanding why.

### Return behavior
- After the game has enough campaign content, measure voluntary D1/D7 return rates in a privacy-conscious way.
- Early planning targets: D1 20–30%, D7 8–15%. Treat these as hypotheses, not guarantees; interpret them by platform, audience, sample size, and acquisition source.
- Improve return by improving game quality and meaningful content, not by punishment or pressure.

### Quality
- Zero known release-blocking crashes or progression blockers.
- All critical save/economy/wave rules covered by automated tests.
- No critical UI clipping on supported devices.
- Stable performance on the minimum declared target hardware.
- Track crash-free sessions and level completion only after transparent privacy decisions.

### Playtest questions
- What did you think the objective was?
- Which action felt satisfying?
- When did you feel confused or unfairly punished?
- Which plant/monster did you remember after the session?
- Did you want to replay? What would make you want to?
- Did you understand why you won or lost?

---

## 8. Estimated schedule and realistic scope

These are planning estimates, not guarantees. They assume one primary developer using AI-assisted coding, user-created art delivered progressively, regular playtesting, and no major team expansion. They include implementation, integration, balancing, and testing—not just writing code.

| Milestone | Estimated effort |
|---|---:|
| Phase 0 baseline and documentation | 1–2 weeks |
| Phase 1 first complete battle | 3–6 weeks |
| Phase 2 battle polish and balance | 2–4 weeks |
| Phase 3 first expanded plant roster | 4–7 weeks |
| Phase 4 monster roster and bosses | 4–7 weeks |
| Phase 5 persistent farm and economy | 8–14 weeks |
| Phase 6 campaign and world map | 6–10 weeks |
| Phase 7 collections and return challenges | 3–6 weeks |
| Phase 8 UX, localization, touch, packaging | 5–9 weeks |
| Phase 9 full QA and release candidate | 4–7 weeks |
| Phase 10 launch preparation and first live update | 2–4 weeks |

**Indicative total to a polished first global release: approximately 10–18 months** for one primary developer, depending heavily on art production, testing access, and how much content is included in the first release. A smaller, polished desktop single-player release could be achievable sooner—roughly 6–9 months—if the farm's deeper systems, mobile packaging, and live challenges are deliberately deferred. A larger content-rich game can take 18–24+ months.

The current project is not at Phase 1 completion yet. The most responsible next milestone is to close the battle prototype, not to start the farm, shop, daily challenges, or a large new roster. These estimates should be revised after Phase 1 is tested and its actual development velocity is known.

---

## 9. What the first public release should contain

Recommended minimum strong release:
- A polished, stable battle loop.
- A coherent campaign with multiple themed regions and meaningful progression.
- A deliberately selected roster of plants and monsters, including memorable boss encounters.
- A persistent farm with a small but complete crop/animal/building/economy loop.
- Save/load, achievements/collection, settings, tutorial, and replay.
- Desktop support first; mobile only when touch and performance are genuinely ready.
- Original art, animation, sound, localization, credits, and legal/ownership review.

Do not delay quality to maximize raw content count. A smaller set of excellent, balanced, memorable systems is better than many shallow systems.

---

## 10. Immediate next actions from the current project state

1. Inspect the current `main` branch and verify the exact state of the Phaser battle code and tests.
2. Fix and visually verify the hyena sinking/overlap behavior while eating a plant. Preserve its authored sprite sheets, stable size, hit flash, and no-shadow rule.
3. Verify the farmer's movement, planting, and return sequence with the latest user-edited sheets.
4. Verify Radish defense, Mushroom energy production/collection, monster damage, wave progression, home health, and victory/defeat.
5. Run the production build and the available automated rules tests; resolve failures that block Phase 1.
6. Complete the manual victory/defeat/restart/pause test matrix.
7. Record the Phase 1 evidence and close its gate before starting Phase 2.
8. When Phase 2 is reached, design and implement the post-stage treasure-cave ceremony; keep cave artwork pending until the user supplies it.

**Current phase status: Phase 1 — IN PROGRESS.** Existing code, prior commits, and rule tests are useful groundwork, but they do not replace browser verification and complete playthroughs.

---

## 11. Short game summary

Farm Vs Monsters is a hand-drawn 2D strategy-defense and farm-building game. The player protects a farm from monster waves using distinctive plants and the farmer's actions, collects energy to deploy defenses, earns Coins from defeated monsters, and gradually turns battle victories into a larger, living farm. The battle layer provides the immediate tactical fun; the farm, campaign, collection, and optional challenges provide long-term goals. Its identity comes from original characters, expressive animation, readable strategy, fair progression, and a world players care about.

**North star:** Make every battle fun on its own, every reward meaningful, and every new chapter introduce a reason to think differently.
