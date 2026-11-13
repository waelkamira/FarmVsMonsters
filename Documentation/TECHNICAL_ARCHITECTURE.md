# Technical Architecture — 2D Web Rebuild

## Primary stack
- Next.js App Router for the application shell, navigation, account-facing UI, and web delivery.
- React for interface components.
- JavaScript (ES modules) for the new application and gameplay integration.
- Phaser 3 as the dedicated 2D real-time game engine.
- PostgreSQL is the planned persistence layer for accounts, player progress, inventory, unlocks, and economy when backend integration begins.

## Runtime boundaries
- `web/app`: Next.js routes and page-level UI.
- `web/game`: Phaser bootstrap and scenes.
- `web/game/scenes`: battle, farm hub, menus, and future world-map scenes.
- `web/game/entities`: plants, monsters, caveman, princess, and animals.
- `web/game/systems`: grid, planting, combat, projectiles, waves, buildings, farming, progression, and save adapters.
- `web/public/assets`: approved 2D sprite sheets, backgrounds, UI art, sound, and effects.

## Core architectural rules
- Keep gameplay simulation separate from React presentation.
- Phaser owns the real-time update loop, input, 2D rendering, animations, and collision/gameplay timing.
- Next.js owns navigation, account UI, settings, and non-real-time application surfaces.
- Plants are stationary entities; only their idle/attack/hurt/death visual states animate.
- Monster movement is slow in early waves and scales gradually with progression.
- Caveman damage output is gated by the emergency state: zero living defensive plants after the player has planted at least one defender.
- Planting a new living defender exits emergency combat immediately.
- Use original hand-drawn 2D assets only. No 3D/low-poly pipeline is planned.

## Migration policy
- Existing Unity scripts and documents remain as legacy reference material during the rebuild.
- Reimplement systems in small vertical slices and verify the browser build before marking a system complete.
- Do not delete the Unity reference until the replacement feature has equivalent behavior and has passed its own checks.
- Keep save data based on stable IDs and serializable values, not scene object references.
