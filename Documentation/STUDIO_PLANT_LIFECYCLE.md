# Studio Plant Lifecycle

This document defines the lifecycle for new plants authored in FarmVsMonsters Studio.

## 1. Draft upload

An upload creates or replaces one plant record in `web/game/data/studioAssetRegistry.json` on the configured Studio storage branch (normally `studio/assets`). The record remains `draft`; the published game catalog is not changed.

Plant upload includes the plant image/sprite sheet, rows and columns, cost, health, and combat profile.

### Combat profile rule

The plant behavior is always selected manually in Studio. Attaching a projectile image never changes the selected behavior.

- `projectile`: requires an attached or previously linked projectile; the projectile path is stored in the plant's combat profile.
- `melee`: damages the nearest monster in the same lane and within configured range.
- `contact`: damages a monster while it is stopped and biting the plant.
- `blocker`: absorbs bites and blocks the lane without attacking.
- `energy`: generates collectible energy on a configured interval.

A projectile is linked only when `projectile` is selected. Choosing another behavior removes the projectile association from the plant profile.

The profile stores bounded values for energy cost, health, cooldown, damage, range, projectile speed/radius, and energy production.

A legacy Studio plant record without a combat profile (for example an older Bamboo draft) must be replaced/saved once in the updated form and assigned a behavior or linked projectile before it can be prepared for testing. Built-in gameplay IDs are reserved and cannot be shadowed by custom Studio plants.

A projectile upload is associated with the plant record. It is not registered as a separate unlinked projectile record.

## 2. Prepare local test

The Studio action `prepare-test` changes the plant status to `testing` on the Studio branch. It does not publish the plant.

From the `web/` directory of the feature branch that contains the Studio lifecycle implementation, run:

```powershell
npm run studio:sync
```

The script reads `STUDIO_GITHUB_TOKEN` and `STUDIO_GITHUB_BRANCH` from `.env.local`, downloads all plants marked `testing` (including attached projectile images), and writes a local-only catalog to:

`public/assets/studio-test/plant-catalog.json`

The generated local test catalog is ignored by Git. Refresh/restart the local game after syncing. Test plants appear in Stage 1 seed selection and use their configured behavior in battle.

**Important:** `npm run studio:sync` and the game runtime catalog integration are part of the Studio feature branch. They are not available on `main` until the Studio feature PR is merged. Pulling `main` alone cannot add Studio plants to a game build whose runtime does not yet read the Studio catalog.

## 3. Publish

The Studio `publish` action is allowed only after a plant is `testing`.

It copies the plant image and its attached projectile (when applicable) from the Studio branch to `STUDIO_PUBLISH_BRANCH` (defaults to `main`), then upserts the plant into:

`web/public/assets/studio-plant-catalog.json`

Finally, the Studio registry record is marked `published`. The Studio-enabled game runtime reads this catalog and adds published plants to Stage 1 seed selection and the Phaser battle runtime.

This action updates the target Git branch; the hosting environment still needs to build/deploy that commit before the production website serves the new catalog and image files. **The feature code itself must be merged to the target branch before published plants can appear in that branch's game runtime.**

## Status transitions

`draft -> testing -> published`

Editing/replacing a plant returns it to `draft`, requiring a fresh local test before it can be published again.

## Safety and operational notes

- Plant and projectile assets are limited to the supported image formats and 8 MB per file.
- Plant IDs are lowercase slugs and remain stable during replacement.
- Plant and projectile images are copied before the published catalog is updated, so the catalog does not intentionally point to a not-yet-copied asset.
- GitHub Contents API writes are separate commits rather than one atomic multi-file transaction. A failed operation may leave an unreferenced file blob; the registry/catalog remains the source of truth.
- Local test images and catalog are intentionally not committed from the developer's working tree.
