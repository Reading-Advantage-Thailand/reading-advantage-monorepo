# Pilot report: SRS and practice coverage

Branch: `pilot/cloud-srs-practice-coverage`. Base commit: `01f2acfe8`.
This work adds tests only. It changes no source file, `package.json`, or lockfile.
The tests use no database, secret, or network.

## Coverage

Scope: `src/**/*.ts` per package, test files excluded. Tool: vitest 4.1.8 with `@vitest/coverage-v8`.

| Package | Lines before | Lines after | Branches before | Branches after |
|---|---|---|---|---|
| practice-core | 60.81% (315/518) | 97.29% (504/518) | 59.45% (286/481) | 91.68% (441/481) |
| srs-engine | 90.10% (665/738) | 95.66% (706/738) | 80.14% (440/549) | 87.61% (481/549) |
| knowledge-space-core | 98.40% (1107/1125) | 98.57% (1109/1125) | 87.73% (658/750) | 88.13% (661/750) |

Per source file that changed:

| Source file | Lines before → after | Branches before → after |
|---|---|---|
| practice-core `practice/error-analysis/index.ts` | 0.00 → 97.18 | 0.00 → 97.18 |
| practice-core `practice/timing.ts` | 30.30 → 100.00 | 30.65 → 89.05 |
| practice-core `practice/fixtures.ts` | 50.00 → 100.00 | 14.28 → 100.00 |
| practice-core `practice/submission.schema.ts` | 80.00 → 100.00 | 100.00 → 100.00 |
| srs-engine `srs/submission-srs-adapter.ts` | 64.63 → 100.00 | 39.47 → 100.00 |
| srs-engine `srs/scheduler.ts` | 80.51 → 92.20 | 66.10 → 77.96 |
| srs-engine `srs/queue.ts` | 94.91 → 100.00 | 71.42 → 94.28 |
| srs-engine `srs/review-processor.ts` | 100.00 → 100.00 | 50.00 → 100.00 |
| srs-engine `srs/session-composition.ts` | 94.64 → 94.64 | 76.92 → 80.76 |
| knowledge-space-core `srs-bridge.ts` | 96.00 → 100.00 | 81.57 → 89.47 |

## Tests added

| Test file | Tests | What it covers |
|---|---|---|
| practice-core `src/__tests__/error-analysis.test.ts` | 38 | Teacher access checks, misconception counts, ties, empty input, AI summary parsing and failure. |
| practice-core `src/__tests__/timing-accumulator-states.test.ts` | 40 + 2 `it.fails` | Idle, pause, blur, visibility, pagehide, finalize, threshold boundaries, UTC day boundary. |
| practice-core `src/__tests__/timing-fixtures-and-schema.test.ts` | 8 | Timing fixtures across midnight, schema refinement for active time. |
| srs-engine `src/__tests__/scheduler-transitions.test.ts` | 36 + 2 `it.fails` | Intervals per rating, lapses, fuzz window, load balance, due boundaries, time-zone offsets, retention targets. |
| srs-engine `src/__tests__/submission-srs-adapter.test.ts` | 15 + 1 `it.fails` | Card and review writes, card reuse, atomic save path, errors, in-memory stores. |
| srs-engine `src/__tests__/review-processor-timing.test.ts` | 6 | Timing evidence reasons, review log state, empty parts. |
| srs-engine `src/__tests__/queue-retention-math.test.ts` | 24 | Retention formula, overdue days across midnight, queue order ties, backlog, remediation, zero capacity. |
| knowledge-space-core `src/__tests__/srs-bridge-learner-state.test.ts` | 12 | Evidence from cards and proficiency, last-wins, ties, future review times. |

## Defects

Each defect has one `it.fails` test in its own commit. No source fix is in this branch.

1. `packages/practice-core/src/practice/timing.ts:504` and `:510`. `finalize` counts an open idle period as active time and as idle time. Active plus idle then exceeds wall-clock time. Test: "keeps active plus idle within wall-clock when an idle period is open at finalize".
2. `packages/practice-core/src/practice/timing.ts:299` and `:342`. Blur and `visibility_hidden` store the idle excess as `longestIdleMs`. Interaction stores the full gap (`:262`). The same 40-second gap gives 10000 or 40000. Test: "records the same longestIdleMs for a gap closed by blur as by interaction".
3. `packages/srs-engine/src/srs/scheduler.ts:177`. `reviewCard` sets `createdAt` to the review time. Each review loses the card creation time. Test: "keeps createdAt after a review".
4. `packages/srs-engine/src/srs/scheduler.ts:275`. `reviewCard` passes `maximumInterval` to ts-fsrs but does not enforce it. ts-fsrs raises Hard, Good, and Easy above the cap to keep rating order. With a cap of 2, Easy gets 5 days. Test: "keeps every rating within maximumInterval".
5. `packages/srs-engine/src/srs/submission-srs-adapter.ts:158`. `processSubmission` saves a new card before the atomic `saveCardAndReview` call (`:231`). A failed atomic save leaves a card with no review. Test: "leaves no new card behind when the atomic save fails".

## Risks not marked as defects

The tests record these as committed behavior. The owning track decides them.

- `timing.ts:228`. An `idle` event closed within the threshold counts that time as neither active nor idle.
- `error-analysis/index.ts:177` and `:429`. Without a map, the student id is the activity id. Two students on one activity count as one student.
- `scheduler.ts:271`. Without a priority, `reviewCard` does not validate `requestRetention`.

## Commands

| Command | Exit | Result |
|---|---|---|
| `git fetch --unshallow` | 0 | Full history fetched. |
| `pnpm install --frozen-lockfile` | 0 | Installed. `@vitest/coverage-v8` was present. |
| `npx tsc` in practice-core, knowledge-space-core, srs-engine (build) | 0 | Built before and after. |
| Before: `../../node_modules/.bin/vitest run --coverage` in practice-core | 0 | 20 files, 202 passed. |
| Before: same in knowledge-space-core | 0 | 49 files passed, 6 skipped; 648 passed, 47 skipped. |
| Before: same in srs-engine | 0 | 27 files, 303 passed. |
| After: same in practice-core | 0 | 23 files; 288 passed, 2 expected fail. |
| After: same in knowledge-space-core | 0 | 50 files passed, 6 skipped; 660 passed, 47 skipped. |
| After: same in srs-engine | 0 | 31 files; 384 passed, 3 expected fail. |
| `npx eslint src/` in each package | 0 | No lint error. |
| `npx tsc -p <temp tsconfig with tests>` in each package | 2 | No error in the new test files. All 47 errors are in older test files. |

The coverage flags were `--coverage.reporter=text --coverage.reporter=json-summary --coverage.include='src/**/*.ts' --coverage.exclude='src/**/__tests__/**'`.
The 6 skipped knowledge-space-core files and 47 skipped tests were skipped before this work.
All commits name `track_id: mastery_engine_v32_import_20260710`. Git log shows that track owns every tested file.
