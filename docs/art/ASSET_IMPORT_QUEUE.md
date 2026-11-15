# FarmVsMonsters — Asset Import Queue

Updated: 15 November 2026

This queue turns the art direction into an importable, reviewable sequence. It deliberately separates UI assets from character assets.

## Priority 1 — UI foundation

| Priority | Pack | Contents | License stated by source | Decision |
|---|---|---|---|---|
| P1 | [Free Game UI Assets](https://freegameui.net/) | 2,316 SVG/PNG assets: 491 buttons, 255 panels, 144 gauges, 819 icons, decorations and gradients | CC0 1.0, as stated by the site | First choice for a consistent, recolorable UI base |
| P1 | [Kenney UI Pack](https://opengameart.org/content/ui-pack) | 430+ separate PNGs, sheets, vectors, fonts and sounds | CC0 | Secondary source for missing controls and neutral components |
| P2 | [Colorosse cartoon assets](https://www.colorosse.com/style/cartoon) | Shared-style cartoon UI families, panels, modals, navigation and shop widgets | CC-BY-4.0, as stated by the site | Visual reference / optional licensed supplement; retain attribution |
| P2 | [Retro Arcade UI Mini Pack](https://ianiffy230.itch.io/retroarcadeuiminipack) | Buttons, panels, bars, badges and banners | CC0 1.0, as stated by the source | Optional; use only if its pixel-art style can be harmonized |

### UI components to select first

1. Main menu: Play, Plants, Monsters, Shop, Settings, Account.
2. Battle HUD: energy meter, wave counter, home health, pause and speed controls.
3. Encyclopedia: plant/monster cards, locked/unlocked/owned states, category tabs and detail panel.
4. Dialogs: pause, settings, confirmation, victory, defeat and stage-complete.
5. Shared states: default, pressed, disabled, selected and focus.

### UI art direction filter

- Recolor and normalize selected components to the approved palette: green #42C96B, lime #A7E84F, violet #8B65E8, cyan #35BCEB, gold #FFCA45, coral #FF7185.
- Keep all text white and legible.
- Avoid dominant brown/wood panels.
- Prefer transparent PNG or SVG source and nine-slice-compatible panels.
- Do not mix pixel-art buttons with smooth glossy cartoon panels in the same screen.

## Priority 2 — Character animation candidates

| Pack | Contents stated by source | License stated by source | Decision |
|---|---|---|---|
| [SpriteCanvas Fantasy Monster Sprites](https://spritecanvas.itch.io/free-cc0-monster-sprites) | Slime, mushroom, goblin and golem; separate transparent PNG sheets and JSON atlases; idle, walk, attack, hurt and death | CC0 1.0 | Best first technical test pack; verify actual frame counts before using in battle |
| [Bevouliin Plant Monster](https://opengameart.org/content/bevouliin-free-sprite-sheets-plant-monster) | Transparent plant-monster PNGs | CC0 | Portrait/reference only unless a full animation is authored; source feedback reports very short animation |
| [Bevouliin Ground Monster](https://opengameart.org/content/free-ground-monster-sprite-sheet-for-game-developers) | Transparent monster sheet | CC0 listing | Inspect frame count, silhouette and style before selection |

The SpriteCanvas pack reports five states for each monster, but the pack description does not establish 24 frames per state. The 24-frame requirement remains a separate acceptance test.

## Import gates — must pass before runtime use

- [ ] Obtain original archive from the source page.
- [ ] Record exact source URL, creator, license, archive filename and retrieval date.
- [ ] Extract and inspect all files; do not trust preview images as proof of frame count.
- [ ] Generate a contact sheet and review style consistency.
- [ ] For every animation state, record actual frame count, cell width/height, FPS, pivot and direction.
- [ ] Reject or keep provisional any state with fewer than 24 genuine frames; never duplicate frames to inflate counts.
- [ ] Confirm transparent background and consistent ground pivot.
- [ ] Normalize naming and add a manifest entry.
- [ ] Wire encyclopedia portrait before battle animation.
- [ ] Run a focused battle scene smoke test to check clipping, scale jumps and animation transitions.

## Runtime import mapping

- UI buttons: web/public/assets/ui/buttons/
- UI panels and dialogs: web/public/assets/ui/panels/
- UI icons: web/public/assets/ui/icons/
- HUD: web/public/assets/ui/hud/
- Encyclopedia: web/public/assets/ui/encyclopedia/
- Plants: web/public/assets/characters/plants/<plant-id>/
- Monsters: web/public/assets/characters/monsters/<monster-id>/

## Honest current status

This queue and its source review are committed documentation only. No ZIP or image binaries have been imported, no runtime asset paths have been changed, and no new character has been enabled. The next implementation step requires retrieving the original binary archives, inspecting their contents, and committing approved files together with source/license notices.
