# FarmVsMonsters — Game Design Document

## Current product vision

FarmVsMonsters is a colorful 2D farm-and-battle game built around a persistent farm, collectible plant defenders, tactical monster battles, progression, and exploration. The goal is a welcoming game for a broad family audience with enough strategic depth for experienced players.

The active implementation is **Next.js + React + Phaser 3** in `web/`. The Godot project is paused and retained as reference only. Do not interpret older Unity/Godot prototype notes as the active technical direction.

## Core pillars

1. **Farm:** grow plants, collect resources, improve the home base, and prepare for battles.
2. **Battle:** place plant defenders, manage resources and cooldowns, survive enemy waves, and defeat bosses.
3. **Discovery:** collect plants, unlock upgrades and abilities, and experiment with transparent combination rules.
4. **Exploration:** unlock regions with distinct environments, enemies, plants, and battle mechanics.

## Core loop

Prepare the farm → collect resources → choose a plant team → defend against monster waves → earn rewards → unlock or improve plants and territory → return to the farm.

## First vertical-slice target

The first polished slice should be small and complete. Planning targets are up to 10 usable plants, 6 monster archetypes, one boss, one region, and around 10 stages, adjusted after inventory and balance review.

A new player should be able to:
- Start the game and understand the objective quickly.
- Select and place defenders.
- See clear attack, damage, and enemy feedback.
- Complete several battles and understand victory/defeat.
- Receive rewards and use them for a meaningful unlock or upgrade.
- Return to play with progress preserved.

## Design principles

- Readability before visual complexity.
- Every plant and monster has a recognizable silhouette, role, and feedback.
- Preserve approved artwork and animation crops unless verified evidence requires change.
- Difficulty comes from enemy patterns and strategic choices, not unfair surprise.
- Short sessions should feel complete and rewarding.
- Discovery and social sharing should arise from memorable play, not manipulative pressure.
- Keep monetization optional and fair, with cosmetic-first options and no pay-to-win combat advantage.

## Audience and growth

The game should be understandable to younger players while offering strategic mastery for older players. Validate this with playtests rather than assumptions. Track onboarding completion, battle completion, D1/D7/D30 retention, session depth, crashes, performance, and voluntary shares.

## Explicitly deferred

- Real-time PvP/co-op and complex networking.
- Guilds, global chat, and player marketplaces.
- Large-scale seasonal live operations.
- Paid user acquisition before core-loop retention is validated.
- Rewriting the active game in another engine.
