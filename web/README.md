# FARM VS MONSTERS — Active browser game

The active game is **Phaser 3 + Next.js + React**. This is the canonical development project. All gameplay features, art integration, balancing and playtesting happen here and are reviewed in Google Chrome on Windows.

The Godot project in `../godot/` is paused and retained as a reference. Do not port new features to Godot while this decision is active.

## Start in Chrome (Windows)

1. Install Node.js LTS once if it is not already installed: https://nodejs.org/
2. Double-click `OPEN_IN_CHROME.bat`.
3. On first launch, the script runs `npm ci` to install the exact dependencies from the lockfile. Later launches reuse the installation.
4. The script starts the Next.js development server and opens `http://localhost:3000` in Chrome.
5. Keep the command window open while playing. Press Ctrl+C to stop the server.

This is a local-only server. It does not publish the game or expose it as a public website.

## Manual commands (optional)

```bash
cd web
npm ci
npm run dev
```

Open http://localhost:3000.

## Gameplay controls

- Click a plant card, then click an empty soil cell to plant.
- WASD / arrow keys: move the Farmer.
- Space: emergency club attack when the defensive plants have been destroyed.

## Project checks

```bash
npm test
npm run lint
npm run build
```

Gameplay behavior and rules live in `game/scenes/BattleScene.js` and `game/rules/`. Preserve the canonical combat contract and add tests for gameplay rule changes.

## Platform plan

- Now: Phaser browser game, local Chrome testing on Windows.
- Later: package the completed browser game as Android APK using an appropriate web-to-Android wrapper. APK creation is explicitly deferred until the game is complete.
