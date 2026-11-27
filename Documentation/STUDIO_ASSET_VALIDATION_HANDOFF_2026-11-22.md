# Studio Asset Validation Handoff — 2026-11-22

## Source-of-truth distinction

The current GitHub `main` asset metadata was fetched and reports:

- `web/public/assets/asset-manifest.json`: 88 assets, 24,437,593 bytes.
- `web/public/assets/asset-audit.json`: 88 assets, 24,437,593 bytes.
- Both files were generated on 2026-11-20.

The separate Windows validation workspace previously reported by the project owner is:

- Workspace: `H:\\FarmVsMonsters-studio-validation`
- Branch: `validation/react-hooks-browser-storage-sync`
- Local asset metadata changes: `web/public/assets/asset-audit.json` and `asset-manifest.json`
- Locally reported result: 95 assets, 28,059,901 bytes, including Bamboo, Pepper, and additional projectile assets.
- The workspace also contains local `on`, `web/lint.log`, and `web/test.log` files; `test.log` was reported as empty.
- Backup reported by the owner: `H:\\FarmVsMonsters-backup`

The 95-asset result is not present on GitHub `main` at the time of this audit. Do not overwrite the local validation metadata or infer that the 95 assets are already committed. Preserve the local files and reconcile them against the actual asset directory before regenerating either manifest.

## Branch state

- `validation/studio-asset-readiness` is not currently discoverable as a remote branch.
- `feat/studio-asset-readiness-lab` is an ancestor of current `main` (66 commits behind; no unique commits ahead).
- `fix/react-hooks-browser-storage-sync` is an ancestor of current `main`; its fixes were merged by PR #66 at `475ea1672a9fe88ac7b39143964f150f20f3c539`.

## Verification still required

Run from `H:\\FarmVsMonsters-studio-validation\\web` after preserving the local asset changes:

1. `npm run lint`
2. `npm test`
3. `npm run build`

Capture each command's exit code and complete output. The build runs `assets:manifest` through `prebuild`, so compare the generated manifest/audit against the preserved 95-asset version before accepting or committing any generated changes.

No Windows execution, Node test run, lint run, or production build was available during this GitHub-only review. No pass is claimed.
