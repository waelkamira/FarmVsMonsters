# FARM VS MONSTERS — Development and Release Roadmap

## Agreed delivery path

- Keep the source repository private.
- Continue development in Godot 4.
- Publish browser review builds on a free host that supports private GitHub repositories; Cloudflare Pages is the planned host.
- Use the browser build for frequent gameplay review during development.
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
3. Browser builds and iterative review.
4. Android device testing and optimization.
5. Signed APK release.
