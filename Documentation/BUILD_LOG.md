# Build Log — Farm Vs Monsters

## 2026-11-13 — Repository foundation
- Created private GitHub repository `waelkamira/FarmVsMonsters` on branch `main`.
- Added project README and repository hygiene files.
- Initial implementation has started: `TeamId`, `Health`, `DamageDealer`, and `EnergyWallet` C# components are committed under `Assets/Scripts/`.
- No Unity project settings, scenes, prefabs, input wiring, or 3D models have been committed yet.

## Next implementation milestones
1. Pin a Unity LTS version and configure URP + Input System.
2. Create Boot, MainMenu, Farm, Battle, and Test scenes.
3. Implement player movement, camera, grid placement, energy, plant combat, enemy waves, win/loss, rewards, and save/load.
4. Build a playable Windows prototype, then validate Android touch controls.

## 2026-11-13 — First gameplay code
- Added `Core/TeamId.cs` for Player/Monsters/Neutral allegiance.
- Added `Combat/Health.cs` with damage, healing, death event, and reset.
- Added `Combat/DamageDealer.cs` with team-aware friendly-fire prevention.
- Added `Economy/EnergyWallet.cs` with capped balance, atomic spend checks, and change events.
- Verification: files were committed to `main` and are being checked through GitHub file reads. Unity compilation has not yet been run.
