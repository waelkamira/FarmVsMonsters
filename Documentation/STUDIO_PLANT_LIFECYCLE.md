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

## 2. Prepare and test

The Studio action `prepare-test` changes the plant status to `testing` on the Studio storage branch. It does not publish the plant.

The authenticated game runtime requests `/api/studio/assets?catalog=testing` directly. The API reads the testing registry from `STUDIO_GITHUB_BRANCH` and proxies the plant and linked projectile images through the signed Studio session. No terminal sync command, manual file copy, or generated local catalog is required.

After preparing the plant, refresh the game page and open Stage 1 seed selection in the same authenticated browser session. Testing plants appear in the seed bank and use their saved combat profile in battle. Test the actual attack range, target selection, animation timing, projectile movement, collision, and damage before publishing.

**Important:** `npm run studio:sync` and the game runtime catalog integration are part of the Studio feature branch. They are not available on `main` until the Studio feature PR is merged. Pulling `main` alone cannot add Studio plants to a game build whose runtime does not yet read the Studio catalog.


## Editing an existing asset

Selecting `تعديل` on a registered asset opens the same editor with its current metadata. A replacement file is optional: leaving the file input empty preserves the existing image/audio file while saving metadata or plant combat-profile changes. Every saved edit returns the asset to `draft`; it must be prepared and tested again before publishing.

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
- Plant and projectile file storage paths are immutable SHA-256 content-addressed revisions. Replacing a file changes the registry path to a new content hash; the user-facing filename remains readable and stable.
- GitHub-backed image writes verify existing content-addressed paths before reuse and never overwrite a different file at the same immutable path.
- Registry and published-catalog writes compare the original blob SHA with the current GitHub blob and reject stale snapshots with HTTP 409. This prevents silent lost updates, but does not make the multi-file publish sequence atomic.
- Old image revisions and unreferenced uploads are retained until a future cleanup process can prove they are not referenced by any published catalog or rollback.
- Plant and projectile images are copied before the published catalog is updated, so the catalog does not intentionally point to a not-yet-copied asset.
- GitHub Contents API writes are separate commits rather than one atomic multi-file transaction. A failed operation may leave an unreferenced file blob; the registry/catalog remains the source of truth.
- Local test images and catalog are intentionally not committed from the developer's working tree.
