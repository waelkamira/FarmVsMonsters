# AI-Generated 2D Art Asset Pipeline

This pipeline is the approved handoff from AI-generated concept art to Unity assets for Farm Vs Monsters.

## Non-negotiable art direction
- Original 2D hand-drawn cartoon characters; expressive, humorous and readable.
- Consistent outline weight, light direction, palette and painted shading across all units.
- Use classic garden-defense cartoon games only as broad style inspiration. Do not reproduce their characters, sprites, names, UI, backgrounds or animations.
- Do not introduce 3D, low-poly or photorealistic final assets.

## Folder contract
Create these folders under Assets/Art/ as assets arrive:
```text
Assets/Art/
  Characters/
    Individual/       # One complete character per transparent PNG
    SpriteSheets/     # Animation sheets, sliced in Unity Sprite Editor
    Concepts/         # Review sheets; never referenced by gameplay prefabs
  Environments/
    Farm/
    Battle/
    Props/
  Effects/
  UI/
  Tiles/
```

## Character naming
Use stable, readable IDs. Do not use display names as runtime identifiers.
- plant_energy_flower.png
- plant_seed_shooter.png
- monster_basic.png
- monster_armored.png

Animation sheets use one action per sheet, for example:
- plant_energy_flower_idle.png
- plant_energy_flower_attack.png
- monster_basic_walk.png
- monster_basic_hurt.png

Keep every frame the same dimensions, preserve character scale, and keep the ground contact point at the same pixel position in every frame. Do not place captions, frame numbers or decorative borders inside sheets.

## AI generation handoff
### Concept stage
1. Generate one character at a time, full body, with transparent background.
2. Review silhouette, face, color palette and readability at small gameplay size.
3. Keep the accepted concept as a reference image; do not use a multi-character concept board as a gameplay asset.
4. Save the approved image in Characters/Individual/.

### Production stage
1. Export PNG with transparency; avoid JPEG.
2. Prefer a source canvas of at least 1024 × 1024 for a standalone character.
3. Keep the whole character visible with comfortable transparent padding.
4. Generate separate action sheets only after the base design is approved.
5. Verify a clean alpha channel and no baked-in background unless intentional.

## Unity import defaults
The editor importer at Assets/Editor/CharacterSpriteImportSettings.cs applies:
- Texture Type: Sprite (2D and UI)
- Alpha is Transparency: enabled
- Mip Maps: disabled
- Filter: Bilinear
- Wrap: Clamp
- Compression: Uncompressed
- Max Texture Size: 4096
- Pixels Per Unit: 100

Individual images are imported as a single sprite with a bottom-center pivot. Animation sheets are imported as Multiple; frame slicing remains a deliberate manual step in Sprite Editor.

If the game art scale later requires a different Pixels Per Unit value, change the importer constant and keep it consistent across the entire character set. Do not mix PPU values between characters.

## Sprite sheet slicing checklist
1. Confirm Sprite Mode is Multiple.
2. Slice by Grid by Cell Size only when every frame has identical dimensions.
3. Confirm frame order from left to right, top to bottom.
4. Set each frame pivot consistently; use Bottom Center for grounded characters.
5. Apply and verify that the resulting sprite count matches the intended frame count.
6. Drag the frames into the matching SpriteAnimation2D.AnimationClip in the character prefab.

## Animation contract
The current SpriteAnimation2D component supports Idle, Walk, Attack, Hurt and Death.
- Idle: 5–8 FPS, loop
- Walk: 8–12 FPS, loop
- Attack: 8–12 FPS, usually non-looping
- Hurt: 8–12 FPS, non-looping
- Death: 6–10 FPS, non-looping

Missing clips are allowed during staged development, but each production prefab must eventually have an Idle clip and all states required by its gameplay role.

## Farmer runtime frame calibration

The browser battle scene measures each farmer frame's non-transparent alpha bounds once and caches the result. It then:
- Matches the visible character height to the first approved idle frame, regardless of source cell dimensions or transparent padding.
- Sets the sprite origin to the visible foot-contact edge and horizontal silhouette center for each frame.
- Reapplies calibration on animation frame changes so the character does not shrink, grow, or drift when switching between idle, walk, run, planting, and other actions.
- Falls back to the standard sprite scale if canvas pixel sampling is unavailable.

This is runtime alignment; it does not destructively crop or rewrite the source PNGs. Source sheets should still be reviewed and trimmed during art production when unwanted pixels or shadows are baked into the artwork.

## Review gate before accepting art
- [ ] Original design, not a copy of a protected game asset
- [ ] Full body and readable silhouette
- [ ] Transparent PNG with clean edges
- [ ] Consistent scale, outline and lighting
- [ ] No text, watermark or unwanted background
- [ ] Pivot/ground contact point is stable
- [ ] Sprite remains readable at actual gameplay size
- [ ] Animation frames have consistent dimensions and alignment

## Current limitation
The importer automates texture defaults only. It does not generate missing animation frames, auto-slice sheets, create prefabs, or prove that an asset looks correct in-game. Those steps require Unity Editor review and scene testing.