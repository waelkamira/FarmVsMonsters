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

Any legacy Studio plant record without a combat profile must be edited and saved once in the updated form, with a behavior or linked projectile assigned, before it can be prepared for testing. Built-in gameplay IDs are reserved and cannot be shadowed by custom Studio plants.

A projectile upload is associated with the plant record. It is not registered as a separate unlinked projectile record.

## 2. Prepare and test

The Studio action `prepare-test` changes the plant status to `testing` on the Studio storage branch. It does not publish the plant.

The authenticated game runtime requests `/api/studio/assets?catalog=testing` directly. The API reads the testing registry from `STUDIO_GITHUB_BRANCH` and proxies the plant and linked projectile images through the signed Studio session. No terminal sync command, manual file copy, or generated local catalog is required.

After preparing the plant, refresh the game page and open Stage 1 seed selection in the same authenticated browser session. Testing plants appear in the seed bank and use their saved combat profile in battle. Test the actual attack range, target selection, animation timing, projectile movement, collision, and damage before publishing.

**Important:** `npm run studio:sync` and the game runtime catalog integration are part of the Studio feature branch. They are not available on `main` until the Studio feature PR is merged. Pulling `main` alone cannot add Studio plants to a game build whose runtime does not yet read the Studio catalog.


## Editing an existing asset

Selecting `تعديل` on a registered asset opens the same editor with its current metadata. A replacement file is optional: leaving the file input empty preserves the existing image/audio file while saving metadata or plant combat-profile changes. Every saved edit returns the asset to `draft`; it must be prepared and tested again before publishing.

## Version history and restore

Every new asset starts at revision 1. Saving edits creates a new revision and stores the previous metadata, immutable asset path, sprite-sheet settings, and combat profile in the asset's version history. The previous image/projectile files remain available because asset paths are content-addressed and are not overwritten.

The Studio library displays the current revision and lets an administrator select a saved revision to restore. Restoring does not rewind the revision counter or change the live game catalog: it creates a new revision from the selected snapshot, marks it as `draft`, and requires another prepare/test/review cycle before publication.

## 3. Request publication through a reviewed release

The Studio `publish` action is available only after an asset is `testing`. The administrator must first prepare the asset, open the game, and manually verify its actual Phaser gameplay behavior. Studio does not write the published asset or catalog directly to `STUDIO_PUBLISH_BRANCH` (defaults to `main`).

The action:

1. Validates the asset type, saved gameplay profile, safe asset paths, referenced rig parts, frame indices, and linked projectile when applicable.
2. Reads the immutable artwork and every referenced binary dependency from the Studio storage branch.
3. Creates a unique `studio/release/<asset-id>-<suffix>` branch from the configured game target branch.
4. Stages the asset, referenced rig-part files, linked projectile, and updated published plant or monster catalog together on that release branch.
5. Opens a GitHub pull request targeting `STUDIO_PUBLISH_BRANCH`.
6. Marks the Studio registry record as `approved` and stores the pull-request number, URL, and release branch.

The game branch and its published catalog remain unchanged until a reviewer checks the pull-request diff and merges it. Studio never merges the release pull request automatically. Before merge, complete the live Phaser gameplay/browser verification for the exact revision represented by the request.

The GitHub token requires `Contents: Read and write` and `Pull requests: Read and write`. The Studio storage branch (`STUDIO_GITHUB_BRANCH`, normally `studio/assets`) must be different from the game target branch. Upload and lifecycle APIs reject equal branch configuration to prevent accidental direct changes to the game branch.

If a release request is already open, repeating the publish action returns the existing request instead of creating another. If the request is merged, Studio reconciles the asset as `published`. If it is closed without merging, the asset returns to `testing` and can be reviewed again. Incomplete staging branches are cleaned up when no pull request was successfully created; if the result of pull-request creation is uncertain, the branch is retained rather than risking deletion of a branch that may be under review.

The release branch includes the complete referenced rig-part set and linked projectile, not only the primary image. The published catalog is staged in the same branch as those files, so reviewers can inspect the complete content change as one pull request.

## 4. Archive and restore

The Studio library offers a reversible archive action for draft and testing plants. Archiving changes the registry status to `archived` and hides the plant from the testing catalog; it does not delete the plant image, projectile, or metadata. The restore action returns the plant to `draft`, after which it must be prepared and tested again.

A plant with an open release request cannot be archived until that request is closed. A closed, unmerged request returns the asset to `testing` before archiving. A plant whose release request has been merged is already published and cannot be archived through this action; removing it from the live catalog requires a separate reviewed release change. Hard deletion is limited to unpublished, unreferenced assets in the Studio storage branch. Published assets and files referenced by a published catalog cannot be deleted directly; their removal requires a separate reviewed release change.

## Status transitions

`draft -> testing -> approved -> published`

`draft/testing -> archived -> draft`

Editing/replacing an asset returns it to `draft`, requiring a fresh gameplay test before requesting publication review.

## Safety and operational notes

- Plant and projectile assets are limited to the supported image formats and 8 MB per file.
- Plant IDs are lowercase slugs and remain stable during replacement.
- Plant and projectile file storage paths are immutable SHA-256 content-addressed revisions. Replacing a file changes the registry path to a new content hash; the user-facing filename remains readable and stable.
- GitHub-backed image writes verify existing content-addressed paths before reuse and never overwrite a different file at the same immutable path.
- GitHub registry writes compare the original blob SHA with the current GitHub blob and reject stale snapshots with HTTP 409. The release pull request groups the game-facing files and catalog into one reviewable branch; the separate Studio registry status update can still report a synchronization warning.
- Old image revisions and unreferenced uploads are retained until a future cleanup process can prove they are not referenced by any published catalog or rollback.
- Plant, projectile, and rig-part images are staged on the release branch before the published catalog is updated there, so the catalog does not intentionally point to a not-yet-staged asset.
- GitHub Contents API writes are separate commits rather than one atomic multi-file transaction. A failed operation may leave an unreferenced file blob; the registry/catalog remains the source of truth.
- Local test images and catalog are intentionally not committed from the developer's working tree.
