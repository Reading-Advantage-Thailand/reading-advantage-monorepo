# Implementation Plan: Codecamp Duplicate Exercise/Quiz Lesson Hotfix

## Phase 1: Contract & Schema Definition

- [~] Task: Freeze the production repair contract
  - [x] Capture aggregate production evidence without learner PII.
  - [x] Establish that exercise and quiz are distinct required activities.
  - [ ] Define the deterministic persistence projection and migration selectors.
- [ ] Task: Define the database invariant
  - [ ] Add the Drizzle `(module_id, order)` uniqueness contract.
  - [ ] Define migration ordering and journal requirements for `0047`.

## Phase 2: Test

- [ ] Task: Add real-Postgres migration regression coverage
  - [ ] Reproduce the corrupted exercise/quiz pair with child rows and progress.
  - [ ] Prove IDs and all progress fields remain unchanged after repair.
  - [ ] Prove exercise/quiz child ownership, idempotency, and SQLSTATE `23505`.
- [ ] Task: Add seed reconciliation regression coverage
  - [ ] Prove every exercise-backed curriculum module projects distinct rows.
  - [ ] Prove reseeding never cross-matches `exercise` and `quiz` by order.
  - [ ] Run focused tests and record the expected Red failures.

## Phase 3: Implement

- [ ] Task: Implement the seed persistence projection
  - [ ] Split authored combined lessons into persisted exercise and quiz rows.
  - [ ] Keep lesson matching type-safe and module-local.
  - [ ] Preserve public contracts and add required JSDoc.
- [ ] Task: Implement migration `0047`
  - [ ] Repair affected lesson metadata in place and preserve progress.
  - [ ] Reconcile child exercise rows and add the unique order constraint.
  - [ ] Register a strictly monotonic journal entry and refresh the snapshot.

## Phase 4: Generate Docs, Verify, and Deploy

- [ ] Task: Run focused and affected-package quality gates
  - [ ] Run DB migration, seed, journal, type, lint, and build checks.
  - [ ] Run affected Codecamp domain/app regression checks.
  - [ ] Complete independent change-quality and data-safety review.
- [ ] Task: Deploy and verify production
  - [ ] Deploy through the Codecamp Cloud Build migration-before-traffic path.
  - [ ] Verify Cloud Run health, revision traffic, and error logs.
  - [ ] Re-run aggregate SQL acceptance checks and compare progress counts.
  - [ ] Record manual intern verification as the only remaining owner follow-up,
        if direct learner-session verification is unavailable.
