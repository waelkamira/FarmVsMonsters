# Auto-Rig Worker Protocol — Mainline Integration Record — 2026-11-22

## Integrated slice
The following isolated, dependency-free protocol module has been ported from the Auto-Rig development branch to `main`:

- `web/game/studio/autoRigWorkerProtocol.mjs`
- `web/tests/studio-auto-rig-worker-protocol.test.mjs`

The protocol module validates worker capabilities, source-space proposal geometry, polygon masks, provenance fields, protocol versions, duplicate proposal IDs, and the 63-proposal ceiling.

## Important correction made during port
The development-branch protocol listed `hidden-part-reconstruction` as an allowed worker capability. The inspected local SAM 2 worker only implements:
- `part-detection`
- `prompted-segmentation`

The mainline port therefore removes `hidden-part-reconstruction` from the advertised capability allowlist. This prevents the Studio health/capability layer from claiming that pixel reconstruction exists when the current worker does not implement it.

## Focused test coverage added
- unsupported capabilities are filtered, including hidden-part reconstruction;
- unsupported protocol versions are rejected;
- valid source-space polygon proposals are accepted;
- invalid confidence and out-of-canvas bounds are rejected;
- malformed masks and duplicate IDs are rejected;
- responses above 63 proposals are rejected.

## Follow-up correction on main — 2026-11-22

A source inspection after the initial integration found that the capability declaration line contained a literal escaped newline inside a JavaScript comment, which commented out the `CAPABILITIES` declaration. This was corrected in commit `ed8e02fb04cb990be99b70e5bc70243dc2771f37`.

The same correction makes a worker report `ready` only when at least one implemented capability survives normalization. A focused regression test was added in commit `f7fbc0205b2e39936efc74abc6a39b2078086f4f` for a worker that claims readiness but offers only the unsupported hidden-reconstruction capability.

## Verification status
The source and test files were fetched back from `main` after commit and inspected. The GitHub workflow query returned no workflow runs for the test commit at the time checked. The Node test suite and Next.js build have **not** been executed in a local checkout in this session. Do not interpret this integration as runtime-verified.

## Next integration gates
1. Fix the starter-clip arm/hand role regex and add focused tests.
2. Add stricter request schema validation to the local worker.
3. Integrate worker route and signed-session checks without overwriting newer mainline asset API changes.
4. Port the skeletal rig/animation modules as one coherent dependency set with crop/pivot and world-transform tests.
5. Integrate the panel and RigEditor after runtime/API contracts are stable.
6. Implement actual hidden-pixel reconstruction as a separate inference capability before advertising it.
