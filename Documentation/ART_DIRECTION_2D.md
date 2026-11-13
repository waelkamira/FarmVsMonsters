# Farm Vs Monsters — 2D Art Direction

## Approved visual direction

The approved direction is **hand-drawn 2D cartoon art inspired by the visual language of the original Plants vs. Zombies**, not a 3D/low-poly style.

This is an original game. Use the reference for broad visual qualities only; do not copy protected Plants vs. Zombies characters, sprites, UI, backgrounds, names, or animations.

## Character design
- Plants and monsters are expressive illustrated characters with readable silhouettes.
- Use exaggerated faces, clear eye direction, readable mouths, and playful comic expressions.
- Shapes should feel organic and slightly exaggerated, not geometric primitives.
- Keep outlines clean and consistent; use soft painted shading and controlled highlights.
- Each unit needs a distinct silhouette that remains readable at normal gameplay scale.
- Monster designs should be humorous and slightly spooky rather than realistic or graphic.

## Palette and rendering
- Rich garden greens, warm soil browns, sunny yellows, and selective saturated accent colors.
- Painted gradients and soft highlights; avoid flat vector-only fills and hard low-poly facets.
- Use consistent light direction and outline thickness across characters, props, and environment.
- Keep gameplay backgrounds lower in contrast than foreground units.

## Animation
- Use sprite sheets / frame-based animation for Idle, Walk, Attack, Hurt, and Death.
- Plants should communicate attack wind-up and recoil clearly.
- Monsters should have readable walk cycles, hit reactions, and defeat animations.
- Effects (projectiles, impact, dust, reward pickups) should be illustrated 2D sprites.

## Camera and gameplay readability
- Battle presentation is a side-view 2D lane/grid layout with clear rows and columns.
- The farm hub should also use illustrated 2D environments and sprite characters.
- Use orthographic camera, SpriteRenderer, sorting layers, and 2D colliders.
- Avoid mixing primitive 3D stand-ins into final gameplay scenes.

## Technical migration policy
- Existing economy, progression, crop, animal, production, storage, and market domain logic can be retained where it is presentation-independent.
- The existing 3D battle controllers and generators are legacy prototypes, not the approved visual target.
- New battle presentation code should use Physics2D, SpriteRenderer, and 2D-specific grid/placement/combat components.
- Do not call the project visually complete until original sprite assets, animation frames, backgrounds, UI art, and effects have been created and reviewed.
- Unity Editor compilation and Play Mode verification are required before calling the 2D prototype playable.
