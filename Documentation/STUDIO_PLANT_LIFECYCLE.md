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

## 3. Publish directly after gameplay verification

The Studio `publish` action is available only after an asset is `testing`. The administrator must first prepare the asset, open the game, and manually verify its actual gameplay behavior. Publishing is a direct write to `STUDIO_PUBLISH_BRANCH` (defaults to `main`); it does not create a GitHub pull request or request a review.

The action:
1. Validates the asset type, saved gameplay profile, safe asset paths, and linked projectile when applicable.
2. Reads the immutable artwork (and linked projectile) from the Studio storage branch.
3. Writes/reuses those immutable files on the target game branch.
4. Updates the appropriate published plant or monster catalog on the target branch. The catalog is written last, so the game does not list the asset before its files exist.
5. Marks the Studio registry record as `published` and clears any obsolete release-request metadata.

The GitHub token requires `Contents: Read and write` for the repository. Pull-request permission is not required for direct publishing. If the target branch is protected against direct pushes, GitHub will reject the write; Studio must report that failure rather than silently opening a pull request.

Asset files and the catalog are written as separate GitHub Contents API commits. The catalog update is the activation point. If an earlier file write succeeds but a later step fails, the uploaded immutable file may remain unreferenced; the game catalog remains unchanged until its final update succeeds. If the catalog succeeds but the Studio registry update fails, the asset is live and the API reports a registry synchronization warning so the status can be reconciled.

A previously opened review request does not block a new direct publish. The direct publish clears the stale request metadata only after the catalog update succeeds; any old pull request remains a separate GitHub item and is not merged automatically.

## 4. Archive and restore

The Studio library offers a reversible archive action for draft and testing plants. Archiving changes the registry status to `archived` and hides the plant from the testing catalog; it does not delete the plant image, projectile, or metadata. The restore action returns the plant to `draft`, after which it must be prepared and tested again.

A plant with an open release request cannot be archived until that request is closed. A plant whose release request has been merged is already published and cannot be archived through this action; removing it from the live catalog requires a separate reviewed release change. Hard deletion is intentionally not exposed in this workflow.

## Status transitions

`draft -> testing -> published`

`draft/testing -> archived -> draft`

Editing/replacing an asset returns it to `draft`, requiring a fresh gameplay test before direct publication.

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
