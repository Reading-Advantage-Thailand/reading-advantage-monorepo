# Acceptance: primary_parity_system_dashboard_20261011

- Date: 2026-10-12 (Phase 4 preparation). The page captures run in a batch (orchestrator).
- Legacy revision: bfea121
- New commit: pending (batch capture)
- Copies: primary_legacy_20261011, primary_parity_20261011
- Pair list: `acceptance-pairs.json` (6 pairs; it parses with `PairList`)
- Behavior contract: `behavior-contract.md` (section 6 uses the pair ids)
- Steps module: `acceptance-steps-open-school.ts` (env `PARITY_SCHOOL_ID`, pair AC-4-open)

## Domain query check (run in Phase 2, 2026-10-12)

The helper of Phase 2 cloned the matched copy and ran `getPlatformOverview` (real domain code, real SQL) against it.
Phase 3 did not change the domain call, so this phase does not run the check again.

| Item | Result |
| --- | --- |
| Q-A totals (schools, students, teachers, active students, articles opened, seats used of seats) | equal |
| Q-B all 8 school rows (students, active, articles, seats, last activity, status) | equal |
| Q-C students without a school | equal (0) |
| Query time | 0.2 to 0.3 s (target for the page: 2 s) |

Reference run on the copy: 8 schools, 643 students, 7 teachers, 5 active students, 2 articles opened, 5 seats used of 101.
Three schools are Quiet (218, 3, and 417 students). One school is Active (5 students, 5 active, seats 5 of 100). Four schools
have no students. The copy has quiet schools, so AC-3 needs no test school.

## Batch capture (orchestrator)

Environment for the steps module: `PARITY_SCHOOL_ID` = the id of a school with students (the school with 5 active students
is a good choice, because its admin page has numbers). Run `reference-sql.sql` on a clone with the same `as_of` instant as the page.

| Pair | Check | Result |
| --- | --- | --- |
| AC-1-system | legacy numbers map to the new page | batch capture (orchestrator) |
| AC-2-totals, AC-2-rows | totals and rows equal Q-A, Q-B, Q-C | batch capture (orchestrator) |
| AC-3-quiet | Quiet schools first | batch capture (orchestrator) |
| AC-4-open | row tap opens the admin dashboard of the school | batch capture (orchestrator) |
| AC-5-admin | ADMIN goes to the unauthorized page | batch capture (orchestrator) |
| Page time on the build (target 2 s) | measure | batch capture (orchestrator) |
| AC-6 | look check of the built page, 375 px and 1280 px, day and night | batch capture (orchestrator); look check pending (owner, async) |

## Final gates (AC-7), run 2026-10-12 under the heavy lock, one at a time

| Command | Result |
| --- | --- |
| `cd packages/domain && nice ../../node_modules/.bin/vitest run` | 167 files passed, 4 skipped; 1938 tests passed, 17 skipped; exit 0 |
| `cd apps/primary-advantage && nice ../../node_modules/.bin/vitest run` (first run) | 262 of 267 files passed; 5 tests failed with timeouts under load, in files outside this track: `merge-characterization.flashcard`, `teacher-reports`, `authoritative-session-refresh.behavior`, `class-book-pacing-controls`, `structural-alignment-a11y` |
| the same 5 files, run alone | 5 files, 42 tests passed; exit 0 |
| `cd apps/primary-advantage && ../../node_modules/.bin/tsc --noEmit` | exit 0, 0 errors |
| `cd apps/primary-advantage && ../../node_modules/.bin/eslint <12 changed code files of this track>` | exit 0, no output |
| `cd packages/domain && ../../node_modules/.bin/eslint <12 changed files of this track>` | exit 0, no output |

The helper did not use `pnpm run`, `pnpm exec`, or `pnpm --filter`. `measure/generate.sh` ran and the helper restored
`measure/generated`. `measure/doctor.sh` reports one failure outside this track: A13 (stale archived directory
`agents_md_audit_science_advantage_20260603`).
