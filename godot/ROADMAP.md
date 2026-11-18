# FARM VS MONSTERS — Development and Release Roadmap

## Agreed delivery path

- Keep the source repository private.
- Continue development in Godot 4.
- Do not publish or deploy the game during development.
- Build and run the Web export locally on the user's own computer, then test it in a local browser (Chrome/Edge) over localhost.
- Keep all review builds local and the GitHub source repository private.
- Maintain one shared Godot project for browser and Android; do not rebuild gameplay separately for APK.
- Before release, validate Android touch input, landscape orientation, performance, offline operation and device compatibility.
- Produce and sign the complete Android APK from the same Godot project after the game is complete.

## Immediate gameplay review target

- Provide a dedicated main-menu test entry for Snow Thrower vs Hyena.
- Guarantee one Hyena and one Snow Thrower in the same lane.
- Verify projectile launch, collision, freeze duration (2.6 seconds), stopped movement/attacks, and return to normal movement after thawing.
- The frozen Hyena PNG assets are imported, but their sprite-sheet layout must be visually confirmed before using them as animated combat replacements. Until then, the in-game freeze uses a temporary blue tint.

## Release sequence

1. Controlled combat tests and visual asset verification.
2. Complete the remaining plants, monsters, waves, effects, audio and UI.
3. Local browser builds and iterative review on the user's computer (no hosting or public deployment).
4. Android device testing and optimization.
5. Signed APK release.
