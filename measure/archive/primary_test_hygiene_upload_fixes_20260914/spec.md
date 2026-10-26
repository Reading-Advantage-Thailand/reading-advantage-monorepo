# Specification: Primary Test Hygiene and Upload Fixes

## Overview

Close the three deferred items recorded in `docs/primary-advantage-ux-refactor-plan.md`
("Known limitations recorded for follow-up") after the 2026-09-13/14 repair waves:
convert the 97 static source-grep tests to behavioral tests without losing coverage,
make upload writes session-authoritative for school scoping, and stop
`upload/csv` from returning 500 on duplicate emails.

Track type: bug/chore. Classic FR list.

## Functional Requirements

### FR-1: Convert the 97 static source-grep tests to behavioral tests

The first-pass repair waves shipped 97 tests that assert on source text
(`readFileSync` + regex / `toMatch`) instead of runtime behavior. Lessons-learned
(2026-06-24) classifies these as a "test gaming" smell: they prove the source
looks right, not that the system behaves right.

- FR-1.1: Enumerate the 97 tests and assign each to a domain batch aligned with
  its originating track file: `broken-ux-fixes`, `loading-state-invariants`,
  `structural-alignment`, `component-deduplication`,
  `authorization-hardening-static`, `audio-highlight`, `aria-labels-i18n`, and
  any stragglers found during enumeration.
- FR-1.2: Convert one domain batch at a time. For each batch: write the
  behavioral replacement tests first (route-level handler invocation,
  render-with-real-providers, or spy-threaded calls per the lessons-learned
  guidance); keep the old grep tests running alongside; delete the old grep
  tests in the same commit only after the replacements pass.
- FR-1.3: No new source-string assertions. Replacements must exercise behavior.
- FR-1.4: Conversion is complete when `rg -l "readFileSync" apps/primary-advantage
  --glob "*.test.*"` returns only files with a documented in-file justification
  (e.g., the characterization tests that deliberately pin keys, and fixture
  readers that load data files rather than source under test).

### FR-2: Session-authoritative school scoping on upload writes

`app/api/upload/csv/route.ts` and `app/api/upload/classes/route.ts` scope writes
from the session school but stamp rows with the DB-row school; a stale session
would make them disagree. Fail-closed guards currently limit impact.

- FR-2.1: Derive the `schoolId` for every write in both routes exclusively from
  the verified session. Remove DB-row school stamping.
- FR-2.2: Preserve existing fail-closed behavior: a session without a school
  context keeps its current rejection status.
- FR-2.3: `upload/csv/cleanup/route.ts` is audited and aligned if it exhibits
  the same pattern.

### FR-3: CSV duplicate-email handling without 500

`upload/csv` does not deduplicate emails within one upload and inserts without
conflict handling; duplicates produce a 500.

- FR-3.1: Deduplicate emails within one uploaded file; first row wins.
- FR-3.2: Insert with conflict handling so a row that already exists is
  skipped, not fatal.
- FR-3.3: Return a per-upload summary (inserted count, skipped-duplicate
  count, skipped-existing count) with a 200 status. Duplicates never produce
  a 500.
- FR-3.4: Define the summary response shape as a Zod contract before
  implementation.

## Non-Functional Requirements

- Vitest with mocked DB per project convention
  (`packages/domain/src/__tests__/mock-db.ts` pattern where applicable).
- No new hashing or manifest churn (repo hashing policy).
- Full `pnpm --filter primary-advantage test` suite must stay green throughout;
  coverage from the old grep tests must not be lost between batches.

## Acceptance Criteria

1. Zero unjustified `readFileSync`-on-source assertions remain in
   primary-advantage test files (verified by the FR-1.4 grep gate in review).
2. An upload integration test with session school A and a divergent DB-row
   school proves writes land under A.
3. A CSV upload containing duplicate emails returns 200 with correct summary
   counts; no 500 path remains for duplicates.
4. `pnpm --filter primary-advantage test` green; `tsc --noEmit` shows no new
   errors beyond the 17 pre-existing APK errors; ESLint 0 errors.
5. `docs/primary-advantage-ux-refactor-plan.md` "Known limitations" section
   updated to reflect resolution of the three items.

## Out of Scope

- The fourth known-limitation bullet (cloze prefetch has no production caller;
  it is a future-integration contract, not a defect).
- The stale Sales admin source-grep checks in `measure/tech-debt.md`
  (different app; remains open under its own entry).
- The 12 manual verification gates of the six parent UX tracks.
- Any changes to upload route authentication/authorization beyond FR-2's
  school-source correction.
