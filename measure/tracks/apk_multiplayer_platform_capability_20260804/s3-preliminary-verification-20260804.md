# Preliminary Verification: S3 (2026-08-04)

Executed by the orchestrator under the standing directive ("you make
preliminary verifications first"). Gates re-run by the verifier, not
self-reported. Commits: `6117f762c` (session system), `061bcd965` (mount +
registration).

## Gates

| Gate | Command / check | Result |
| --- | --- | --- |
| Session system suite | `vitest run src/systems/__tests__/multiplayer-session.test.ts` | **18/18 passed** (orchestrator re-run) |
| Mount + registration scoped suites | `vitest run` runtime.test, capability-manifest.test, accepted-inputs.test, developer-kit-api.test | **40/40 passed** (orchestrator re-run) |
| Full package suite | `pnpm --filter @reading-advantage/advantage-play-kit test` | 369 passed / 2 failed — both `src/assets/` 5 s-timeout flakes; the failing set varies run-to-run, is import-disjoint from `systems/`, `runtime/`, `guards/` (grep-verified: zero `src/assets/` imports of the changed modules), and predates this phase (dirty working tree from concurrent sessions) |
| Lint | package lint | 0 errors; 4 warnings, all pre-existing in `src/assets/`, untouched |
| Types | `tsc --noEmit` | exactly the 2 known pre-existing errors (`host-proof-edition.ts:48`, `apk-game-host.tsx:164`), no new ones |
| Manifest pin | independently recomputed sha256 of `measure/archive/apk_independent_acceptance_handoff_20260712/accepted-successor-manifest-v1.json` | `e9fc2c9c…39ba49` — matches the guard literal. **The plan's expectation that the pin would change was wrong**: the pin binds an immutable T10 archive artifact, not the live manifest, so OLD = NEW is correct and no re-acceptance was needed. Receipt: `s3-capability-pin-receipt-20260804.md` |
| Porcelain | `git status` scoped | only the 12 intended files across the two commits (plus one disclosed foreign one-line fix, below) |

## Design reconciliations recorded this phase

1. **"Ready"** in the plan's test list predates the contract freeze. The frozen
   contract has no client→server ready kind (owner-driven lifecycle, decisions
   3/6). Readiness is observed via `lobby_update`. No kind was invented; the
   plan note records this.
2. **`session.tick(dt)` on the public session interface** — the bounded
   scheduler's callback is frozen at construction, so the caller wires
   `createBoundedFrameScheduler((d) => session.tick(d))`. Minimal completion of
   the pinned cadence requirement.
3. **Foreign one-line fix swept in**: `runtime.ts` had a pre-existing dirty
   change from a concurrent session (`operation.catch(() => undefined)` on the
   restart chain) with its own covered test ("recovers restart"). It shares a
   file with S3's mount work and could not be cleanly separated; it is green
   and disclosed here rather than silently absorbed.

## Governance flag for the product owner (not a test failure)

`ACCEPTED_CAPABILITY_IDS` now has 8 entries; the evidence-bound
`ACCEPTED_CAPABILITY_REGISTRY` has 7. Extending the registry requires a
successor-manifest + owner-acceptance step (T11-style governance), not code.
S5's cartridge adoption declares the capability at id level and is not blocked,
but the acceptance surface will eventually ask for the registry entry. Flagged
now so it is a decision, not a surprise.

## What remains for the product owner

No clickable surface yet — S3 is library-level (the first surface is S5's
lobby/podium on `/qc`). Verification = review the gates above and confirm.
On YES: checkpoint commit + git-notes report + plan stamp per protocol.
