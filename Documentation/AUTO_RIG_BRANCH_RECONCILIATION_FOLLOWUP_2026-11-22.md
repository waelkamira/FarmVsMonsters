# Auto-Rig Branch Reconciliation — 2026-11-22 (follow-up)

## Pull request state observed

- PR #88, `Port Hybrid Animation Engine onto current main`: open, not merged, base `main`, currently reported non-mergeable by GitHub. Its description says the isolated harness passed 104 test cases, but full repository tests, ESLint, Next.js build, and live Windows/Chrome battle validation were not verified.
- PR #89, `Build local AI Auto-Rig Builder on the hybrid rig engine`: open draft, mergeable according to GitHub, but explicitly depends on PR #88 and is based on `feat/studio-hybrid-animation-engine-mainline`, not directly on `main`.
- PR #89's body reports a focused Auto-Rig CI run passing, while the broad validation run reported 374 passed and 53 failed out of 427. The failures are described as combat/replay/wave scheduling, monster stats, plant/resource contracts, account/catalog flows, and older Studio/runtime source-contract assertions. This is PR-provided run information; it has not been independently rerun during this review.
- The Auto-Rig source branch remains heavily diverged from current main (289 commits ahead, 53 behind at the latest check). Do not merge either branch wholesale.

## Safe portions already ported to main

- Auto-Rig worker protocol and proposal validation.
- Deterministic Auto-Rig builder and semantic role dictionary.
- Skeletal rig profile and clip evaluator.
- Animation state controller and shortest-path crossfades.
- Standalone Phaser skeletal container renderer.
- World-space attachment/hitbox transforms.
- Oriented rectangle and convex polygon collision helpers.
- Focused contract tests for all of the above.
- Authenticated worker bridge route, hardened with bounded request/response stream reads, exact Content-Length checks, and sanitized upstream error responses.
- Local Python SAM 2 worker, bounded request parsing, slow-client socket timeouts, request-shape validation, WSL/native launchers, setup instructions, and Python contract tests.

The mainline ports are deliberately narrower than PR #88/#89. The full BattleScene combat/projectile integration, Rig Editor UI, Auto-Rig panel, asset API persistence, and local Python worker have not been merged as a unit. They require review against the current main files and the broad-suite failures before integration.

## Current verification boundary

A new `.github/workflows/web-validation.yml` runs `npm ci`, full ESLint, `npm test`, and `npm run build` from `web` on main pushes and PRs affecting web files. It also installs the worker's NumPy/OpenCV test dependencies, checks WSL shell syntax, compiles the Python worker, and runs its contract tests. GitHub status lookups for the latest port commits currently return no check statuses or workflow runs. Therefore, no passing build/test claim is made.

The local SAM 2 model/checkpoint and the real Windows/WSL browser-to-Phaser flow remain unverified. Hidden-pixel reconstruction is still not implemented.
