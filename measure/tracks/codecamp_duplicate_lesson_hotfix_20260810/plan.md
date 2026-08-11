# Implementation Plan: Codecamp Duplicate Exercise/Quiz Lesson Hotfix

## Phase 1: Contract & Schema Definition

- [x] Task: Freeze the production repair contract
  - [x] Capture aggregate production evidence without learner PII.
  - [x] Establish that exercise and quiz are distinct required activities.
  - [x] Define the deterministic persistence projection and migration selectors.
- [x] Task: Define the database invariant
  - [x] Add the Drizzle `(module_id, order)` uniqueness contract.
  - [x] Restore the official production `0047`/`0048` lineage and define the
        repair as the next monotonic migration, `0049`.

## Phase 2: Test

- [x] Task: Add real-Postgres migration regression coverage
  - [x] Reproduce the corrupted exercise/quiz pair with child rows and progress.
  - [x] Prove IDs and all progress fields remain unchanged after repair.
  - [x] Prove exercise/quiz child ownership, idempotency, and SQLSTATE `23505`.
  - [x] Prove an unexpected later module rolls back an earlier repair atomically.
  - [x] Prove a repaired pair cannot mask a second malformed pair in the same
        module: any suspicious residual shape rolls back lessons, progress,
        children, ledger state, and the uniqueness sentinel atomically.
- [x] Task: Add seed reconciliation regression coverage
  - [x] Prove every exercise-backed curriculum module projects distinct rows.
  - [x] Prove reseeding never cross-matches `exercise` and `quiz` by order.
  - [x] Run focused tests and record the expected Red failures: 4 Red, 9 green,
        and 1 credential-gated real-Postgres test discovered/skipped.
  - [x] Run the Green suite: 34 focused unit tests and the real-Postgres
        migration test pass.

## Phase 3: Implement

- [x] Task: Implement the seed persistence projection
  - [x] Split authored combined lessons into persisted exercise and quiz rows.
  - [x] Keep lesson matching type-safe and module-local.
  - [x] Preserve public contracts and add required JSDoc.
- [x] Task: Implement migration `0049`
  - [x] Repair affected lesson metadata in place and preserve progress.
  - [x] Reconcile child exercise rows and add the unique order constraint.
  - [x] Register a strictly monotonic journal entry and refresh the snapshot.

## Phase 4: Generate Docs, Verify, and Deploy

- [x] Task: Run focused and affected-package quality gates [evidence: f1d7ba558, 075351435, 4eedc8840]
  - [x] Run DB migration, seed, journal, type, lint, and build checks. The final
        pre-review Podman/PostgreSQL suite passed 110/110 tests. After the
        independent review safeguard, the new real-Postgres rollback case and
        the affected eight-file matrix pass 51/51 tests, including the 0049
        repair, exact ledger/hash/sentinel gate, and progress preservation; the
        DB production build and focused DB lint also pass.
  - [x] Run affected Codecamp domain/app regression checks [evidence: 075351435,
        4eedc8840]. The full deploy
    contract passes 17/17 after aligning its secret assertions with verified
    GCP ownership: the OIDC secret is cross-project from Reading Advantage,
    while the OpenAI and Google AI secrets are local to Codecamp. Domain Vitest
    cannot load the pre-existing missing `vitest.setup.ts` tsconfig, and
    package-wide checks cannot resolve the incomplete workspace links on this
    new machine, so Cloud Build remains the clean install/build authority for
    deployment. `measure/doctor.sh` passes its guard and supervisor invariants,
    then fails on deprecated unchecked markers in unrelated pre-existing
    tracks.
  - [x] Complete independent change-quality and data-safety review.
- [x] Task: Deploy and verify production [evidence: 4eedc8840]
  - [x] Capture a PII-free production progress digest immediately before the
        migration and verify the deploy path stages a zero-traffic revision.
  - [x] Obtain explicit owner approval for the exact Codecamp repair migration.
        The owner approved the repair while it was named `0047`; it was
        reindexed to `0049` only after recovering production's official
        `0047`/`0048`. The attempted `0049` submission was blocked before Cloud
        Build accepted it. The owner then explicitly approved the exact
        `0049_codecamp_exercise_quiz_repair` identifier before resubmission.
  - [x] Deploy through the Codecamp Cloud Build migration-before-traffic path.
        Build `2a10e80a-67f1-432a-b818-d0a6afc636a1` succeeded, applied 0049,
        passed the exact doctor gate, and staged revision
        `codecamp-advantage-00029-jis` with zero traffic.
  - [x] Verify Cloud Run health, revision traffic, and error logs. Both live and
        candidate localized routes return 200, unsigned webhooks return 401,
        company-mode login returns the intentional 409 Accounts handoff on both
        revisions, and the candidate emitted no ERROR logs. Revision
        `codecamp-advantage-00025-vaz` retains 100% traffic.
  - [x] Re-run aggregate SQL acceptance checks and compare progress counts. The
        repair has 14 valid pairs and zero combined-title rows; all 43 progress
        rows, 41 completed rows, and digest
        `89367badf4012cd4deb116b04e82f06c` are unchanged. The ledger has one exact
        0049 row with the committed hash, the expected uniqueness constraint,
        and no duplicate timestamps.
  - [x] Verify the repaired module through the authenticated browser path. After
        the owner logged in, Kimi WebBridge confirmed the production
        `trpc-server-actions` module has exactly one Exercise, one Quiz, and zero
        combined-title rows. The database digest independently proves all intern
        progress remained attached to its original lesson IDs.
