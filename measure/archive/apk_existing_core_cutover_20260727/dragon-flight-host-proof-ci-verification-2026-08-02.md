# Dragon Flight Host-Proof CI Verification — 2026-08-02

## Status and scope

This is a bounded technical verification receipt for the Dragon Flight-only
corrective phase. It records fresh, self-starting Chromium evidence for the
current server-owned dwell correction. It does **not** mark Existing Core Task
5, the track, production, cutover, retirement, a cohort, or product-owner
acceptance complete.

The production dwell remains 250 ms. The test host alone receives a stricter
3000 ms server environment policy. The adapter rejects that override in
production and rejects values below the production floor. Attestation, the
returned `minimumNextActionDwellMs`, and completion-chain revalidation use the
same resolved server policy. The browser never selects that policy.

## Source binding

The shared worktree contains independent parallel application work, so no
checkpoint commit was created for this receipt. The observed source state is
bound to base commit `1d16956bbeb03f20b0117d7b0d8dadd6e64d3a17` plus these
SHA-256 content fingerprints:

| File | SHA-256 |
| --- | --- |
| `packages/domain/src/games/dragon-flight-host-proof-attempt.ts` | `de112d71b36e855345d0a9bc6a191d373368f6b7d41d476d1d3498b3f7030c9b` |
| `packages/domain/src/games/dragon-flight-host-proof-attempt-adapter.ts` | `2538d285b89129aee97d884681b437950452bc4c8f0defd619859d74d46386b5` |
| `packages/domain/src/__tests__/dragon-flight-host-proof-attempt.test.ts` | `cad45b365c0b6fca5884a71d8f10b70782f6ae93b91625b23ca35abf5fb75ed3` |
| `packages/domain/src/__tests__/dragon-flight-host-proof-dwell-policy.test.ts` | `9fc38ffe88a759dc71ecab04e6df9532ab5fe9da627c4e788b3b5683f9cdd905` |
| `apps/reading-advantage/host-proof-test-config.ts` | `eef497cc4437e612fa13f36571686f5f7c620e72b66c4dd59de26b24b134cd02` |
| `apps/reading-advantage/tests/e2e/host-proof-games.spec.ts` | `1e3974298e8a9a7e88c5741f5624f7e44ea2063a4ef808715defbf4b7ec07802` |
| `apps/reading-advantage/tests/e2e/dragon-flight-host-proof-hostile.spec.ts` | `f44caee76d546622e9326c66b8ee8bf9795feeaa605a5def1819ee23b0b3e7e2` |
| `apps/primary-advantage/host-proof-test-config.ts` | `0bc542a8b6e339d5941548b53c9144c2fc0c42d45327aa8fa888cc3a379cb206` |
| `apps/primary-advantage/tests/e2e/host-proof-games.spec.ts` | `1e3974298e8a9a7e88c5741f5624f7e44ea2063a4ef808715defbf4b7ec07802` |
| `apps/primary-advantage/tests/e2e/dragon-flight-host-proof-hostile.spec.ts` | `f44caee76d546622e9326c66b8ee8bf9795feeaa605a5def1819ee23b0b3e7e2` |
| `measure/tests/test_apk_existing_core_dragon_flight_scope_quarantine.py` | `fc6ae121874918336a4e1e71d1fe73379dd975dc7fad152ffd2551243d0a05b0` |

## Fresh self-starting browser evidence

Each run used its own local disposable PostgreSQL database, `CI=true`, a new
port, and the checked-in Playwright `webServer` command. That command rebuilt
the dependent packages, migrated and seeded the disposable database, enabled
the hidden host surface, and set
`HOST_PROOF_TEST_GATE_TO_LAUNCH_DWELL_MS=3000`. No remote database or
production host was used.

| Host and proof | Result | Local JSON report SHA-256 |
| --- | --- | --- |
| Reading hostile direct-JSON/same-frame bypass | 2 expected, 0 skipped, 0 unexpected | `cd03e9099fc5c3a4bc4c5491e646572d05e6da6a6e3af0bb126a09065ce7ed5e` |
| Reading positive real-cartridge proof | 5 expected, 0 skipped, 0 unexpected | `89f00e848e26368132707ebd4fb9451e4bb60fb43db99eff9315b8174d1c1c08` |
| Primary hostile direct-JSON/same-frame bypass | 2 expected, 0 skipped, 0 unexpected | `8251f31524f431a5bf16fb6ff9fd5cc9b5405cbba3fc463831f2879d790c1ec7` |
| Primary positive real-cartridge proof | 5 expected, 0 skipped, 0 unexpected | `52ff8f965a94b51feb1373142aad7d7932e5bd86eaf35a58c74b7ef61440cc5d` |

The hostile suites prove that an immediate direct choose-gate-to-launch
sequence is rejected with safe 400 behavior, cannot complete, and does not
change history. The positive suites prove the real cartridge consumes the
server-returned dwell before launch, retains opaque receipt ordering, and
completes a verified result. Those claims remain limited to server-observed
request ordering and timing; they do not prove physical-human play, anti-bot
resistance, comprehension, mastery, anti-cheat efficacy, or broader XP
integrity.

The local reporter files were produced at:

- `/tmp/apk-reading-host-proof-ci-fixed-results.json`
- `/tmp/apk-reading-host-proof-positive-ci-fixed-results.json`
- `/tmp/apk-primary-host-proof-ci-fixed-results.json`
- `/tmp/apk-primary-host-proof-positive-ci-fixed-results.json`

Their hashes above make the transient artifacts auditable for this working
session. A later clean checkpoint must replace this working-tree binding with
a commit SHA before any formal closeout assertion.

## Focused regression checks

```text
packages/domain focused host-proof suite: 3 files, 29 tests passed
measure.tests.test_apk_existing_core_dragon_flight_scope_quarantine: 3 tests passed
pnpm --filter @reading-advantage/domain build: passed
git diff --check for the tracked bounded correction files: clean
```

The domain test runner emitted its expected warning that `DATABASE_URL` was
not configured; its tests mock database use and all 29 assertions passed.

## Remaining formal gates

- Task 5 remains `[~]`; this receipt does not change plan or metadata status.
- The full Reading TypeScript baseline remains ungreen as documented in the
  corrective-phase review and plan.
- A clean bounded checkpoint, refreshed independent review, Measure manual
  verification, and explicit product-owner authorization remain required.
- No later title, cohort, production exposure, deployment, cutover, or Task 6
  legacy retirement may consume this evidence.
