# Implementation Plan: Primary Test Hygiene and Upload Fixes

_Contract-First + TDD. Commit after each task. `pnpm --filter primary-advantage test`
must be green at the end of every task._

_Blast radius: the only exported symbols in scope are the route `POST` handlers
(upload/csv, upload/classes, upload/csv/cleanup) — zero in-repo callers; the blast
radius is the HTTP surface, covered by the new route-level tests._

## Phase 1: Contract & Schema Definition

- [x] Task 1: Enumerate the 97 source-grep tests and publish the batch map (7fa7b3f)
    - [x] Run the FR-1.4 grep over `apps/primary-advantage --glob "*.test.*"` and list every source-string assertion
    - [x] Assign each to a domain batch keyed to its originating track file (`authorization-hardening-static`, `broken-ux-fixes`, `loading-state-invariants`, `structural-alignment`, `component-deduplication`, `audio-highlight`, `aria-labels-i18n`, stragglers)
    - [x] Write `measure/tracks/primary_test_hygiene_upload_fixes_20260914/grep-test-inventory.md` with batch, file, assertion count, and planned behavioral replacement per entry
- [x] Task 2: Define the CSV upload summary contract
    - [x] Zod schema `CsvUploadSummary` (`inserted`, `skippedDuplicate`, `skippedExisting` counts) colocated per the track-6 `/schema` convention
    - [x] Export from the upload/csv schema module
- [x] Task 3: Define the session-school policy
    - [x] Document in the track: session is the sole `schoolId` source for upload writes; DB-row school is never consulted for stamping
    - [x] Identify the exact stamping sites in `upload/csv/route.ts` and `upload/classes/route.ts`; audit `upload/csv/cleanup/route.ts`

## Phase 2: Test (Red)

- [x] Task 4: FR-2 route tests — session-authoritative school
    - [x] upload/csv: session school A + divergent DB-row school → rows written under A
    - [x] upload/classes: same divergence case
    - [x] Session without school context → existing rejection status unchanged (both routes)
- [x] Task 5: FR-3 route tests — duplicate handling
    - [x] File with duplicate emails → 200, first row wins, `skippedDuplicate` correct
    - [x] Email already in DB → 200, `skippedExisting` correct, no 500
    - [x] Response validates against `CsvUploadSummary`
- [x] Task 6: FR-1 batch 1 replacements — `authorization-hardening-static`
    - [x] Write behavioral replacements (route-level handler invocation per lessons-learned 2026-06-24)
    - [x] Old grep assertions still green alongside (no deletion in Phase 2)

## Phase 3: Implement (Green + per-batch conversion)

- [x] Task 7: FR-2 — session-authoritative `schoolId` in `upload/csv` and `upload/classes`
    - [x] Replace DB-row school stamping with session-derived `schoolId`
    - [x] Align `upload/csv/cleanup` if it shares the pattern
    - [x] Task 4 tests green
- [x] Task 8: FR-3 — duplicate-safe CSV insert
    - [x] In-file dedupe (first row wins)
    - [x] Conflict-safe insert with per-row skip
    - [x] Return `CsvUploadSummary` with 200
    - [x] Task 5 tests green
- [x] Task 9: FR-1 batch 1 conversion — `authorization-hardening-static`
    - [x] Replacements green; delete old grep assertions in the same commit
- [x] Task 10: FR-1 batch 2 — `broken-ux-fixes`
- [x] Task 11: FR-1 batch 3 — `loading-state-invariants`
- [x] Task 12: FR-1 batch 4 — `structural-alignment`
- [x] Task 13: FR-1 batch 5 — `component-deduplication`
- [x] Task 14: FR-1 batch 6 — `audio-highlight`
- [x] Task 15: FR-1 batch 7 — `aria-labels-i18n` + stragglers
    - (Tasks 10–15 follow the Task 9 pattern: replacements written and green first, old grep assertions deleted in the same commit; split further if the Phase 1 inventory shows a batch over ~25 assertions)
    - Done 2026-09-14: batches 2 and 6 converted together (`e3ed99a3a`); batch 4 in two commits (`f12f435c9`, `ee9f801cd`); batch 5 in three (`c25a2ae51`, `49fd26502`, `aef2c2150`); stragglers in one (`8ea30e0ff`); batch 3 in three (`24abcc138`, `815a1e97d`, `cb96ebadd`). aria-labels needed zero cases (already behavioral).

## Phase 4: Verification & Closeout

_(Adapted: `measure/generate.sh` and `measure/doctor.sh` do not exist in this repo.)_

- [x] Task 16: Full gates
    - [x] `pnpm --filter primary-advantage test` green — 93 files, 571 tests, exit 0
    - [x] `tsc --noEmit` — exactly the 17 pre-existing APK errors
    - [x] ESLint 0 errors (821 warnings; baseline was 819, +2 in new test files)
    - [x] FR-1.4 grep gate: 12 remaining `readFileSync` files all justified (4 comment-only, 2 config pins, 1 architecture ratchet, 3 fixture readers, 2 data pins)
    - [x] `build-graph update ./graph.db <edited files>` for structural edits
    - Review follow-up 2026-09-14: 4 findings (3 Medium, 1 Low) fixed — lint gate
      installed, i18n-Link tests made two-property discriminative, mixed-case CSV
      email pinned. Gates after: 93 files / 574 tests, tsc 17 APK errors, lint
      0 errors / 821 warnings.
- [x] Task 17: Registry updates
    - [x] Rewrite the three resolved bullets in `docs/primary-advantage-ux-refactor-plan.md` "Known limitations"
    - [x] Mark inventory file complete; update `metadata.json` (`actual_tasks`, deviation notes if any)

## Owner Manual Verification — PASSED 2026-09-23

Environment: local dev server (port 3015) against Docker Postgres primary_advantage; signed in as QA teacher (school A); browser-driven via Kimi WebBridge with direct DB assertions. Evidence: session S6 in the 2026-09-23 verification run (3 checks, all passed). S6.1: a CSV with three in-file duplicate emails plus one pre-existing email returned 200 with `inserted:1, skippedDuplicate:2, skippedExisting:1` — no 500. S6.2: the new user, classroom, and membership rows all carry the session school; a cross-school probe (same-name classroom planted in school B) created a new school-A classroom and left school B's row untouched. S6.3: the converted upload test batch (`vitest run app/api/upload`) is 6 files / 19 tests green, and the remaining `readFileSync` test files match the track-documented justified set. Local setup fix needed before the session: the pooled `DATABASE_URL` in `apps/primary-advantage/.env` carried a Prisma-style `?schema=public` that PgBouncer rejects (FATAL 08P01 on session lookup) — removed in the uncommitted local env. Confirmed by explicit product-owner yes on 2026-09-23.
