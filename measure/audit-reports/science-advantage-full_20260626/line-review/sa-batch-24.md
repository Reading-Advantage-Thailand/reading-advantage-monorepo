# SA Batch 24 — Line-by-Line Review

**Track:** `science_advantage_review_20260626`  
**Batch:** `sa-batch-24` (20 files)  
**Scope:** Correctness, security/tenancy/auth, AGENTS compliance, test quality, architecture/golden-path patterns  
**Reviewer:** DeepSeek V4 Flash  
**Date:** 2026-06-26  

---

## File 1: `apps/science-advantage/lib/platform/session-cleanup.ts` (84 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 31–61 | F-SA-B24-001 | ⚠️ MEDIUM | Correctness | **No locking or dedup protection.** `run()` can be invoked concurrently (e.g., overlapping timer ticks if a run takes longer than `intervalMs`). Two executions can delete and then both try to delete the same sessions; the second batch will find zero rows (benign) but a slow runtime could silently skip cleanup cycles. Consider adding a mutex/guard flag. |
| 43–46 | F-SA-B24-002 | ℹ️ INFO | Observability | **`findMany` selects `expiresAt` but it is never consumed.** The field is fetched only to satisfy the interface; no logging or decision branching uses it. Minor waste but not a bug. |
| 69 | F-SA-B24-003 | ℹ️ INFO | Correctness | **All errors from `run()` are swallowed silently.** `run().catch(() => {})` drops every error (DB connection failure, constraint violation, etc.). Logging via `console.error` or a structured logger would aid debugging. Intentional by design, but a concern in production. |
| 24–27 | F-SA-B24-004 | ✅ OK | Architecture | **Good adapter pattern.** `SessionStore` interface abstracts the DB, keeping this module pure business logic. Aligns with AGENTS.md provider-neutrality rule. |

---

## File 2: `apps/science-advantage/lib/quiz/scoring.test.ts` (249 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 1–249 | F-SA-B24-005 | ✅ OK | Test quality | **Excellent coverage.** Tests edge cases for all five question types: null/undefined inputs, empty arrays, type mismatches, case sensitivity, whitespace normalization. Covers `calculateTotalScore` and `calculatePercentage` including division-by-zero. No gaps identified. |
| 22–24 | — | ℹ️ INFO | — | `MULTIPLE_CHOICE` case-sensitivity has a test for `'a' !== 'A'`, which is correct. |
| 114–116 | — | ℹ️ INFO | — | Numeric answer `'42'` tested as string. Good — matches how the form sends it. |

---

## File 3: `apps/science-advantage/lib/quiz/scoring.ts` (107 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 43 | F-SA-B24-006 | ⚠️ MEDIUM | Correctness | **`String(studentAnswer || '')` coerces falsy values incorrectly.** If `studentAnswer` is `0` (numeric zero), `0 || ''` evaluates to `''`, changing the answer to empty string. The FILL_IN_BLANK case should use `String(studentAnswer ?? '')` or explicit null/undefined check. |
| 65–66 | F-SA-B24-007 | ⚠️ MEDIUM | Correctness | **Unsafe `as Record<string, unknown>` cast on unknown input.** If `studentAnswer` is an object with prototype-chain keys (e.g., `toString`, `valueOf`), `Object.keys` will not include them, but `studentRecord[key]` access returns the prototype value. Edge case; the test at line 167 catches non-object but not prototype-polluted objects. |
| 21 | F-SA-B24-008 | ✅ OK | Architecture | **Clean `switch` over question types.** Extracted from a route handler for unit-testability, following AGENTS.md guidance. |
| 104–106 | F-SA-B24-009 | ✅ OK | Correctness | **Division-by-zero handled** by early return on line 105. |

---

## File 4: `apps/science-advantage/lib/schemas/__tests__/content-migration.test.ts` (126 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 8–12 | F-SA-B24-010 | ℹ️ INFO | Test fragility | **Hardcoded import path `@/scripts/seed-data/grade-4/lessons/g4-weather-patterns.json`.** Relies on an external JSON file existing at a specific path. If Grade 4 content is restructured or removed, this test breaks. Consider extracting to a fixture or making it a conditional/skip test. |
| 46–68 | F-SA-B24-011 | ℹ️ INFO | Test fragility | **Multiple redundant `import()` calls** for the same JSON file (lines 38, 47, 71). Each import is resolved at test runtime. Minor inefficiency; could be loaded once at the describe-block level. |
| 73 | F-SA-B24-012 | ✅ OK | Correctness | `StandardsAlignment.THAI` enum used correctly, validating the seed data matches the enum value. |
| 106–111 | — | ✅ OK | — | `LessonType` enum coverage validated. Good baseline check. |

---

## File 5: `apps/science-advantage/lib/schemas/__tests__/curriculum-identifiers.integration.test.ts` (195 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 21 | F-SA-B24-013 | ✅ OK | Architecture | Uses `TEST_SCHOOL_ID` constant for tenant scoping. Good. |
| 23–33 | F-SA-B24-014 | ⚠️ MEDIUM | Test quality | **`cleanup()` deletes tables in a fragile order** but does not wrap in a transaction. If a test fails between inserts and cleanup, orphan rows can remain. Should use a transaction or `TRUNCATE ... CASCADE` inside a `beforeEach` with rollback. |
| 44 | — | ✅ OK | — | `.onConflictDoNothing()` used for school insert, avoiding duplicate-key errors. Good practice. |
| 59–67 | F-SA-B24-015 | ℹ️ INFO | Test quality | **Teacher user created without `schoolId`** while the school table is populated. The `users` table may have a nullable `schoolId`, but cross-tenant boundary tests are not exercised. |
| 156–172 | — | ✅ OK | — | Junction-table join correctly tested. |

---

## File 6: `apps/science-advantage/lib/schemas/__tests__/curriculum-identifiers.test.ts` (806 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 3–4 | F-SA-B24-016 | ℹ️ INFO | Test quality | **`fs` and `path` imported but unused until line 591.** These should be scoped closer to use or the test refactored. |
| 226–358 | F-SA-B24-017 | ⚠️ MEDIUM | Test quality | **`await import('@/lib/schemas/lesson-content.schema')` repeated 8+ times** across test cases. Each test triggers a module resolution at runtime. This pattern wastes time and makes test failures harder to debug. Should be hoisted to `beforeAll`. |
| 591–634 | — | ✅ OK | — | Filesystem-based seed-data validation is thorough and covers all Grade 3 units. |
| 700–717 | F-SA-B24-018 | ⚠️ LOW | Correctness | **`vocabWithThai` counts individual terms with `thai` but test name says "bilingual content"**. This is a proxy check — it verifies vocabulary blocks exist and have Thai, but doesn't validate that ALL content types (text, image captions, etc.) have Thai counterparts. Test name slightly over-promises. |
| 787–804 | F-SA-B24-019 | ⚠️ LOW | Correctness | Same pattern as F-SA-B24-018 but for Grade 4. `expect(term).toHaveProperty('thai')` is correct but narrow. |

---

## File 7: `apps/science-advantage/lib/schemas/__tests__/lesson-content.schema.test.ts` (455 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 1–455 | F-SA-B24-020 | ✅ OK | Test quality | **Excellent schema unit tests.** Covers each block type, the discriminated union, version constraints, forward-compatibility stripping, the `validateLessonContent` helper, and the `isValidLessonContent` type guard. No gaps found. |
| 345–350 | — | ✅ OK | — | Forward-compatibility via `.strip()` is explicitly tested. Good future-proofing. |
| 442–453 | — | ✅ OK | — | Type guard assimilation test at TS level. |

---

## File 8: `apps/science-advantage/lib/schemas/lesson-content.schema.ts` (332 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 1–332 | F-SA-B24-021 | ✅ OK | Architecture | **Well-structured schema module.** Clean use of `z.discriminatedUnion`, `.strip()` for forward compat, and type inference. Good JSDoc throughout. Aligns with AGENTS.md "Use Zod for every external boundary." |
| 83–88 | — | ✅ OK | — | `VocabularyTermSchema` correctly requires `thai` (bilingual requirement). |
| 138–139 | — | ✅ OK | — | Alt-text minimum length (10 chars) enforced for accessibility. |
| 238–247 | — | ✅ OK | — | Discriminated union is exhaustive for listed types. |
| 309–311 | — | ✅ OK | — | Clean delegation from helper to schema. |

---

## File 9: `apps/science-advantage/lib/schemas/lesson-slug.schema.ts` (179 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 3–10 | — | ✅ OK | — | `LessonSlugSchema` regex enforces kebab-case starting with a letter. |
| 30–38 | F-SA-B24-022 | ⚠️ LOW | Performance | **`validateLessonSlug` (and its siblings) use try/catch + `parse()` instead of `safeParse()`.** Parsing with exceptions on expected failure (invalid slugs) is slower in JS engines than `safeParse()`. Prefer `.safeParse()` for validation-only functions. |
| 36 | F-SA-B24-023 | ✅ OK | Correctness | Error message concatenation correctly joins all Zod error messages. |
| 63–70 | F-SA-B24-024 | ℹ️ INFO | Consistency | **`isValidLessonSlug` etc. use try/catch/empty-catch** to coerce parse failure to boolean. Consider `safeParse().success` for consistency with the pattern in `lesson-content.schema.ts` (line 328). |
| 100–127 | — | ✅ OK | — | `transliterateThaiToSlug` has reasonable Thai character mapping. |
| 129–151 | — | ✅ OK | — | `generateLessonSlug` validates input, handles Thai and English. |

---

## File 10: `apps/science-advantage/lib/schemas/seed-validation.ts` (175 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 1–175 | F-SA-B24-025 | ✅ OK | Architecture | **Properly uses Zod for seed file validation.** Good separation between structural validation and structured content validation. |
| 51–57 | — | ✅ OK | — | `structuredContent` field in `SeedLessonSchema` validates `version` literal and uses `z.array(z.unknown())` as a stub — deferred to deeper `LessonContentSchema` check later. Correct approach. |
| 91–128 | — | ✅ OK | — | Two-phase validation (file structure first, then content) is well designed. |

---

## File 11: `apps/science-advantage/lib/schemas/validate-json.ts` (260 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 1–260 | F-SA-B24-026 | ❌ HIGH | AGENTS Compliance | **Manual type guards instead of Zod for external boundary validation.** Per AGENTS.md: "Use Zod for every external boundary." Functions `validateStandardsFile`, `validateLessonsFile`, `validateCurriculumUnitsFile`, `validateQuizQuestionsFile` are hand-rolled runtime validators with `Record<string, unknown>` casts. They should be Zod schemas. These predate the Zod migration but represent technical debt. |
| 72–102 | F-SA-B24-027 | ⚠️ MEDIUM | Correctness | **`validateStandardsFile` throws on first error** (via `forEach`) rather than collecting all issues. Zod's `.safeParse()` naturally accumulates all errors. The custom implementation is both less informative and more code. |
| 127–153 | F-SA-B24-028 | ⚠️ MEDIUM | Correctness | Same pattern as F-SA-B24-027 for `validateLessonsFile`. |
| 158–203 | F-SA-B24-029 | ⚠️ MEDIUM | Correctness | Same pattern — first-failure throw for `validateCurriculumUnitsFile`. |
| 205–259 | F-SA-B24-030 | ⚠️ MEDIUM | Correctness | Same pattern for `validateQuizQuestionsFile`. |
| 91, 127, 177, 228 | F-SA-B24-031 | ⚠️ LOW | Correctness | **`forEach` with `throw` inside a callback** works but is atypical; `forEach` does not propagate throws the way `for...of` does. If a linter or runtime optimization ever inlines the callback, behavior is preserved, but `for...of` would be clearer. |

---

## File 12: `apps/science-advantage/lib/security-headers.test.ts` (29 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 7 | F-SA-B24-032 | ⚠️ MEDIUM | Test quality | **`fs.readFileSync(next.config.ts)` as plain text.** The test parses the config source as a raw string and uses `.toContain()` assertions. This produces false positives if, for example, `DENY` appears in a comment or a string value that isn't the actual header value. A more robust test would import the config and check the returned headers object. |
| 9–11 | — | ✅ OK | — | `X-Frame-Options: DENY` presence checked. |
| 14–16 | — | ✅ OK | — | `X-Content-Type-Options: nosniff` present. |
| 19–21 | — | ✅ OK | — | `Referrer-Policy` present. |
| 24–28 | — | ✅ OK | — | `Strict-Transport-Security` with `max-age=31536000` and `includeSubDomains` present. |
| — | F-SA-B24-033 | ⚠️ LOW | Coverage | **No CSP or Permissions-Policy assertions.** Modern security practice recommends testing these. Not a bug, but an omission worth tracking if the app has CSP configured. |

---

## File 13: `apps/science-advantage/lib/services/PATTERN.md` (131 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 1–131 | F-SA-B24-034 | ✅ OK | Architecture | **Well-written architecture guide.** Aligns with AGENTS.md "Route handlers should be thin" and "Business logic belongs in packages/backend" (here adapted to `lib/services/`). |
| 54–57 | — | ✅ OK | — | `listClasses` example correctly passes `user` and `tenant` context. |
| 60–61 | — | ✅ OK | — | `AuthError` import and catch correctly follows `@reading-advantage/auth` API (verified `AuthError` is exported with `.code` property). |
| 89 | — | ✅ OK | — | `assertCan` pattern used correctly. |
| 111–131 | — | ✅ OK | — | Testing pattern with mock of domain function, not DB, is correct. |

---

## File 14: `apps/science-advantage/lib/services/classes/get-class-detail.integration.test.ts` (287 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 17–26 | — | ✅ OK | — | Cleanup function explicitly deletes all related tables. |
| 91–98 | F-SA-B24-035 | ℹ️ INFO | Style | **Trailing comma formatting inconsistency.** Lines 92 and 95 have commas before `schoolId` on separate lines (e.g., `{ classId, studentId: studentAId ,`). This is cosmetic but suggests Prettier did not format this file. |
| 100–189 | — | ✅ OK | — | Good edge case: insert units in reverse order to test ORDER BY, then insert an NGSS unit to prove framework filtering. |
| 196–200 | — | ✅ OK | — | Tests null return for non-existent class. |
| 218–227 | — | ✅ OK | — | Framework filter confirmed: NGSS unit excluded. |
| 255–286 | — | ✅ OK | — | Tests empty (no students, no units) class. |

---

## File 15: `apps/science-advantage/lib/services/classes/get-class-detail.ts` (134 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 50–52 | **F-SA-B24-036** | ❌ **HIGH** | **Security/Auth** | **No authentication or authorization.** Function accepts a `classId` as the sole parameter with no user context, no session check, and no `assertCan()` call. Any caller can fetch any class. Per AGENTS.md: "Every backend function should define: Authentication requirement, Authorization policy." |
| 53–57 | **F-SA-B24-037** | ❌ **HIGH** | **Tenancy** | **No `schoolId` scoping on class query.** `eq(scienceClasses.id, classId)` alone does not scope the query to the caller's school. A user from school A can query a class in school B by guessing its ID. Violates AGENTS.md: "Every query must be scoped by `schoolId`." |
| 63–66 | F-SA-B24-038 | ⚠️ MEDIUM | Tenancy | **Student list also unscoped by school.** Same issue — `scienceClassStudents` is queried only by `classId` without filtering by the caller's `schoolId`. |
| 73–88 | F-SA-B24-039 | ⚠️ MEDIUM | Tenancy | **Units are filtered by classId, framework, and gradeLevel but NOT by schoolId.** The query does not include a `schoolId` filter. Since `classId` is already a FK to the class, this is partially mitigated (the class itself must be in the same school), but a direct unit-ID query path would leak data. |
| 90–119 | F-SA-B24-040 | ⚠️ LOW | Performance | **N+1 query pattern.** For each unit, a separate query fetches its lessons via `Promise.all(units.map(...))`. For a class with 10 units this is 11 DB round-trips. Consider a single query with a join or Dataloader pattern. |
| 125 | F-SA-B24-041 | ⚠️ MEDIUM | Correctness | **`standardsAlignment as StandardsAlignment` type assertion.** The DB column is cast to the enum type without validation. If the DB contains an unexpected value, this silently passes. Prefer Zod runtime validation at this boundary. |
| 44–49 | F-SA-B24-042 | ⚠️ LOW | Architecture | **Missing JSDoc `@param` for `classId`.** Partially violates AGENTS.md: "Every exported function must have a JSDoc comment with @param." A `@param classId - The class UUID to fetch details for` is missing. |

---

## File 16: `apps/science-advantage/lib/services/classes/get-student-classes.integration.test.ts` (237 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 72–76 | — | ✅ OK | — | Empty-array case for unenrolled student tested. |
| 78–83 | — | ✅ OK | — | Non-existent student returns `[]` — good defensive behavior. |
| 102–104 | F-SA-B24-043 | ℹ️ INFO | Style | **Same trailing-comma formatting quirk** as `get-class-detail.integration.test.ts` (lines 102, 139, 179–188). Suggests Prettier was not run on this file. |
| 148–196 | — | ✅ OK | — | Multiple-enrollment ordering test is thorough. |
| 198–236 | — | ✅ OK | — | Cross-student isolation test (Student A cannot see Student B's classes). Good security validation. **Note:** this tests data isolation by `studentId` (which is correct) but does not test cross-tenant isolation (same student ID in different schools). |

---

## File 17: `apps/science-advantage/lib/services/classes/get-student-classes.ts` (51 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 22–24 | **F-SA-B24-044** | ❌ **HIGH** | **Security/Auth** | **No authentication or authorization.** Like F-SA-B24-036, this function takes only a `studentId` with no user context. Any caller can request enrolled classes for any student. |
| 25–41 | **F-SA-B24-045** | ❌ **HIGH** | **Tenancy** | **No `schoolId` scoping.** The query joins `scienceClassStudents` → `scienceClasses` → `users` but never filters by `schoolId`. A user in school A can see enrollments from school B if they know the `studentId`. |
| 48–49 | F-SA-B24-046 | ✅ OK | Correctness | `teacherName: cls.teacherName ?? 'Teacher'` handles null teacher name gracefully. |
| 22–24 | F-SA-B24-047 | ⚠️ LOW | Architecture | **Missing JSDoc `@param` for `studentId`.** Same issue as F-SA-B24-042. |

---

## File 18: `apps/science-advantage/lib/services/index.ts` (11 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 1–11 | F-SA-B24-048 | ✅ OK | Architecture | **Clean barrel export.** Re-exports all public domain functions and types from the services module. No issues. |

---

## File 19: `apps/science-advantage/lib/services/mastery/mastery-worker.integration.test.ts` (325 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 25–44 | — | ✅ OK | — | Cleaning deletes rows in dependency-safe order. |
| 46–64 | — | ✅ OK | — | `seedUsers()` is clean. |
| 177–183 | — | ✅ OK | — | Pre-creates `MasteryRun` row with `PENDING` status. Faithful to production contract. |
| 195–204 | — | ✅ OK | — | Tests missing MasteryRun → FAILED path. |
| 206–254 | — | ✅ OK | — | Tests uncompleted attempt → FAILED path. |
| 256–290 | F-SA-B24-049 | ✅ OK | Test quality | **Good assertion that 100%-correct standard gets higher mastery than 0%-correct.** Validates the mastery algorithm directionally. |
| 309–324 | F-SA-B24-050 | ✅ OK | Test quality | **Defensive test: zero-standards questions silently skipped.** Tests an edge case that is important for production robustness. |

---

## File 20: `apps/science-advantage/lib/services/mastery/mastery-worker.ts` (301 lines)

| Lines | Finding ID | Severity | Category | Finding |
|-------|-----------|----------|----------|---------|
| 45–48 | **F-SA-B24-051** | ❌ **HIGH** | **Security/Auth** | **No authentication or authorization.** `processMasteryRun` accepts `attemptId` and `studentId` with no user context. Any caller can trigger mastery processing for any attempt. The function determines `studentId` from the attempt, but the caller is never verified. |
| 49 | F-SA-B24-052 | ⚠️ MEDIUM | Security | **`studentId` in context is never cross-validated against the attempt.** If a caller passes `studentId` that doesn't match the attempt's real student, line 73 fetches the attempt and ignores the context's `studentId` entirely (the attempt's own `studentId` is used implicitly via the response/standard queries). The field is dead weight and could be misleading. |
| 121 | F-SA-B24-053 | ⚠️ MEDIUM | Code Quality | **`void scienceLessonStandards` idiom.** An unused import is kept to document that lesson-level standards are intentionally not used here. This is fragile — a tree-shaker or linter update might strip it. Prefer a comment-only approach or restructure to avoid the import entirely. |
| 196–203 | — | ✅ OK | — | Correctly computes `referenceTime` as the latest `answeredAt` across responses. |
| 245 | F-SA-B24-054 | ℹ️ INFO | Correctness | **Hardcoded smoothing factor `0.35` / `0.65`.** These are the EMA weights for blending previous mastery (35%) and new score (65%). Not configurable and not documented. Consider extracting to module-level constants with a comment explaining the rationale. |
| 248–249 | F-SA-B24-055 | ℹ️ INFO | Correctness | **Round-trip through `clampMasteryLevel` and back to `Number()`.** The function serializes to a decimal string, `Number()` parses it back, and then `recordStandardMastery` clamps it again internally. This is a no-op for valid values — the double conversion is redundant. Could pass the clamped string directly and let `recordStandardMastery` handle it. |
| 254–261 | — | ✅ OK | — | `recordStandardMastery` called with schoolId from the `masteryRun` row, which is the correct tenant source. |
| 281–299 | — | ✅ OK | — | Error handler correctly rolls the MasteryRun to `FAILED` status with error message. |

---

## Cross-Cutting Findings

| Finding ID | Severity | Category | Description | Affected Files |
|-----------|----------|----------|-------------|---------------|
| F-SA-B24-056 | ❌ HIGH | **Tenancy** | **All lib/services/ functions lack `schoolId` query scoping.** Every query filters only by entity ID, not by tenant. The monorepo's tenant-registry may cover some tables automatically (if classified as FLAT in `packages/domain/src/tenant-registry.ts`), but these service functions use the raw `db` import, not `tenantDb`. | `get-class-detail.ts`, `get-student-classes.ts`, `mastery-worker.ts` |
| F-SA-B24-057 | ❌ HIGH | **Security/Auth** | **All lib/services/ functions lack any user context or authorization.** No authentication requirement, no `assertCan()` call. Per AGENTS.md: "Every backend function should define: Authentication requirement, Authorization policy." | `get-class-detail.ts`, `get-student-classes.ts`, `mastery-worker.ts` |
| F-SA-B24-058 | ⚠️ MEDIUM | AGENTS Compliance | **JSDoc completeness gap.** `get-class-detail.ts` and `get-student-classes.ts` lack `@param` for their ID parameters. Per AGENTS.md: "Every exported function must have a JSDoc comment with @param." | `get-class-detail.ts` (line 51), `get-student-classes.ts` (line 23) |
| F-SA-B24-059 | ⚠️ MEDIUM | AGENTS Compliance | **Manual validators in `validate-json.ts` instead of Zod.** Per AGENTS.md: "Use Zod for every external boundary." These hand-rolled validators predate the Zod migration but should be migrated. | `validate-json.ts` |
| F-SA-B24-060 | ⚠️ LOW | Architecture | **No integration test for auth-aware path.** None of the integration tests exercise the service functions with a user session or authorization context. They test DB correctness but not the security envelope. | `get-class-detail.integration.test.ts`, `get-student-classes.integration.test.ts`, `mastery-worker.integration.test.ts` |

---

## Summary

### By File Count
- **20/20 files reviewed** — full coverage of batch.
- **18 production/utility files** + 1 documentation file + 1 barrel export.

### By Severity
- **❌ HIGH:** 6 findings (F-SA-B24-026, F-SA-B24-036, F-SA-B24-037, F-SA-B24-044, F-SA-B24-045, F-SA-B24-051, plus cross-cutting F-SA-B24-056, F-SA-B24-057)
- **⚠️ MEDIUM:** 16 findings
- **⚠️ LOW:** 9 findings
- **ℹ️ INFO:** 9 findings
- **✅ OK (positive):** 19 observations

### Key Risks
1. **No auth in any service function** (`get-class-detail.ts`, `get-student-classes.ts`, `mastery-worker.ts`) — these are unauthenticated, unauthorized, and unscoped by tenant. They directly contradict AGENTS.md requirements and PATTERN.md guidance.
2. **`validate-json.ts` uses hand-rolled validators instead of Zod** — architectural debt against the AGENTS.md "Zod for every boundary" rule.
3. **Test quality is generally good** for unit and schema tests, but integration tests don't cover auth/tenancy scenarios.
4. **`security-headers.test.ts` uses string-matching on raw source** — fragile and potentially inaccurate.

### Positives
- Schema modules (`lesson-content.schema.ts`, `lesson-slug.schema.ts`, `seed-validation.ts`) are well-structured with proper Zod usage.
- `scoring.ts` + `scoring.test.ts` exemplify the extract-and-test pattern.
- `PATTERN.md` is an excellent architecture reference that the codebase should follow more closely.
- The integration tests for `mastery-worker.ts` cover important failure modes (missing run, uncompleted attempt).

### Limitations
- Report is a static analysis; no runtime or type-checking was performed.
- Some findings (e.g., N+1 in `get-class-detail.ts`) may be acceptable at the current data scale.
- The `tenant-registry.ts` integration was not analyzed; if the DB package auto-injects schoolId, findings F-SA-B24-056 may be partially mitigated for tables classified as FLAT, but the service functions use raw `db`, not `tenantDb`.
- No acceptance/closeout claims are made in this report.
