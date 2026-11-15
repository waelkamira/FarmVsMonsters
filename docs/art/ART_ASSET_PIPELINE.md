# 2D Art & Game UI Asset Pipeline

Status: approved direction; asset import is pending binary downloads and visual review.

## Approved visual direction

- Original 2D cartoon fantasy art, inspired by the broad readability and playful proportions of lane-defense games; do not copy Plants vs. Zombies characters, logos, UI, or proprietary artwork.
- Transparent PNG character art; consistent outline weight, lighting direction, saturation, scale, and ground pivot.
- UI uses bright plant/monster colors with a light glass treatment: translucent surfaces, restrained white blur/highlights, subtle pale borders, rounded corners, and clear depth.
- All UI text is pure white. Avoid dominant brown surfaces.
- Suggested palette: leaf green #42C96B, lime #A7E84F, violet #8B65E8, sky #35BCEB, gold #FFCA45, coral #FF7185.

## Target content

### Character encyclopedia
- 100 plants and 100 monsters are visible in the encyclopedia from the beginning.
- Entries unlock progressively through campaign progress. A visible/known entry is not automatically owned, purchasable, implemented, or selectable in battle.
- Each entry needs stable ID, localized names/descriptions, category, unlock condition, rarity, portrait path, animation paths (when implemented), gameplay status, and source/license metadata.
- Only fully implemented and balance-checked plants/monsters may be purchased or spawned in battle.
- Initial plant categories: attackers, defenders, energy producers, slowing/ice, fire/explosive, poison/magic, rare/special.
- Initial monster categories: ground, fast, armored, flying, elemental, magical, leaders/bosses.
- Do not fabricate 100 functional abilities in the catalog. Add encyclopedia records progressively and mark their implementation state accurately.

### Animation requirements
- Target: 24 frames per required movement/action state, using separately authored sheets per state.
- Required states depend on character role; common monster states include idle, walk, run, bite/attack, hurt, and death. Plant states may include idle, attack, hit, and special ability.
- Preserve a consistent cell size, transparent padding, facing direction, feet/ground pivot, and frame timing within a character.
- Existing packs with fewer than 24 frames are provisional art only. Do not stretch, duplicate, or claim they meet the 24-frame requirement.
- Phaser atlas/animation metadata must declare actual frame dimensions, frame count, frame rate, and pivot. Verify no frame causes scale or position jumps.

## UI asset inventory

Create a cohesive reusable UI set for:
- Primary/secondary/destructive/disabled buttons, icon buttons, pressed/hover/focus states.
- Glass panels, modal windows, tabs, tooltips, badges, ribbons, cards, separators, and notification toasts.
- Plant/monster encyclopedia cards, locked/unlocked/owned states, rarity markers, shop cards, and campaign-stage cards.
- Energy, coins, home health, plant health, wave, defeated-monster, and progress indicators.
- Pause, settings, sound, language, account, achievements, campaign map, victory, defeat, and confirmation dialogs.
- Nine-slice panels/buttons where scaling is required; keep hit areas comfortably tappable on mobile.

## Repository layout

- `web/public/assets/characters/plants/<plant-id>/`
- `web/public/assets/characters/monsters/<monster-id>/`
- `web/public/assets/ui/buttons/`
- `web/public/assets/ui/panels/`
- `web/public/assets/ui/icons/`
- `web/public/assets/ui/hud/`
- `web/public/assets/ui/encyclopedia/`
- `web/public/assets/ui/menus/`
- `web/game/data/plantCatalog.mjs`
- `web/game/data/monsterCatalog.mjs`
- `web/game/data/artManifest.mjs`

Keep original ZIPs and license/source notices outside runtime folders (for example, `docs/art/sources/` or a dedicated asset-source archive). Runtime code should reference local, versioned assets rather than hotlinking third-party CDNs.

## Candidate sources reviewed (15 November 2026)

### UI
1. Kenney UI Pack — 430+ 2D UI sprites, separate PNGs, sprite sheets and vector sources; CC0.
   - https://kenney.nl/assets/ui-pack
   - https://kenney-assets.itch.io/ui-pack
2. Kenney UI Pack — Adventure — 130 UI elements; CC0.
   - https://kenney.nl/assets/ui-pack-adventure
3. Kenney Fantasy UI Borders — 130+ fantasy/RPG window and dialog elements; CC0.
   - https://kenney-assets.itch.io/fantasy-ui-borders
4. Free Game UI Assets — icons, buttons, panels, gauges, gradients and decorations; site states CC0 and PNG/SVG downloads.
   - https://freegameui.net/

### Characters
1. SpriteCanvas Free CC0 Fantasy Monster Sprites — four animated monsters (slime, mushroom, goblin, golem), transparent PNG sheets and JSON atlas; idle/walk/attack/hurt/death. The pack is AI-assisted and does not satisfy the 24-frame requirement automatically.
   - https://spritecanvas.itch.io/free-cc0-monster-sprites
2. Bevouliin Free Flower Plant Monster Sprite Sheets — transparent PNGs; CC0 listing. Inspect actual animation/frame content before integration.
   - https://opengameart.org/content/bevouliin-free-sprite-sheets-plant-monster
3. Bevouliin Free Ground Monster Sprite Sheet — transparent PNGs; CC0 listing. Inspect art style and animation completeness before integration.
   - https://opengameart.org/content/free-ground-monster-sprite-sheet-for-game-developers
4. Bevouliin Free Walking Monster Sprite Sheets — transparent PNGs; CC0 listing. Inspect actual frame count and pivot before integration.
   - https://opengameart.org/content/bevouliin-free-sprite-sheets-monster-game-asset

## Import and acceptance checklist

- [ ] Download each original pack and inspect its contents before choosing individual assets.
- [ ] Confirm the license on the original source page and preserve the license/source notice with the imported files.
- [ ] Reject assets with unclear provenance, incompatible license, watermarks, non-transparent backgrounds, or visibly mismatched art direction.
- [ ] Create contact sheets and approve a small representative sample before importing a large batch.
- [ ] Normalize transparent canvas, pixel density, naming, pivot, and export format without distorting the artwork.
- [ ] Use local project paths; do not rely on third-party hotlinks in production.
- [ ] Add manifest entries for source, license, dimensions, animation states, actual frame counts, and implementation status.
- [ ] Wire the encyclopedia portrait first; wire battle animations only after atlas validation.
- [ ] Verify locked entries are visible but cannot be purchased, equipped, or spawned prematurely.
- [ ] Review all buttons, panels, menus, and HUD elements together for visual consistency.
- [ ] Run the web build and focused battle/encyclopedia smoke checks after assets are imported.

## Current implementation note

The current catalog thumbnail component still uses Twemoji as a temporary fallback. This document does not claim that external packs have been downloaded or imported. Binary assets must be downloaded, visually inspected, and committed before changing runtime paths away from the current fallback.
