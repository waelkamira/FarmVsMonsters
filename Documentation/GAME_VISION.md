# FarmVsMonsters — Game Vision

## Product direction

FarmVsMonsters is a colorful, character-led farm-and-battle game. The player grows and manages a personal farm, discovers and develops plant defenders, protects the farm from monster attacks, and gradually explores new regions.

**Primary growth priority:** earn organic discovery and sharing through genuinely entertaining gameplay moments. Do not optimize for downloads at the expense of player enjoyment, child safety, fair play, or long-term trust.

## Audience promise

- New players can understand the first objective quickly and reach a satisfying first battle without a long tutorial.
- Younger players can enjoy expressive characters, collection, discovery, and a welcoming world.
- Older players can enjoy tactical placement, resource decisions, enemy patterns, progression, and mastery.
- Every session should offer a clear, satisfying stopping point; retention must come from fun and meaningful progress, not coercive timers or fear-of-missing-out pressure.

## Four connected pillars

1. **The Farm:** a persistent home where players grow, collect, build, and prepare.
2. **The Battlefield:** readable, tactical lane/grid defense with waves, special enemies, and bosses.
3. **The Plant Lab:** collection, upgrades, abilities, and carefully designed discovery/combination systems.
4. **Exploration:** new regions with distinct visual identity, enemies, plants, and battle rules.

These are one progression system, not four disconnected game modes.

## Core player loop

Prepare the farm → collect resources → select and develop a plant team → defend against monster waves → earn rewards → unlock discoveries or territory → improve the farm → choose the next challenge.

## Differentiation

- A persistent farm gives battles a visible purpose and makes rewards tangible.
- Plants and monsters should be expressive, recognizable characters with signature motion, sound, and combat roles.
- Discovery should reward experimentation and strategic understanding, not opaque random grinding.
- Shareable moments should emerge naturally: rare discoveries, clever combinations, close victories, boss defeats, and creative farm layouts.

## Growth principles

- Optimize the first-session experience before adding large amounts of content.
- Measure D1, D7, D30 retention, tutorial completion, battle completion, session depth, and voluntary shares.
- Test short-form creative concepts with real players; views alone are not success.
- Use accessible localization, store presentation, and creator partnerships only after the core loop is validated.
- Keep monetization optional and fair. Do not sell competitive power or use manipulative purchase pressure, especially for a family audience.

## Technical guardrails

- Active game: Next.js + React + Phaser 3 under `web/`.
- `godot/` is paused and retained as reference; do not move active features there.
- Preserve approved art, sprite crops, animation settings, asset keys, and gameplay contracts unless a verified issue requires a deliberate change.
- Load assets by need, release unused resources safely, and profile decoded texture memory rather than judging performance by PNG file count alone.
- Every feature must have an owner, dependencies, acceptance criteria, and a verification record.
