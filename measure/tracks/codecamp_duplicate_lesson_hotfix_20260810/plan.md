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

- [~] Task: Run focused and affected-package quality gates
  - [x] Run DB migration, seed, journal, type, lint, and build checks. The final
        Podman/PostgreSQL suite passes 110/110 tests, including the 0049 repair,
        rollback, exact ledger/hash/sentinel gate, and progress preservation;
        the DB production build and focused DB lint also pass.
  - [~] Run affected Codecamp domain/app regression checks. The new 0049 deploy
        contract passes. Domain Vitest cannot load the pre-existing missing
        `vitest.setup.ts` tsconfig, and package-wide checks cannot resolve the
        incomplete workspace links on this new machine, so Cloud Build remains
        the clean install/build authority for deployment.
  - [x] Complete independent change-quality and data-safety review.
- [~] Task: Deploy and verify production
  - [x] Capture a PII-free production progress digest immediately before the
        migration and verify the deploy path stages a zero-traffic revision.
  - [x] Obtain explicit owner approval for the Codecamp repair migration. The
        approved SQL was reindexed from `0047` to `0049` only after recovering
        the already-applied official `0047`/`0048`; its data semantics did not
        change.
  - [~] Deploy through the Codecamp Cloud Build migration-before-traffic path.
  - [ ] Verify Cloud Run health, revision traffic, and error logs.
  - [ ] Re-run aggregate SQL acceptance checks and compare progress counts.
  - [ ] Record manual intern verification as the only remaining owner follow-up,
        if direct learner-session verification is unavailable.
