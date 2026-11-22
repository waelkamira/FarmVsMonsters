# Studio Mainline Capability Reconciliation — 2026-11-22

This is a follow-up to the continuation audit and supersedes assumptions that certain Studio controls are still absent from main.

## Rechecked mainline capabilities (source verified)
- Asset revision snapshots, version restoration, and cloning modules exist.
- Dependency analysis module exists, and main API rejects certain destructive replacements when dependent assets exist.
- Archive/restore transitions exist for eligible draft/testing assets; published or pending-release assets are protected.
- Release-request resolution logic exists for pull request states.
- Registry concurrency utility supports expected-SHA conflict rejection.
- Readiness audit module includes dependency/profile/path and file status reporting.
- Binary upload signature validation was recently committed.

## Important distinction
These source-level capabilities are present, but this inspection did not execute them. No assertion is made that all UI/API paths are wired correctly, that release requests complete reliably, or that the Windows/Chrome build passes.

## Branch review observations
Several older branches are substantially behind current main, or have no net changes relative to main:
- `feat/studio-asset-readiness-lab`: no diff against main at this check.
- `feat/studio-asset-detail-dependency-center`: no diff against main at this check.
- `feat/studio-monster-runtime`: no diff against main at this check.
- `feat/studio-release-pull-request-flow`, `feat/studio-safe-asset-archive`, and `feat/studio-asset-version-history` are divergent/stale snapshots. Main already includes key lifecycle, revision, dependency, and release logic; do not merge these branches wholesale.
- `feat/studio-direct-publish` is divergent; inspect its route changes carefully and avoid wholesale merging.

## Static checks still required
1. Verify all mainline API handlers use expected registry SHA when updating shared registry.
2. Verify asset release process writes to a branch/PR, not directly to main, and reconciles PR state.
3. Verify concurrent writes fail safely without partial registry mutation.
4. Verify archive/dependency/version restoration behavior through actual API tests.
5. Verify readiness lab routes and file audit reflect true storage state.
6. Run npm tests, lint and production build in Windows/Chrome; this session has no local runner.

## Direction
Use main as the source of truth and selectively port isolated missing behavior from branches only after review against the updated main, not against historical merge bases.
