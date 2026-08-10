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

- [~] Task: Run focused and affected-package quality gates
  - [x] Run DB migration, seed, journal, type, lint, and build checks. The final
        pre-review Podman/PostgreSQL suite passed 110/110 tests. After the
        independent review safeguard, the new real-Postgres rollback case and
        the affected eight-file matrix pass 51/51 tests, including the 0049
        repair, exact ledger/hash/sentinel gate, and progress preservation; the
        DB production build and focused DB lint also pass.
  - [~] Run affected Codecamp domain/app regression checks. The new 0049 deploy
    contract passes; the same pre-existing file still has one unrelated
    secret-format assertion that expects a project-local OIDC secret while
    the current build intentionally uses a project-qualified path. Domain
    Vitest cannot load the pre-existing missing `vitest.setup.ts` tsconfig,
    and package-wide checks cannot resolve the incomplete workspace links
    on this new machine, so Cloud Build remains the clean install/build
    authority for deployment. `measure/doctor.sh` passes its guard and
    supervisor invariants, then fails on deprecated unchecked markers in
    unrelated pre-existing tracks.
  - [x] Complete independent change-quality and data-safety review.
- [~] Task: Deploy and verify production
  - [x] Capture a PII-free production progress digest immediately before the
        migration and verify the deploy path stages a zero-traffic revision.
  - [~] Obtain explicit owner approval for the exact Codecamp repair migration.
    The owner approved the repair while it was named `0047`; it was
    reindexed to `0049` only after recovering production's official
    `0047`/`0048`. The attempted `0049` submission was blocked before Cloud
    Build accepted it, so renewed approval for the exact `0049` identifier
    remains required.
  - [ ] Deploy through the Codecamp Cloud Build migration-before-traffic path.
  - [ ] Verify Cloud Run health, revision traffic, and error logs.
  - [ ] Re-run aggregate SQL acceptance checks and compare progress counts.
  - [ ] Record manual intern verification as the only remaining owner follow-up,
        if direct learner-session verification is unavailable.
