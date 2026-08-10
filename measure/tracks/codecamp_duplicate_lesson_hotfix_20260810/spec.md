# Specification: Codecamp Duplicate Exercise/Quiz Lesson Hotfix

## Overview

An intern reported two lessons named `tRPC & Server Actions Exercise + Quiz`,
one showing 100% completion and the other showing a start action. Production is
available, but the affected page is backed by corrupted curriculum identities.

The June exercise backfill intentionally created a standalone `exercise` lesson
before each quiz so approved GitHub PRs could complete that exercise. A later
seed reconciliation matched lessons by order alone and rewrote those standalone
exercise rows as quizzes. The original quizzes remained at their shifted order,
so the UI now renders two identically named quiz rows while progress remains
correctly attached to two different lesson IDs.

The production audit on 2026-08-10 found this pattern in 14 published modules:
28 duplicate-looking lesson rows, two learners with affected progress, 43 total
progress rows, and 41 completed rows. The repair must preserve the legitimate
distinction between GitHub exercise evidence and quiz evidence. It must never
delete or fabricate learner completion merely to make the duplicate disappear.

## Functional Requirements

- **FR-1 — Distinct persisted activities:** Exercise-backed Codecamp modules
  must persist a standalone `exercise` lesson followed by a quiz-only lesson,
  with distinct titles and unique module-local orders.
- **FR-2 — In-place production repair:** A transactional migration must restore
  the corrupted exercise rows in place and convert the corresponding retained
  quiz rows to quiz-only metadata. Existing lesson IDs must not change.
- **FR-3 — Progress preservation:** The migration must preserve every
  `codecamp_user_progress` row, including its user, lesson ID, status, score,
  and completion timestamp. It must not mark an unfinished exercise complete.
- **FR-4 — Child-row integrity:** Exercise definitions must remain on the
  standalone exercise row; quiz questions must remain on the quiz row. Any
  redundant exercise child copied onto the quiz may be removed only after a
  behavioral migration test proves the standalone copy remains.
- **FR-5 — Database invariant:** `codecamp_lessons` must reject duplicate
  `(module_id, order)` positions after existing data has been reconciled.
- **FR-6 — Seed convergence:** Fresh seed and reseed paths must produce the
  same split exercise/quiz projection and must never rewrite a lesson across
  lesson types merely because its order matches.
- **FR-7 — Production verification:** After deployment, read-only production
  checks must show no duplicate exercise/quiz titles, one exercise and one quiz
  for each affected module, unchanged progress-row counts, and a healthy app
  response. The reported intern flow remains subject to owner/intern visual
  confirmation because no operator may impersonate the learner.

## Non-Functional Requirements

- The repair is idempotent and safe if migration tooling retries it.
- The migration runs on the direct/session-mode database connection before the
  dependent application revision receives traffic.
- Regression tests use real PostgreSQL semantics for DDL, constraints, foreign
  keys, and progress preservation; mock-only evidence is insufficient.
- Diagnostic and acceptance evidence contains no learner names, usernames,
  email addresses, or database credentials.

## Acceptance Criteria

- [ ] The `trpc-server-actions` module renders distinct Exercise and Quiz rows;
      the existing 100% quiz completion remains on the quiz.
- [ ] All 14 affected production modules have distinct exercise/quiz titles and
      types after deployment.
- [ ] Production progress count remains 43 across the repaired lesson set, with
      all statuses, scores, lesson IDs, and completion timestamps preserved.
- [ ] A real-Postgres migration test reproduces the production shape and proves
      the in-place repair, child ownership, progress preservation, idempotency,
      and uniqueness constraint.
- [ ] Seed unit tests prove the persistence projection is stable across all
      exercise-backed curriculum modules and rejects cross-type order matching.
- [ ] Focused DB, domain, type, lint, migration-ledger, and Codecamp build gates
      pass, or unrelated pre-existing failures are identified precisely.
- [ ] The production Cloud Run revision is healthy and read-only SQL acceptance
      checks pass after deployment.

## Out of Scope

- Granting exercise completion because the intern completed the quiz.
- Deleting the required standalone GitHub exercise.
- Redesigning Codecamp progression or the shared KST/SRS engine.
- Solving the known cold-start/warm-dashboard performance tracks in this hotfix.
- Changing GitHub repositories, PR review policy, or learner accounts.
