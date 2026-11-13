# Technical Architecture

## Stack
- Unity 3D, C#, Universal Render Pipeline (URP).
- Unity Input System for keyboard/mouse and touch.
- ScriptableObjects for units, stages, waves, abilities, and balance data.
- Addressables for scalable content delivery when content volume justifies it.

## Scene boundaries
Boot, MainMenu, Farm, Battle, WorldMap, Loading, Test.

## Runtime layers
Core (bootstrap, service access, events), Input, Gameplay, Combat, Characters, Plants, Animals, Enemies, Farmer, Farm, Buildings, Inventory, Economy, Progression, Quests, World, AI, Abilities, UI, Audio, SaveSystem, Platform, Utilities.

## Rules
- Keep gameplay data separate from scene presentation.
- Prefer composition and small focused components over monolithic managers.
- Use ScriptableObjects for authored content and tuning.
- Save stable IDs and primitive state, not scene object references.
- Keep platform-specific code behind interfaces.
- Add assembly definitions as system boundaries become real; avoid premature fragmentation.

## Initial validation
Windows is the primary development target. Android touch input is validated throughout development; iOS is the release target. No multiplayer architecture is required for the prototype.