# Line Review: sa-batch-26

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-26 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns
- **File types**: validation schemas (7), validation tests (2), ZIP utility (1), Measure archive documents (10)

---

## Files Reviewed

1.  `apps/science-advantage/lib/validations/class.test.ts`
2.  `apps/science-advantage/lib/validations/class.ts`
3.  `apps/science-advantage/lib/validations/params.ts`
4.  `apps/science-advantage/lib/validations/quiz.ts`
5.  `apps/science-advantage/lib/validations/roster.ts`
6.  `apps/science-advantage/lib/validations/student-classes.test.ts`
7.  `apps/science-advantage/lib/validations/student-classes.ts`
8.  `apps/science-advantage/lib/zip/minimal-zip.ts`
9.  `apps/science-advantage/measure/archive/content_pipeline_mastery_20260428/index.md`
10. `apps/science-advantage/measure/archive/content_pipeline_mastery_20260428/metadata.json`
11. `apps/science-advantage/measure/archive/content_pipeline_mastery_20260428/plan.md`
12. `apps/science-advantage/measure/archive/content_pipeline_mastery_20260428/spec.md`
13. `apps/science-advantage/measure/archive/critical_security_20260206/metadata.json`
14. `apps/science-advantage/measure/archive/critical_security_20260206/plan.md`
15. `apps/science-advantage/measure/archive/critical_security_20260206/spec.md`
16. `apps/science-advantage/measure/archive/platform_alignment_20260311/index.md`
17. `apps/science-advantage/measure/archive/platform_alignment_20260311/metadata.json`
18. `apps/science-advantage/measure/archive/platform_alignment_20260311/plan.md`
19. `apps/science-advantage/measure/archive/platform_alignment_20260311/spec.md`
20. `apps/science-advantage/measure/archive/quiz_system_20260114/metadata.json`

---

## File-by-File Findings

### File 1: `lib/validations/class.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — tests exercise min/max length, enum, missing-fields, partial-update, and join-code transformation |
| **Security/tenancy** | N/A — validation-only tests |
| **AGENTS.md compliance** | OK. Vitest, `.test.ts` suffix adjacent to source, colocated with module under test |
| **Test quality** | Good — 9 tests across 3 describe blocks covering create, update, and join schemas |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 10–56 | Uses generic `.toThrow()` rather than `.toThrowError(/specific message/)` — error message assertions are absent. Not critical since validation logic lives in the shared `@reading-advantage/types` package, but scoped assertion would catch accidental schema changes. | low | F-SA-B26-001 |
| 52–56 | "rejects when required fields are missing" tests only missing `standardsAlignment`; does not test missing `name` or `gradeLevel` in isolation. Incomplete coverage of the "required" contract. | low | F-SA-B26-002 |
| 73–75 | `joinCode` transformation (trim + uppercase) is well-tested with a single example. | OK | — |
| All | Clean setup — no `beforeEach`/`afterEach` needed since Zod schemas are pure functions. | OK | — |

---

### File 2: `lib/validations/class.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — delegates to canonical `@reading-advantage/types/contracts/class` |
| **Security/tenancy** | OK — `schoolId` is intentionally absent from all input schemas (derived server-side from auth context), which matches AGENTS.md: "Never trust tenant IDs from the frontend" |
| **AGENTS.md compliance** | Golden path — shared contracts in `packages/types`, thin re-export in app |
| **Architecture** | Clean barrel re-export with explicit named exports |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 14–24 | Explicit re-export of all schemas, types, and constants from the shared package. | OK | — |
| All | Zero logic — pure re-export bridge. The consuming route handler must inject `schoolId` and `teacherId` at write time, which this schema does not constrain. That responsibility belongs to the handler, not the schema. | OK | — |

---

### File 3: `lib/validations/params.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Moderate concern — `lessonSlugParamSchema` validation is weaker than the existing `LessonSlugSchema` |
| **Security/tenancy** | OK — path params don't carry tenant context |
| **AGENTS.md compliance** | OK — Zod at every external boundary |
| **Architecture** | Good composability — individual schemas for each route combination; could benefit from stricter slug regex |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 8–10 | `lessonSlugParamSchema` validates only `z.string().min(1)`. Meanwhile `lib/schemas/lesson-slug.schema.ts` provides `LessonSlugSchema` with a kebab-case regex (`/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/`). The params schema should reuse or reference the stricter slug validator for defense-in-depth against path traversal values. | medium | F-SA-B26-003 |
| 12–18 | UUID validation (`z.string().uuid(...)` with descriptive error messages) on `studentId`, `classId`, `lessonId` — correctly applied. | OK | — |
| 24–36 | Composite param schemas (`studentIdClassIdParamSchema`, `classIdLessonIdParamSchema`, `studentIdLessonIdParamSchema`) correctly combine individual UUID validators. | OK | — |
| All | Missing `schoolIdParamSchema` — not needed if tenant is always derived from auth context. No finding. | OK | — |

---

### File 4: `lib/validations/quiz.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Moderate concern — `studentAnswer: z.unknown()` bypasses all type validation |
| **Security/tenancy** | Low concern — no tenant ID exposure, but answer content types are unchecked |
| **AGENTS.md compliance** | OK — Zod at boundary |
| **Architecture** | Well-structured but the `z.unknown()` on `studentAnswer` is a gap |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 13 | `studentAnswer: z.unknown()` accepts **any** JSON value — strings, numbers, objects, arrays, null. For quiz questions with known types (multiple-choice → string, true/false → boolean, numeric → number), this bypasses type safety and allows malformed answers to be accepted at the API boundary. At minimum, it should be constrained to the union of valid question-answer types or validated downstream by the quiz-scoring logic before insertion. | medium | F-SA-B26-004 |
| 14 | `timeSpentSeconds: z.number().nonnegative().optional()` — correct numeric constraint. | OK | — |
| 15 | `answeredAt: z.string().datetime({ offset: true }).optional()` — proper ISO 8601 datetime validation. | OK | — |
| 19 | `.min(1, 'At least one response is required')` — prevents empty submission array. | OK | — |
| All | No test file exists for `quiz.ts`. AGENTS.md requires tests for all new backend code. | medium | F-SA-B26-005 |

---

### File 5: `lib/validations/roster.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good |
| **Security/tenancy** | OK — single-field UUID validation; no tenant exposure |
| **AGENTS.md compliance** | OK — Zod at boundary |
| **Architecture** | Minimal — one schema for DELETE route param validation |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 8–10 | `removeStudentFromRosterSchema` validates only `studentId: z.string().uuid()`. The `classId` comes from route params. No tenant or ownership check is encoded in this schema — that's the handler's responsibility. | OK | — |
| All | **No test file** found for `roster.ts` (`lib/validations/roster.test.ts` does not exist). AGENTS.md requires tests for all new backend code. | medium | F-SA-B26-006 |

---

### File 6: `lib/validations/student-classes.test.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good |
| **Security/tenancy** | N/A — response schema tests |
| **AGENTS.md compliance** | OK |
| **Test quality** | Good — specific `toEqual` assertions (not just `toThrow`), covers all edge cases |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 8–15 | `validClass` fixture uses string `'class-1'` (not a UUID) for `id`. The schema accepts `z.string()` (not `z.string().uuid()`), so this is valid input. The fixture would pass the schema even if the DB stores UUIDs — a minor realism gap. | low | F-SA-B26-007 |
| 17–49 | Seven tests across 6 edge cases: invalid name length, gradeLevel out of range, non-date enrolledAt, empty teacherName, missing fields. Good coverage breadth. | OK | — |
| 47–49 | `const { id: _id, ...withoutId } = validClass` — correct pattern to suppress unused-variable lint. | OK | — |
| 52–69 | `studentEnrolledClassesResponseSchema` tests: valid list, empty list, missing `classes`. Good structural coverage. | OK | — |

---

### File 7: `lib/validations/student-classes.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Minor — `id: z.string()` accepts non-UUID values; response omits `schoolId` (intentional) |
| **Security/tenancy** | OK — `schoolId` not exposed in response, which is defensible |
| **AGENTS.md compliance** | OK — Zod response schemas, typed exports |
| **Architecture** | Good — base schema extended for response-specific fields |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 17 | `id: z.string()` — accepts any string (e.g., `"not-a-uuid"`), while the DB column is `uuid("id").primaryKey().defaultRandom()`. The comment on line 3–14 explains this matches the prior Prisma shape (CUID), but since the migration to Drizzle UUIDs, this is looser than the database. If the API returns a non-UUID, the schema will accept it, but the DB won't contain one. | low | F-SA-B26-008 |
| 20 | `teacherId: z.string()` — intentionally broad; `users.id` is `text` in Drizzle, so `z.string()` is correct. | OK | — |
| 23–34 | `studentEnrolledClassSchema` extends base with `teacherName` and `enrolledAt`. `.datetime()` on `enrolledAt` is a solid constraint. | OK | — |
| 38–40 | `studentEnrolledClassesResponseSchema` wraps the array — clean. | OK | — |
| All | `schoolId` is absent from the response schema. This is defensible — the frontend derives school context from the auth session rather than trusting API responses. If future consumers need it, they must add it. | OK | — |

---

### File 8: `lib/zip/minimal-zip.ts`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — produces valid ZIP archives with correct PK signatures, CRC32, and central directory |
| **Security/tenancy** | N/A — pure utility, no user data boundary |
| **AGENTS.md compliance** | OK — JSDoc present, typed function |
| **Architecture** | Clean — single function, no external dependencies |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 8–10 | ZIP magic-number constants (0x04034b50, 0x02014b50, 0x06054b50) used without inline comments describing their purpose. The module-level JSDoc (lines 1–6) explains the general purpose, but the specific PK signatures are not annotated. Minor readability concern. | info | — |
| 39 | `buildMinimalZip` lacks an explicit return type annotation (`: Uint8Array`). TypeScript infers it correctly from the return statement, but per AGENTS.md "JSDoc for all functions", a `@returns` tag with type would be appropriate. Existing JSDoc mentions "Creates a valid ZIP file" but has no `@param` or `@returns` tags. | low | F-SA-B26-009 |
| 57 | CRC32 computed correctly with `>>> 0` to force unsigned. | OK | — |
| 59–60 | Both compressed and uncompressed sizes set to `file.data.length` — correct for STORE (no compression). | OK | — |
| 112–119 | End of Central Directory record correctly constructed: disk numbers, entry count, central size, central offset. | OK | — |
| All | **No test file** exists (`lib/zip/minimal-zip.test.ts` not found). AGENTS.md requires tests for new code. | low | F-SA-B26-010 |

---

### File 9: `measure/archive/content_pipeline_mastery_20260428/index.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — links to spec, plan, metadata exist |
| **Architecture** | Standard Measure archive index |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 3–5 | Links correctly reference `./spec.md`, `./plan.md`, `./metadata.json`. All files exist. | OK | — |
| 1 | Title: `Track content_pipeline_mastery_20260428 Context` — missing colon after "Track" (e.g., "Track: ..."). Stylistic. | info | — |

---

### File 10: `measure/archive/content_pipeline_mastery_20260428/metadata.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Moderate concern — `status: "new"` is misleading for archived tracks |
| **Architecture** | Structure is consistent with other archive metadata.json files |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 4 | `"status": "new"` — this track is in `measure/archive/`, implying it is complete or superseded. The status `"new"` does not reflect the archived state. Should be `"archived"`, `"completed"`, or contain a `superseded_by` field. | medium | F-SA-B26-011 |
| 9 | `"actual_tasks": null` — the plan.md has 18 estimated tasks with several still unchecked. For an archive record, `actual_tasks` should be populated for auditability. | low | F-SA-B26-012 |
| 10 | `"deviation_notes": ""` — empty string for a track that has 3 unchecked manual verification items and implied scope changes. Deviations should be documented. | low | F-SA-B26-013 |

---

### File 11: `measure/archive/content_pipeline_mastery_20260428/plan.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Moderate concern — unchecked tasks in an archived plan |
| **Architecture** | Well-structured phases with task-level checkboxes |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 20 | `[ ] Task: Measure - Manual Verification 'Mastery Pipeline'` — unchecked. All 3 subtasks are unchecked. Archiving with incomplete manual verification means these acceptance criteria were never validated. | medium | F-SA-B26-014 |
| 42 | `[ ] Task: Measure - Manual Verification 'Grade 4 Seed'` — unchecked. Both subtasks unchecked. | medium | F-SA-B26-015 |
| 66 | `[ ] Task: Measure - Manual Verification 'Content Pipeline'` — unchecked. All 4 subtasks unchecked. | medium | F-SA-B26-016 |
| 5–19, 26–41, 48–65 | All Phase 1, 2, and 3 implementation tasks are checked — the engineering work was done, but manual QA verification was never completed. | OK | — |

---

### File 12: `measure/archive/content_pipeline_mastery_20260428/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Moderate — references Prisma commands that are no longer valid post-Drizzle migration |
| **Architecture** | Well-structured FR/NFR/AC/Out-of-Scope sections |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 37 | `npx prisma db seed --grade=4` — the project has migrated from Prisma to Drizzle. Seed commands now go through `pnpm seed` with Drizzle. This spec is historically accurate (written pre-migration) but is misleading if read as current guidance. | medium | F-SA-B26-017 |
| 53 | Same issue: `npx prisma db seed --grade=4` in acceptance criterion 3. | medium | F-SA-B26-018 |
| 48–57 | Acceptance criteria use numbered list format (`1.`, `2.`, ...) rather than task checkbox format (`- [ ]`). Not a defect (template choice), but inconsistent with later spec documents that use checkboxes for verification tracking. | info | — |
| All | Content is internally consistent with the plan.md — all spec requirements map to plan tasks. | OK | — |

---

### File 13: `measure/archive/critical_security_20260206/metadata.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Minor — missing optional fields present in later metadata files |
| **Architecture** | Standard format |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 4 | `"status": "new"` — same archive status mismatch as File 10 (F-SA-B26-011). | low | F-SA-B26-019 |
| All | Missing `estimated_tasks`, `actual_tasks`, `deviation_notes` fields that are present in later metadata.json files (e.g., `content_pipeline_mastery_20260428`). This metadata.json has a simpler schema. | info | — |

---

### File 14: `measure/archive/critical_security_20260206/plan.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — all tasks checked, commit SHAs for traceability |
| **Architecture** | Well-structured phases with checkpoint commits — excellent pattern |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 3 | Phase checkpoint `[checkpoint: 0c82a64]` — good audit pattern. | OK | — |
| 5–23 | All tasks in Phase 1 (PrismaClient consolidation, session ID separation) are checked. | OK | — |
| 29–42 | Phase 2 (Dev Auth Flag, Input Validation) all checked. | OK | — |
| 48–62 | Phase 3 (Rate Limiting) all checked. | OK | — |
| 67–77 | Phase 4 (Authorization Fix, Security Headers) all checked. | OK | — |
| All | References to Prisma (`npx prisma generate`, `Prisma schema`, `npx prisma migrate`) in lines 22, 23 are historically accurate at time of writing but stale post-Drizzle migration. | info | — |

---

### File 15: `measure/archive/critical_security_20260206/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — well-structured security spec with clear FRs |
| **Architecture** | Strong separation of FR, NFR, AC, and Out-of-Scope sections |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 8–12 | FR-1: "Consolidate PrismaClient singleton" — references Prisma. Post-Drizzle migration, this should be interpreted as "consolidate DB client singleton" (now Drizzle). | info | — |
| 56–64 | Acceptance criteria use `- [ ]` checkbox format (unchecked) — consistent with later convention but all unchecked even for an archived track. | low | F-SA-B26-020 |
| 59 | AC: "NEXT_PUBLIC_DEV_AUTH string appears nowhere in the codebase" — verifiable by grep. | OK | — |
| All | Well-written spec. No contradictions with the plan.md. | OK | — |

---

### File 16: `measure/archive/platform_alignment_20260311/index.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — minimal redirect |
| **Architecture** | Standard |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 3–4 | Links to metadata and spec/plan files correctly. | OK | — |

---

### File 17: `measure/archive/platform_alignment_20260311/metadata.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Minor — status field issue, missing actual_tasks |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 4 | `"status": "new"` — same archive status mismatch. | low | F-SA-B26-021 |
| 9 | `"actual_tasks": null` — plan.md has 10 estimated tasks; actual should be populated. | low | F-SA-B26-022 |

---

### File 18: `measure/archive/platform_alignment_20260311/plan.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Good — all tasks checked |
| **Architecture** | Clean 3-phase plan with all verification tasks completed |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 5–15 | Phase 1 (Auth Contract): all 4 tasks checked, including manual verification. | OK | — |
| 19–28 | Phase 2 (Shared Platform Services): all 5 tasks checked. | OK | — |
| 30–36 | Phase 3 (Documentation): all 2 tasks checked. | OK | — |
| All | No incomplete tasks. Consistent with an archived/completed track. | OK | — |

---

### File 19: `measure/archive/platform_alignment_20260311/spec.md`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Significant architectural concern — FR-1 declares a different auth model than what is currently deployed |
| **Architecture** | Otherwise well-structured |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 14 | "Production authentication must be Google OAuth only." — This is **not** the current auth model. The app uses username/password via `@reading-advantage/auth` with session cookies. This spec describes a Google OAuth-only contract that was never fully realized in the critical_security track (which pre-dates this track by one month). The discrepancy between this declared auth contract and the current implementation represents a significant architectural drift. | high | F-SA-B26-023 |
| 14–18 | FR-1 also mandates "User-facing credential login and demo password surfaces must be removed or isolated from production code paths" — the current app still has credential login as the primary auth flow. | high | F-SA-B26-024 |
| 54–59 | Acceptance criteria all `[x]` (checked) — but AC-1 (`/signin` follows Google OAuth plus dev impersonation contract) is not verifiably true in the current codebase. Checked acceptance criteria should reflect the current state. | high | F-SA-B26-025 |
| 21–24 | FR-2: "Session validation must support secure redirects and stale-session cleanup" — reasonable, implementation-agnostic. | OK | — |
| All | The auth model delta between this spec and the current codebase (username/password vs. Google OAuth) is the most significant finding in this batch. Track documentation should be corrected or a clear deviation note should explain why the OAuth-only contract was abandoned. | high | — |

---

### File 20: `measure/archive/quiz_system_20260114/metadata.json`

| Aspect | Assessment |
|--------|-----------|
| **Correctness** | Minor — metadata only, plan.md and spec.md exist in batch-27 |

| Lines | Finding | Severity | ID |
|-------|---------|----------|-----|
| 4 | `"status": "new"` — same archive status mismatch. | low | F-SA-B26-026 |
| All | This batch only includes `metadata.json` for this track; `plan.md` and `spec.md` are reviewed in sa-batch-27. No content to evaluate independently. | OK | — |

---

## Summary of Findings

| ID | File | Severity | Description |
|----|------|----------|-------------|
| F-SA-B26-001 | 1 (class.test.ts) | low | Generic `.toThrow()` instead of error-message-specific assertions |
| F-SA-B26-002 | 1 (class.test.ts) | low | "missing required fields" test only checks one missing field |
| F-SA-B26-003 | 3 (params.ts) | medium | `lessonSlugParamSchema` uses weak `min(1)` instead of existing strict kebab-case regex from `LessonSlugSchema` |
| F-SA-B26-004 | 4 (quiz.ts) | medium | `studentAnswer: z.unknown()` bypasses type validation for all answer types |
| F-SA-B26-005 | 4 (quiz.ts) | medium | No test file for `quiz.ts` |
| F-SA-B26-006 | 5 (roster.ts) | medium | No test file for `roster.ts` |
| F-SA-B26-007 | 6 (student-classes.test.ts) | low | Test fixture uses non-UUID `id` string ("class-1"), reducing realism |
| F-SA-B26-008 | 7 (student-classes.ts) | low | `id: z.string()` accepts non-UUID values while DB column is `uuid` |
| F-SA-B26-009 | 8 (minimal-zip.ts) | low | Missing JSDoc `@param`/`@returns` and explicit return type annotation |
| F-SA-B26-010 | 8 (minimal-zip.ts) | low | No test file for `minimal-zip.ts` |
| F-SA-B26-011 | 10 (metadata.json) | medium | `status: "new"` in archive — should reflect completed/archived state |
| F-SA-B26-012 | 10 (metadata.json) | low | `actual_tasks` is null for archived track |
| F-SA-B26-013 | 10 (metadata.json) | low | `deviation_notes` is empty despite 3 unfinished manual verification items |
| F-SA-B26-014 | 11 (plan.md) | medium | Phase 1 manual verification ('Mastery Pipeline') unchecked |
| F-SA-B26-015 | 11 (plan.md) | medium | Phase 2 manual verification ('Grade 4 Seed') unchecked |
| F-SA-B26-016 | 11 (plan.md) | medium | Phase 3 manual verification ('Content Pipeline') unchecked |
| F-SA-B26-017 | 12 (spec.md) | medium | References `npx prisma db seed` — stale post-Drizzle migration |
| F-SA-B26-018 | 12 (spec.md) | medium | Same Prisma reference in acceptance criterion |
| F-SA-B26-019 | 13 (metadata.json) | low | `status: "new"` mismatch in archive |
| F-SA-B26-020 | 15 (spec.md) | low | Acceptance criteria remain unchecked despite track being archived |
| F-SA-B26-021 | 17 (metadata.json) | low | `status: "new"` mismatch in archive |
| F-SA-B26-022 | 17 (metadata.json) | low | `actual_tasks` is null |
| F-SA-B26-023 | 19 (spec.md) | **high** | FR-1 declares Google OAuth-only auth, but app uses username/password via `@reading-advantage/auth` |
| F-SA-B26-024 | 19 (spec.md) | **high** | FR-1 mandates removing credential login from production, but it remains the primary auth flow |
| F-SA-B26-025 | 19 (spec.md) | **high** | Acceptance criteria checked `[x]` but not verifiably true (Google OAuth not deployed) |
| F-SA-B26-026 | 20 (metadata.json) | low | `status: "new"` mismatch in archive |

**Severity distribution:** high=3, medium=10, low=11, info=4

**Cross-cutting themes:**

1. **Measure archive integrity** (F-SA-B26-011 through F-SA-B26-026): Six of the ten archive documents have `status: "new"` instead of reflecting their archived/completed state. The `content_pipeline_mastery_20260428` track was archived with 3 incomplete manual-verification tasks. The `platform_alignment_20260311` spec declares a Google OAuth-only auth model that was never implemented, yet acceptance criteria are checked as done.

2. **Validation gaps at API boundaries** (F-SA-B26-003, F-SA-B26-004): `lessonSlugParamSchema` uses a weak `min(1)` check when a strict kebab-case regex schema already exists. `submitQuizAttemptSchema` uses `z.unknown()` for `studentAnswer`, accepting arbitrary JSON with no type constraints. Both weaken the contract layer at the route boundary.

3. **Missing test coverage** (F-SA-B26-005, F-SA-B26-006, F-SA-B26-010): Three production source files (`quiz.ts`, `roster.ts`, `minimal-zip.ts`) lack any test file. The AGENTS.md testing guidelines require `*.test.ts` files adjacent to source.

4. **Contrast with golden paths** (Files 2, 7): The `class.ts` re-export file and `student-classes.ts` response schemas follow the contract-driven pattern well. `schoolId` is correctly excluded from input schemas per AGENTS.md tenancy rules: "Never trust tenant IDs from the frontend."

---

## Limitations

- This review is static analysis only. No runtime execution, type-check, or lint results are incorporated.
- Validation schema correctness is assessed against the shared `@reading-advantage/types` contracts and Drizzle schema definitions, not against actual API handler implementations.
- Test quality assessment is based on test structure, assertions, and edge-case coverage, not on actual pass/fail results.
- Measure archive documents are reviewed for consistency, accuracy, and completeness against the current codebase state — not for the quality of the track implementation itself.
- The `quiz_system_20260114` track is partially reviewed in this batch (metadata.json only); plan.md and spec.md are deferred to sa-batch-27.
- No assessment of overall test coverage percentages — only the quality of existing tests and presence of missing tests.
- "High" severity findings on the `platform_alignment_20260311` spec's Google OAuth declaration reflect a document-reality gap; the auth architecture decision to use username/password may have been deliberate and properly tracked elsewhere. This review flags the discrepancy without presuming the spec was wrong at the time of writing.
