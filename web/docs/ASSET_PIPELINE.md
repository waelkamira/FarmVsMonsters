# FarmVsMonsters Asset Pipeline

## Current runtime

The web game uses Next.js and Phaser 3. `BattleScene.preload()` remains the source of truth for battle-critical assets. `PhaserAssetManager` observes that existing loader queue without changing asset keys, URLs, frame boundaries, or load order. Its reference-counted group API is available for a later, dependency-audited migration; optional groups are not loaded lazily yet.

The manager is created during battle preload and releases its loader listeners when the scene shuts down. This keeps telemetry scoped to the active scene and avoids changing the gameplay asset lifecycle.

## Generate an inventory

Run from the `web` directory:

```bash
npm run assets:manifest
```

The generator scans `public/assets` and writes two generated files:

- `public/assets/asset-manifest.json`: asset keys, URLs, types, groups, file sizes, SHA-256 hashes, supported image dimensions, and explicit spritesheet frame metadata.
- `public/assets/asset-audit.json`: total size, group totals, byte-identical duplicate candidates, large files, and spritesheet summaries.

It also rejects duplicate runtime keys before a manifest can be produced. The generator does not resize, recompress, rename, or delete source art. Both generated JSON files are ignored by Git because they are derived from the checked-out asset set. SVG dimensions are read from the root `viewBox` when available; otherwise the root `width` and `height` attributes are parsed independently.

The manifest is generated automatically before `npm run dev`, `npm test`, and `npm run build`. The test suite checks that every manifest entry points to an existing file, its recorded byte size matches the source, keys are unique, group summaries agree, and spritesheets have explicit positive frame dimensions.

## Runtime API

```js
import { PhaserAssetManager } from "../services/assetManager.mjs";

this.assetManager = new PhaserAssetManager(this);
await this.assetManager.loadManifest();
await this.assetManager.loadGroup("plants");
this.assetManager.releaseGroup("plants");
console.table(this.assetManager.getStats());
```

Manifest entries use explicit keys, URLs, and types. Known spritesheets have exact frame metadata overrides in the generator. Add a matching `frameConfig` override before introducing a new spritesheet; never infer frame dimensions from filenames.

Groups are reference-counted. Releasing a group removes only assets loaded by the manager and only after the final reference is released. Call `releaseGroup` only after scene objects and animations using those textures have been destroyed. Assets loaded by the legacy scene preload are not claimed or removed by the manager.

## Migration rules

1. Generate and inspect the manifest after adding, removing, or replacing art.
2. Keep current PNGs and source spritesheets intact.
3. Use WebP only for static artwork after visual and alpha-channel comparison; keep animation sheets in their current format until frame-by-frame validation.
4. Move optional screens and content to lazy groups first. Keep battle-critical assets in the current preload until their full dependency list is documented and tested.
5. Never release a texture while a live Phaser Game Object or animation can still reference it.
6. Treat the generated audit as the baseline for the current branch. Asset counts and byte totals can differ between branches and must not be copied from another branch's report.

Decoded texture memory can be much larger than the corresponding files on disk; the audit reports file sizes, not runtime GPU memory.
