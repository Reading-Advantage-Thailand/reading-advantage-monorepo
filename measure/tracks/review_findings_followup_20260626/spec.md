# Specification: Review-Findings Follow-up (test-altitude + FR-2 correctness)

> **Priority:** High. Closes the gaps surfaced by the 2026-06-26 in-depth review of
> `review_findings_remediation_20260624`. That track marked AC-2 and AC-12 ✓, but the
> evidence does not support them: the FR-2 fix is functionally incomplete, and the
> "behavioral" model tests are mock-based shape assertions, not behavior against a test DB.
> Three remediation tests also guard a layer below the reported defect. Per the Measure
> "no deferring blockers" rule, the deferred "real test DB" work is encoded here as
> actionable phases rather than left as a code-comment TODO.

## Overview

The prior track fixed real defects (FR-1 authz, FR-8 input hardening, FR-10 race-safety are
genuinely well-tested). This follow-up corrects the four items where the fix or its test does
not actually meet the stated acceptance criteria:

1. `getStudents` still paginates by **row**, not by distinct student — the dedup `Map` only
   masks in-page duplicates. A student enrolled in N classrooms still consumes N slots of the
   page, so when fan-out crosses a page boundary the page returns fewer than `limit` students
   and `students.length < totalCount`. This is the exact mismatch FR-2/AC-2 required fixed.
2. The migrated-model "behavioral" tests mock `@reading-advantage/db` wholesale and assert only
   callability/shape; AC-12 demanded behavior against a test DB.
3. The FR-3 fix (await the transaction in `generateArticleNew`) has no regression guard — the
   test drives the extracted `persistGeneratedArticle` directly, so removing the caller's
   `await` would not fail any test.
4. The FR-4 grounding fix (`extractCanonicalSourceExcerpts` / `getRoleplayEvaluationContext`)
   has zero unit tests; the route test mocks the derivation and only checks pass-through.

## Functional Requirements

### Correctness

- **FR-1 (High): Paginate `getStudents` by distinct student, not by joined row.**
  `apps/primary-advantage/server/models/studentModel.ts` `getStudents` must return exactly up to
  `limit` **distinct** students per page and `students.length` must never exceed `totalCount`.
  Remove the classroom fan-out from the paginated query (paginate over `users` joined to roles
  only), then attach each page student's classroom data in a follow-up query keyed by the page's
  student ids. The existing single-classroom `StudentData` output shape (one `className` /
  `classroomId` per student) is preserved. The `classroomId` filter path must keep working.

### Test Altitude

- **FR-2 (High): Real test-DB behavioral tests for the migrated primary-advantage models.**
  Stand up an in-process Postgres test harness (PGlite via `drizzle-orm/pglite`) so model tests run
  against genuine SQL semantics (real `leftJoin` fan-out, real `limit`/`offset`, real `count`) with
  no external server. Add a behavioral test that **fails on the pre-FR-1 row-based pagination** (a
  student in 2 classrooms with `limit` set so the fan-out crosses the page boundary → asserts a full
  page of distinct students and `students.length === min(limit, totalRemaining)`), plus ≥1 behavioral
  query test per sibling migrated model (`classroomModel`, `teacherModel`, `assignmentModel`) that
  inserts rows and asserts real returned data — not just shape. The harness must be reusable and skip
  cleanly (no failure) where PGlite cannot initialize.

- **FR-3 (Medium): Guard the `generateArticleNew` transaction `await` at the caller.**
  Add a regression test that exercises `generateArticleNew` (not just `persistGeneratedArticle`) and
  fails if `db.transaction(...)` is not awaited — i.e. a transaction that rejects must reject the
  `generateArticleNew` caller, and the article path must not resolve "as persisted" when the inner
  write fails.

- **FR-4 (Medium): Unit-test the roleplay excerpt derivation.**
  Add unit tests for `extractCanonicalSourceExcerpts` (paragraph split, blank-line handling, the
  ≤8 cap, empty/whitespace lesson content) and for `getRoleplayEvaluationContext` (returns
  non-empty `canonicalSourceExcerpts` for a lesson with content; returns `scenario: undefined`
  for a missing scenario). These pin the actual grounding logic the route test mocks away.

## Non-Functional Requirements

- Each fix lands TDD: a failing test (Red) that demonstrates the gap, then the change (Green).
- No regression in the existing `primary-advantage`, `sales-advantage`, `@reading-advantage/domain`
  baselines; type-checks stay clean.
- The PGlite harness must not require Docker, a running server, or `DATABASE_URL`, and must not slow
  the default unit run materially (lazy import; gated/skipped if PGlite init fails).

## Acceptance Criteria

- **AC-1:** With a fixture of M students each enrolled in 2 classrooms and `limit < 2·(remaining)`,
  `getStudents` returns a full page of `limit` **distinct** students and `students.length ≤ totalCount`
  on every page; no page is short due to fan-out. Verified against the PGlite test DB (FR-1, FR-2).
- **AC-2:** A reusable PGlite-backed test harness exists; the studentModel fan-out test and ≥1 real-query
  test per sibling model (`classroomModel`, `teacherModel`, `assignmentModel`) pass against it and assert
  returned data, not just shape (FR-2).
- **AC-3:** A test exercising `generateArticleNew` fails when the caller's `db.transaction(...)` is not
  awaited (inner rejection propagates to the caller) (FR-3).
- **AC-4:** Unit tests cover `extractCanonicalSourceExcerpts` (split, cap-at-8, empty content) and
  `getRoleplayEvaluationContext` (non-empty excerpts for a content lesson; `undefined` scenario path) (FR-4).
- **AC-5:** All four affected suites are green (or skip cleanly where PGlite is unavailable) and the prior
  baselines do not regress.

## Out of Scope

- Reopening or editing the archived `review_findings_remediation_20260624` track.
- Migrating CI to provision Postgres for the live `DATABASE_URL`-gated suites (PGlite covers this locally).
- Reworking FR-1/FR-8/FR-10 from the prior track — those are correctly implemented and tested.
- Any new product behavior; this is correctness + test-altitude remediation only.
