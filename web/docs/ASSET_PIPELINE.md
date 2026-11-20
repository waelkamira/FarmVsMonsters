# FarmVsMonsters Asset Pipeline

## Current runtime

The active browser game uses Next.js and Phaser 3. Existing `BattleScene.preload()` calls remain supported. `PhaserAssetManager` observes those legacy loads and also exposes grouped loading for gradual migration.

## Generate an inventory and audit

From the `web` directory:

```bash
npm run assets:manifest
```

This scans `public/assets` and writes both `public/assets/asset-manifest.json` and `public/assets/asset-audit.json`.

The manifest records:
- asset keys, URLs, types, logical groups, and byte sizes;
- image dimensions where supported;
- explicit frame metadata for known sprite sheets.

The audit report records:
- total asset count and bytes;
- per-group counts and byte totals;
- SHA-256 duplicate candidates;
- image files larger than 1.5 MiB and audio files larger than 3 MiB;
- sprite-sheet paths and their explicit frame configuration.

The generator is read-only with respect to source art. It does not resize, recompress, rename, or delete files. The audit thresholds are advisory, not automatic rejection rules.

## Runtime API

```js
import { PhaserAssetManager } from "../game/services/assetManager.mjs";

this.assetManager = new PhaserAssetManager(this);
await this.assetManager.loadManifest();
await this.assetManager.loadGroup("plants");
this.assetManager.releaseGroup("plants");
console.table(this.assetManager.getStats());
```

Manifest entries use explicit keys, URLs, and types. Known Phaser spritesheets used by the current battle scene have explicit frame metadata overrides in the generator. For any newly added spritesheet, add its exact `frameConfig` override before loading it. Inspect the source image dimensions and frame layout; never infer frame dimensions from filenames or force a universal crop.

Groups are reference-counted. Releasing a group removes only assets that this manager loaded and only after their final group reference is released. Call `releaseGroup` only after scene objects using those textures have been destroyed. Existing assets loaded by a scene's normal preload are not claimed or removed by the manager.

## Migration rules

1. Generate and inspect the manifest before converting any art.
2. Keep current PNGs and source spritesheets intact.
3. Use WebP only for static artwork after visual/alpha comparison; keep animation sheets in their current format until frame-by-frame validation.
4. Move optional screens and content to lazy groups first. Keep battle-critical assets in the current preload until a complete dependency list exists.
5. Never release a texture while a live Phaser Game Object or animation can still reference it.
6. Re-run the manifest generator after adding, removing, or replacing assets.

## Historical baseline

An earlier repository snapshot contained 88 supported assets totaling approximately 22.96 MiB (24,072,112 bytes). This is a historical file-size measurement, not a current inventory or runtime-memory estimate. Decoded texture memory can be much larger than the files on disk.
