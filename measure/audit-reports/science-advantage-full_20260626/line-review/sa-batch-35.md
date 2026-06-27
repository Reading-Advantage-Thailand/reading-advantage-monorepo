# SA-Batch-35 Line Review Report

**Track:** `science_advantage_review_20260626`  
**Batch:** `sa-batch-35`  
**Date:** 2026-06-27  
**Reviewer:** AI line-review agent (`ark-code-latest`)  
**Scope:** 20 files — seed data JSON (questions, standards), seed orchestration + module scripts, content/JSON validation utilities, manual test scripts, Sentry configs, and a historical test-analysis report  
**Focus:** correctness, security/tenancy/auth, AGENTS compliance, test quality, architecture baseline/golden-path patterns  
**Policy:** No app code edited. No acceptance or closeout claims are made in this report.

---

## Files Reviewed

| # | File | Lines |
|---|------|-------|
| 1 | `apps/science-advantage/scripts/seed-data/questions/g4-plant-animal-organ-systems-questions.json` | 51 |
| 2 | `apps/science-advantage/scripts/seed-data/questions/g4-simple-machines-questions.json` | 43 |
| 3 | `apps/science-advantage/scripts/seed-data/standards/thai-grade-3.json` | 90 |
| 4 | `apps/science-advantage/scripts/seed-data/standards/thai-grade-4.json` | 86 |
| 5 | `apps/science-advantage/scripts/seed-demo-users.ts` | 93 |
| 6 | `apps/science-advantage/scripts/seed.ts` | 73 |
| 7 | `apps/science-advantage/scripts/seed/seed-activity-data.ts` | 419 |
| 8 | `apps/science-advantage/scripts/seed/seed-curriculum-units.ts` | 164 |
| 9 | `apps/science-advantage/scripts/seed/seed-demo-data.ts` | 241 |
| 10 | `apps/science-advantage/scripts/seed/seed-lessons.ts` | 207 |
| 11 | `apps/science-advantage/scripts/seed/seed-questions.ts` | 228 |
| 12 | `apps/science-advantage/scripts/seed/seed-standards.ts` | 94 |
| 13 | `apps/science-advantage/scripts/seed/update-seed-files.ts` | 38 |
| 14 | `apps/science-advantage/scripts/seed/validate-json.ts` | 165 |
| 15 | `apps/science-advantage/scripts/test-curriculum-endpoint.ts` | 153 |
| 16 | `apps/science-advantage/scripts/test-student-curriculum-ui.md` | 112 |
| 17 | `apps/science-advantage/scripts/validate-content.ts` | 378 |
| 18 | `apps/science-advantage/sentry.client.config.ts` | 7 |
| 19 | `apps/science-advantage/sentry.server.config.ts` | 7 |
| 20 | `apps/science-advantage/test-analysis-report.md` | 193 |

---

## Finding Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 8 |
| LOW | 11 |
| INFO | 4 |
| **Total** | **24** |

Context note: most files in this batch are **seed/demo scripts and content data**, not request-path business logic. Tenant-scoping and adapter rules from AGENTS.md are interpreted accordingly — seed scripts legitimately use the raw `db` client to bootstrap data, but they must still set `schoolId` correctly and avoid leaking demo credentials into shared/production databases. Findings are weighted with that lens.

---

## Findings

### F-SA-B35-001 — Seed scripts run against any `DATABASE_URL` with no environment guard

**Files:** `seed-demo-users.ts` (1–93), `seed/seed-demo-data.ts` (34–241), `seed/seed-activity-data.ts` (43–419)  
**Severity:** HIGH  
**Category:** Security

All three demo-seeding scripts unconditionally connect through `db` (`@reading-advantage/db`, which resolves `DATABASE_URL`) and insert fixed-credential accounts (`Password123!`) for `STUDENT`, `TEACHER`, `ADMIN`, and **`SYSTEM`** roles. There is no check for `NODE_ENV`, no allow-list of safe hostnames, and no confirmation prompt. If `pnpm seed`, `seed:demo-users`, or a direct `tsx` invocation is run with a staging/production `DATABASE_URL` exported in the shell, four well-known credentialed accounts — including a privileged `SYSTEM` admin (`seed-demo-data.ts:70-76`, `seed-demo-users.ts:36-41`) — are created with `onConflictDoNothing`, silently establishing a backdoor. The shared `@reading-advantage/auth` `hashPassword` is used correctly, but the risk is the *destination*, not the hashing.

**Recommendation:** Gate demo-account seeding behind an explicit guard (e.g. refuse to run unless `NODE_ENV !== 'production'` and/or the DB host matches `localhost`/an explicit `SEED_ALLOW=1`). Never seed a `SYSTEM` role account by default.

---

### F-SA-B35-002 — `maxScore` hard-coded to 9 while sampled questions may be fewer

**File:** `seed/seed-activity-data.ts`  
**Lines:** 242 (`maxScore: 9`), 252–254 (`.slice(0, 9)`), 351 (`(score / maxScore) * 100`)  
**Severity:** MEDIUM  
**Category:** Correctness

Each attempt is written with `maxScore: 9`, but the number of scored questions is `sampled = [...lessonQuestions].sort(...).slice(0, 9)` — i.e. `min(lessonQuestions.length, 9)`. If a lesson has fewer than 9 quiz questions (entirely possible — the seeded G4 question files in this very batch contain only 6 questions each), `score` can never reach `maxScore`, so `bestScorePercentage` and `mostRecentScorePercentage` in `scienceLessonCompletions` (lines 351, 373, 377) are systematically understated. Demo dashboards built on these percentages will show artificially low mastery.

**Recommendation:** Set `maxScore = sampled.length` (computed after sampling) rather than a literal `9`.

---

### F-SA-B35-003 — `totalTimeSpentSeconds` always written as 0 despite per-response timing being generated

**File:** `seed/seed-activity-data.ts`  
**Lines:** 295 (`timeSpentSeconds` generated per response), 365 (`totalTimeSpentSeconds: 0`), 398 (update keeps it 0)  
**Severity:** LOW  
**Category:** Correctness / data fidelity

Per-response `timeSpentSeconds` is randomized (line 295), but the aggregated `scienceLessonCompletions.totalTimeSpentSeconds` is hard-set to `0` on both insert (line 365) and conflict-update (line 398). Any demo screen surfacing "time spent" will show zero for every student, undermining the stated purpose of generating *realistic* assessment activity.

**Recommendation:** Accumulate the generated `timeSpentSeconds` into the completion aggregate.

---

### F-SA-B35-004 — Non-deterministic seed data via `Math.random`

**File:** `seed/seed-activity-data.ts`  
**Lines:** 40 (`Math.random()`), 192, 253, 286, 288, 295  
**Severity:** MEDIUM  
**Category:** Test quality / reproducibility

Scores, sampling order, correctness, timestamps, and time-spent are all driven by unseeded `Math.random()`. The app AGENTS.md explicitly calls for *deterministic fixtures*. While this is demo data rather than a test fixture, non-determinism makes the idempotency guard (lines 204–216, which skips regeneration only when attempts already exist) the sole reproducibility mechanism: a fresh DB produces a different dataset each run, so screenshots, golden snapshots, and any test asserting on demo data will be flaky.

**Recommendation:** Use a seeded PRNG (fixed seed) so re-seeding a clean DB yields identical data.

---

### F-SA-B35-005 — Fragile lesson selection by substring title match

**File:** `seed/seed-activity-data.ts`  
**Line:** 198 (`lessons.find((l) => l.title.includes('Diversity'))`)  
**Severity:** LOW  
**Category:** Correctness / brittleness

The "hard lesson" used to depress success rates is located via `title.includes('Diversity')`. This silently breaks if the lesson is renamed/translated, leaving `hardLesson` undefined and the difficulty-modeling code paths (lines 282–284) inert with no warning.

**Recommendation:** Select by stable `slug` or an explicit flag instead of an English-title substring.

---

### F-SA-B35-006 — Demo users seeded without `schoolId` despite a `school_id` column existing

**Files:** `seed-demo-users.ts` (51–61), `seed/seed-demo-data.ts` (83–96), `seed/seed-activity-data.ts` (73–86, 116–128)  
**Severity:** MEDIUM  
**Category:** Tenancy / data integrity

`users.schoolId` exists in the schema (`packages/db/src/schema/users.ts:34`, nullable FK to `schools`). Every other seeded row in this batch correctly stamps `SEED_SCHOOL_ID` (`scienceClasses`, `scienceClassStudents`, `scienceLessons`, mastery, etc.), but the `users` inserts omit `schoolId` entirely, leaving demo users globally unscoped. Multi-tenant queries that join users to `schoolId` (per AGENTS multi-tenancy rule) will not associate these demo users with `Seed School`, producing inconsistent tenant graphs in demo data.

**Recommendation:** Set `schoolId: SEED_SCHOOL_ID` on all demo `users` inserts (the seed school is already upserted before user creation in `seed-demo-data.ts:37`).

---

### F-SA-B35-007 — `seed-demo-users.ts` is a divergent duplicate of `seed-demo-data.ts`

**File:** `scripts/seed-demo-users.ts` (1–93)  
**Severity:** MEDIUM  
**Category:** Maintainability / drift

`seed-demo-users.ts` re-implements the same four demo users as `seed/seed-demo-data.ts`, but without `gradeLevel` (lines 51–61 omit it), without `schoolId`, and without the class/enrollment/mastery wiring. Two sources of truth for the same accounts invite drift: a change to roles/usernames in one will not propagate to the other. It is unclear which is canonical (`pnpm seed:demo-users` vs `pnpm seed`).

**Recommendation:** Make `seed-demo-users.ts` delegate to the shared user-seeding logic in `seed-demo-data.ts`, or delete it if redundant.

---

### F-SA-B35-008 — Errors during question seeding are swallowed and seeding continues

**File:** `seed/seed-questions.ts`  
**Lines:** 138–204 (try/catch around per-question insert), 202–204 (`catch ... console.log(...)` only)  
**Severity:** MEDIUM  
**Category:** Correctness / observability

Each question insert is wrapped in `try/catch` that merely `console.log`s the error and proceeds to the next question. A transaction failure (e.g. a unique-`slug` collision — see F-SA-B35-009) is reported as a warning line, not a failure. The summary then prints a success total that excludes the failed rows, so an operator can see "✅ Total: N questions seeded" while silently missing data. This contrasts with `seed-lessons.ts`/`seed-curriculum-units.ts`, which let transaction errors propagate.

**Recommendation:** Re-throw after logging, or collect failures and exit non-zero so partial seeding is visible.

---

### F-SA-B35-009 — Question idempotency key differs from the unique constraint

**File:** `seed/seed-questions.ts`  
**Lines:** 139–155 (idempotency check on `lessonId + order + text`), 167 (`slug = q.slug || \`${lesson.slug}-q${order}\``), 173 (insert `slug`)  
**Severity:** LOW  
**Category:** Correctness

Idempotency is checked on `(lessonId, order, text)`, but the table enforces uniqueness on `slug` (`science_quiz_questions.slug` unique, `packages/db/src/schema/science.ts:152`). If question text is edited between runs (idempotency check misses) while the derived `slug` (`lesson.slug-qN`) stays the same, the insert hits a unique-slug violation that is then swallowed by F-SA-B35-008. The two keys should be aligned.

**Recommendation:** Use `onConflictDoUpdate` keyed on `slug`, or include `slug` in the idempotency lookup.

---

### F-SA-B35-010 — `seedStandards` upsert does not refresh `gradeLevel`

**File:** `seed/seed-standards.ts`  
**Lines:** 71–76 (`onConflictDoUpdate` set only `description`)  
**Severity:** LOW  
**Category:** Correctness

The conflict target is `(framework, code)`, but the `set` clause updates only `description`. If a standard's `gradeLevel` is corrected in JSON, re-seeding will not update the existing row's `gradeLevel`, leaving stale data. (`schoolId` is also not refreshed, but that is constant here.)

**Recommendation:** Include `gradeLevel` in the update set if it is meant to be mutable.

---

### F-SA-B35-011 — `validate-content.ts` validates a JSON shape that the seed files do not use

**File:** `scripts/validate-content.ts` (43–55 `QuestionBank` shape, 205–251 question checks); contrast with batch files #1/#2  
**Severity:** MEDIUM  
**Category:** Correctness / dead-or-divergent tooling

`validate-content.ts` expects question objects with `id`, `difficulty`, `question`, `options: string[]`, and numeric `correctAnswer` (0–3), and enforces exactly 20 questions with an 8/8/4 difficulty split. The actual seeded question files reviewed here (`g4-*-questions.json`) use a *different* schema: `type`, `text`, `correctAnswer` as a string/array, `points`, `standards`, **no `difficulty`**, and only 6 questions. The validator only scans `scripts/seed-data/grade-{N}/{lessons,questions}` (lines 307, 324, 342), a different directory from `scripts/seed-data/questions`, so the actual seed questions are never validated by it. The result is a validator that asserts a contract no seeded file satisfies — easy to mistake as "content validated" when it is not.

**Recommendation:** Either align the validator with the real seed schema (the one consumed by `seed-questions.ts` + `lib/schemas/seed-validation`) or clearly document that `validate-content.ts` targets a separate grade-4 authoring pipeline.

---

### F-SA-B35-012 — Seeded G4 question banks contain 6 questions, not the documented 20

**Files:** `seed-data/questions/g4-plant-animal-organ-systems-questions.json` (3–50), `seed-data/questions/g4-simple-machines-questions.json` (3–42)  
**Severity:** LOW  
**Category:** Content completeness

Both G4 question files contain exactly 6 questions. `validate-content.ts` (line 29) and `test-analysis`-adjacent expectations describe a 20-question target with a difficulty distribution. Combined with F-SA-B35-002 (`maxScore: 9`), the assessment demo cannot reach full marks for these lessons. Flagging as content gap, not a code defect.

**Recommendation:** Confirm whether 6 is intentional for THAI G4 seed content; if 20 is the product requirement, the banks are incomplete.

---

### F-SA-B35-013 — `test-curriculum-endpoint.ts` always exits 0 even on failure

**File:** `scripts/test-curriculum-endpoint.ts`  
**Lines:** 16–17, 148–151 (catch → `console.error` only, no `process.exit(1)`), 153 (top-level call with no `.catch`)  
**Severity:** LOW  
**Category:** Test quality

This "test" script catches all errors and only logs them; it never sets a non-zero exit code and the top-level `testCurriculumEndpoint()` call has no `.catch`. An unhandled rejection or a logged failure both leave exit status 0, so it cannot gate CI and would mislead an operator scanning exit codes. It is a manual script (per its header comment), so impact is contained, but it should not masquerade as a pass/fail check.

**Recommendation:** Exit non-zero on error and missing data; or rename to clarify it is exploratory output only.

---

### F-SA-B35-014 — `test-curriculum-endpoint.ts` reads tenant data via raw `db` with no tenant scoping

**File:** `scripts/test-curriculum-endpoint.ts`  
**Lines:** 21–87 (selects across `scienceClasses`, `scienceClassStudents`, `scienceCurriculumUnits`, `scienceUnitLessons`)  
**Severity:** LOW  
**Category:** Tenancy (script context)

The script queries tenant tables directly without `schoolId` scoping. Acceptable for a local manual diagnostic, but note it duplicates production endpoint logic (lines 64–140 "simulating the API endpoint logic") outside the backend module — a divergence risk if the real endpoint's query changes. It also sets `titleThai: unit.title` and `titleThai: lesson.title` (lines 128, 133), duplicating English into Thai, matching the known limitation but reinforcing it as accepted behavior.

**Recommendation:** Treat as throwaway; do not let it drift from the canonical curriculum query in `packages/backend`/the route handler.

---

### F-SA-B35-015 — `validate-json.ts` uses `any` and throwing type-predicates

**File:** `scripts/seed/validate-json.ts`  
**Lines:** 46, 75, 129 (`data: any` parameters with `: data is X` return predicates that throw on failure)  
**Severity:** LOW  
**Category:** AGENTS compliance / type safety

The three validators take `data: any` and declare type-predicate return types (`data is StandardsFile`) while actually throwing on invalid input and only ever returning `true`. Per AGENTS, Zod is the standard contract system; these hand-rolled `any`-based validators duplicate validation that `lib/schemas/seed-validation` already performs with Zod in `seed-lessons.ts`/`seed-questions.ts`. The `any` usage also conflicts with the app's TypeScript-strict / lint expectations.

**Recommendation:** Migrate these structural checks to Zod schemas (consistent with the rest of the seed pipeline) or at least replace `any` with `unknown`.

---

### F-SA-B35-016 — Sentry initialized without an enablement guard

**Files:** `sentry.client.config.ts` (3–7), `sentry.server.config.ts` (3–7)  
**Severity:** LOW  
**Category:** Observability / configuration

Both configs call `Sentry.init` unconditionally. If a DSN is present in a local/dev `.env`, events and traces will be emitted from development with `environment: process.env.NODE_ENV`. There is no `enabled` flag, no `release`, and no PII scrubbing / `beforeSend`. For an education app handling student data, the absence of a `beforeSend` scrubber is worth noting (low because the DSN is the gate in practice, and tracesSampleRate is conservative at 0.1/0.05).

**Recommendation:** Add `enabled: !!dsn && process.env.NODE_ENV === 'production'` (or equivalent), set `release`, and add a `beforeSend` to strip PII.

---

### F-SA-B35-017 — `update-seed-files.ts` rewrites source seed JSON in place with no backup/dry-run

**File:** `scripts/seed/update-seed-files.ts`  
**Lines:** 13 (parse), 17–29 (mutate), 32 (`fs.writeFileSync`)  
**Severity:** LOW  
**Category:** Correctness / safety

This one-shot migration script mutates every `lessons/*.json` in place (writing back parsed-then-reserialized JSON), which also normalizes formatting for all files even when only some lessons change. There is no dry-run, no backup, and `parseBilingualTitle` results are trusted without validation. Re-running is mostly idempotent (guarded by `lesson.titleThai !== undefined`, line 18), but a bad parse could silently corrupt titles. It appears to be a completed migration utility; if so it is effectively dead code that still carries write risk.

**Recommendation:** Add a `--dry-run` flag, or archive the script once the migration is complete.

---

### F-SA-B35-018 — `update-seed-files.ts` relies on CommonJS `__dirname` in an ESM-leaning codebase

**File:** `scripts/seed/update-seed-files.ts`  
**Lines:** 5 (`path.join(__dirname, ...)`)  
**Severity:** LOW  
**Category:** Correctness / consistency

Unlike the sibling seed scripts in this batch, which derive `__dirname` via `fileURLToPath(import.meta.url)` (`seed-lessons.ts:23-24`, `seed-questions.ts:26-27`, `seed-standards.ts:14-15`, `seed-curriculum-units.ts:19-20`), this file uses the bare `__dirname` global. Under an ESM `tsx`/Node resolution it will throw `__dirname is not defined`. Inconsistent module assumptions across the same directory.

**Recommendation:** Use the same `fileURLToPath(import.meta.url)` pattern as the neighboring scripts.

---

### F-SA-B35-019 — `seed-activity-data.ts` second teacher/class lack idempotent backfill of relationships

**File:** `seed/seed-activity-data.ts`  
**Lines:** 114–154 (teacher 2 + DEMO4T class via `onConflictDoNothing`)  
**Severity:** LOW  
**Category:** Correctness

Teacher 2 and the DEMO4T class are inserted with `onConflictDoNothing`. On a second run where these already exist, no update occurs (fine), but the "Grade 4" class is created with no students, no curriculum units, and no activity — an inert shell purely for "admin view." If a reviewer expects DEMO4T to be navigable like DEMO3T, it will appear broken/empty. Low because it is explicitly labeled "(Optional) Enhance Admin View."

**Recommendation:** Either fully populate DEMO4T or document that it is intentionally empty.

---

### F-SA-B35-020 — `seed.ts` `--grade` parsed with `parseInt` and no validation

**File:** `scripts/seed.ts`  
**Lines:** 16–18 (`parseInt(...)`), 23 (`if (options.framework || options.gradeLevel)`)  
**Severity:** LOW  
**Category:** Correctness / input handling

`--grade=` is parsed via `parseInt` with no radix and no NaN/range validation; `--grade=abc` yields `NaN`, which is falsy, so the selective-mode banner (line 23) and downstream filters silently treat it as "no grade filter" rather than erroring. `--framework=` is cast `as StandardsAlignment` with no membership check, so an invalid framework simply matches nothing and seeds zero rows quietly.

**Recommendation:** Validate `framework` against the enum and reject non-numeric `grade` with a clear error.

---

### F-SA-B35-021 — `test-analysis-report.md` is stale and references prohibited Prisma artifacts

**File:** `test-analysis-report.md`  
**Lines:** 37 (`prisma/seed.ts`), 47–50 / 66–68 (Prisma error excerpts), 158 (unused imports in seed file)  
**Severity:** INFO  
**Category:** Documentation accuracy

This 2025-10-07 report (issue #33) documents a Prisma-based test failure state and references `prisma/seed.ts`. The app AGENTS.md now mandates that `apps/science-advantage/prisma/` must not exist (regression guard F-205) and Drizzle is the source of truth — confirmed absent on disk. The report is a historical snapshot, but it sits at the app root undated-in-filename and could mislead readers into thinking Prisma is still in play. It also predates the Measure workflow and contains no track reference.

**Recommendation:** Move to a dated `docs/`/archive location or annotate as a historical artifact to avoid confusion with current state.

---

### F-SA-B35-022 — Manual UI test plan documents accepted-but-unaddressed limitations

**File:** `scripts/test-student-curriculum-ui.md`  
**Lines:** 100–104 (Known Limitations: Thai==English, slug==id, progress always false, lessons not clickable)  
**Severity:** INFO  
**Category:** Documentation / scope

The checklist documents that Thai translations mirror English, slugs equal lesson IDs, and progress indicators are hard-coded `false`. These match the placeholder behavior seen in `test-curriculum-endpoint.ts` (F-SA-B35-014). Useful as a manual QA aid, but it is a static markdown checklist (no automation) and lines 101–102 ("schema doesn't have slug field yet") are now outdated — `scienceLessons.slug` and `titleThai`/`descriptionThai` columns exist in the current schema (`packages/db/src/schema/science.ts:106,108,110`).

**Recommendation:** Refresh the "Known Limitations" section to reflect the current schema, which does support slug and Thai fields.

---

### F-SA-B35-023 — Standards JSON cross-references are internally consistent (positive note)

**Files:** `seed-data/standards/thai-grade-4.json`, `seed-data/questions/g4-*.json`  
**Severity:** INFO  
**Category:** Correctness (confirmation)

Verified that the question files' `standards` codes (`Sc1.1-G4`, `Sc4.1-G4`) exist in `thai-grade-4.json` (lines 6, 42), and the framework/code uniqueness target in `seed-standards.ts` (line 72) matches the schema's `science_standards_framework_code_unique` constraint. No orphaned standard references found in this batch's data. `correctAnswer` values are stored as strings/arrays consistent with the `jsonb correct_answer` column.

---

### F-SA-B35-024 — Demo credentials printed to stdout

**Files:** `seed-demo-users.ts` (81–88), `seed/seed-demo-data.ts` (220–230)  
**Severity:** LOW  
**Category:** Security (defense-in-depth)

Both scripts print full username/password pairs to the console. Acceptable for local dev convenience, but combined with F-SA-B35-001 (no environment guard) this means a misdirected run against a shared environment also echoes working credentials into CI/job logs.

**Recommendation:** Suppress credential printing unless an explicit local/dev guard passes.

---

## Cross-Cutting Observations

- **Golden-path adherence:** The four module seed scripts (`seed-standards`, `seed-lessons`, `seed-questions`, `seed-curriculum-units`) consistently stamp `SEED_SCHOOL_ID`, upsert the seed `schools` row first, use transactions for multi-table writes, and resolve cross-references by slug/code — a solid, repeatable pattern. The main deviations are the user-seeding scripts (missing `schoolId`, F-SA-B35-006) and the duplicate `seed-demo-users.ts` (F-SA-B35-007).
- **Tenancy:** Seed scripts correctly use raw `db` (bootstrap context) rather than `TenantDB`, which is appropriate; all reviewed tenant tables have `schoolId` set on insert except `users`.
- **Validation duplication:** Two parallel validation layers exist — hand-rolled `validate-json.ts` (`any`-typed, throwing) and Zod-based `lib/schemas/seed-validation` — invoked together in `seed-lessons.ts`/`seed-questions.ts`. Consolidating on Zod (per AGENTS) would reduce drift.
- **AGENTS compliance:** No provider SDKs are called directly outside the Sentry config files (an infra concern, acceptable). Auth hashing goes through `@reading-advantage/auth`. No business logic was found embedded in React/route layers in this batch (all files are scripts/config/data).

---

## Limitations of This Review

1. **Static review only.** No scripts were executed and no database was provisioned; runtime behaviors (actual conflict resolution, idempotency on re-run, `__dirname` failure in F-SA-B35-018) are inferred from code, not observed.
2. **Schema cross-checks were spot-verified** against `packages/db/src/schema/science.ts` and `users.ts` and `packages/domain/src/tenant-registry.ts`, but not every column/constraint referenced by every insert was exhaustively confirmed.
3. **JSON data files** were validated for structure and cross-reference consistency, not for pedagogical/content correctness of the science material.
4. **Downstream consumers** (the real curriculum route handler, `lib/schemas/seed-validation`, `lib/grade4-normalization`, `lib/bilingual`) were not opened in this batch; findings about divergence (F-SA-B35-011, F-SA-B35-014) are based on the in-batch files and schema only.
5. **No git history / blame** was consulted to determine whether stale artifacts (F-SA-B35-021) or one-shot migrations (F-SA-B35-017) are formally retired.
6. This report makes **no acceptance or closeout claims**; it is a line-review record for the batch only.

---

## Coverage Confirmation

All 20 files listed in `/tmp/opencode/sa-batch-35` were read in full and reviewed. Findings are line-anchored with IDs `F-SA-B35-001` through `F-SA-B35-024`.
