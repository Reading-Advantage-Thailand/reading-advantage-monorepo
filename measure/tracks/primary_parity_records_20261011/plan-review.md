# Plan review — primary_parity_records_20261011

## Phase 2: Test — checks for the records

Review of the phase diff (`3f25ab29a..HEAD`). The phase changes documentation only. No code, no
schema, no hash, no secret. Plan compliance: all three tasks done. Security, JSDoc, logger, and
locale rules do not apply.

### Critical and High

None.

### Medium

- M-1. Spec E-6 lists 7 tests. The full search found 2 more lines that need the 50-line limit:
  `apps/science-advantage/lib/__tests__/audit-phase2-static-analysis.test.ts` (section 13.3) and the
  limit test 13 of `apps/science-advantage/lib/ci-gates/phase-14-closeout.test.ts`. The plan lists
  both. Phase 3 must keep `lessons-learned.md` at 50 lines or less (`wc -l`).
- M-2. Many closeout tests stay red after this track. They check `measure/tech-debt.md` (106 lines;
  the cap is 50) and rows that no longer exist (`auth_strategy_review`, F-902 to F-906, and others).
  Affected: `packages/ai` (2 tests), `packages/auth` (1), `packages/webhooks` (3),
  `apps/science-advantage` phase-14 (9), `housekeeping-phase12-closeout` (3 incl. section 1),
  `audit-phase2-static-analysis` (13.2). Also `audit-phase2` 11.6 fails on the age of `graph.db`.
  These are not in this track. The orchestrator can decide on a tech-debt condense track.

### Low

- L-1. The ai test counts lines with `split("\n")` (57 lines of text give 58). It allows 51. The
  other tests count with `wc -l` and allow 50. Keep the file at 50 lines or less with `wc -l`.
- L-2. The default vitest config of `apps/science-advantage` needs a test database (global setup runs
  Drizzle migrate). The plan uses `vitest.unit.config.ts` and `vitest.verification.config.ts` instead.
- L-3. The record check 1 depends on the wording. A row with "removed" and no owner decision with a
  date fails the check. Phase 3 must word the STU-23 column as "dropped by plan".

### Lessons and shortcuts

- Lesson: the E-6 list of the spec came from a partial search. A search for the file name finds the
  tests that a text search for the tag misses. For the orchestrator to add to the shared
  lessons file, if it has room.
- Shortcut: none.

## Phase 3: Implement — edit the records

Review of the phase diff (`169928b98..HEAD`). Documentation only. No code, schema, hash, or secret.

### Critical and High

None.

### Medium

- M-3. `measure/lessons-learned.md` lost 10 lines: 7 old entries (SSO helpers, narrow imports, enum
  values in a transaction, Drizzle mock thenables, codecamp review notes, Prisma to Drizzle gotchas,
  domain dist and argon2 notes) and 3 blank lines. The 7 entries that the tests need stay as they were.
  The orchestrator can restore an entry from git history (`169928b98`) if it wants one back.
- M-4. The mark "same, to be removed" (admin article creation, system test) says "removed" with the
  words "by owner follow-up of 2026-10-11", so record check 1 passes.

### Low

- L-4. The rows for `/student/read` and `/student/lesson` give the three or four row IDs in one cell.
  The side-by-side kit can split them.
- L-5. The system dashboard row was split into three rows (dashboard, schools and licenses, test).
  The row for `/system/ai-config` and `/system/contact-messages` keep their own lines.

### Lessons and shortcuts

- Lesson: the record check for "removed" is case-sensitive. Write "owner decision" or "owner follow-up"
  in lower case after a connecting word, for example "By owner decision".
- Shortcut: none.

## Phase 4: Generate Docs & Doctor

No code change. Generate script changed the revision lines of `measure/generated/*` only.

### Critical and High

None.

### Medium

- M-5. `bash measure/doctor.sh` fails on A13 (stale archived directory
  `agents_md_audit_science_advantage_20260603`). This track did not cause it. Not fixed.
- M-6. The lessons-learned tests pass on the limit and the tags. The tests named in M-2 stay red on
  `tech-debt.md` (106 lines) and `graph.db` age. Not in this track.

